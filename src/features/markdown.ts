/**
 * Markdown ↔ Rich Text conversion and Markdown mode toggle.
 *
 * markdownToHtml  — converts a markdown string to editor-compatible HTML
 * htmlToMarkdown  — converts editor HTML back to markdown
 * MarkdownFeature — manages mode toggle and .md file import
 */

// ─── Markdown → HTML ────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function processInline(text: string, codes: string[]): string {
  // Restore protected inline code
  text = text.replace(/\x00IC(\d+)\x00/g, (_, i) =>
    `<code>${escapeHtml(codes[parseInt(i)])}</code>`
  );
  // Images before links (overlapping syntax) — escape alt and src to prevent XSS
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) =>
    `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">`
  );
  // Links — escape href to prevent attribute injection
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
    `<a href="${escapeHtml(url)}">${label}</a>`
  );
  // Bold (** or __)
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic (* or _) — only single markers
  text = text.replace(/\*(?!\*)(.+?)(?<!\*)\*/g, '<em>$1</em>');
  text = text.replace(/_(?!_)(.+?)(?<!_)_/g, '<em>$1</em>');
  // Strikethrough
  text = text.replace(/~~(.+?)~~/g, '<s>$1</s>');
  return text;
}

export function markdownToHtml(markdown: string): string {
  // ── 1. Protect fenced code blocks ─────────────────────────────────────────
  const codeBlocks: Array<{ lang: string; code: string }> = [];
  let text = markdown.replace(/```([^\n]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    codeBlocks.push({ lang: lang.trim() || 'plaintext', code: code.replace(/\n$/, '') });
    return `\x00CB${codeBlocks.length - 1}\x00`;
  });

  // ── 2. Protect inline code ─────────────────────────────────────────────────
  const inlineCodes: string[] = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    inlineCodes.push(code);
    return `\x00IC${inlineCodes.length - 1}\x00`;
  });

  // ── 3. Process line by line ────────────────────────────────────────────────
  const lines = text.split('\n');
  const out: string[] = [];
  let inParagraph = false;
  let i = 0;

  const closePara = () => {
    if (inParagraph) { out.push('</p>'); inParagraph = false; }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code block placeholder
    const cbMatch = line.match(/^\x00CB(\d+)\x00$/);
    if (cbMatch) {
      closePara();
      const { lang, code } = codeBlocks[parseInt(cbMatch[1])];
      // Output bare <pre data-lang> — setContent() rebuilds the full UI
      out.push(`<pre class="ray-code-content" data-lang="${lang}"><code>${escapeHtml(code)}</code></pre>`);
      i++; continue;
    }

    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      closePara();
      const lvl = hMatch[1].length;
      out.push(`<h${lvl}>${processInline(hMatch[2], inlineCodes)}</h${lvl}>`);
      i++; continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      closePara();
      out.push('<hr>');
      i++; continue;
    }

    // Blockquote — consume consecutive > lines
    if (line.startsWith('> ')) {
      closePara();
      const bqLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        bqLines.push(lines[i].slice(2));
        i++;
      }
      out.push(`<blockquote><p>${processInline(bqLines.join(' '), inlineCodes)}</p></blockquote>`);
      continue;
    }

    // Unordered list — consume consecutive - / * / + lines
    if (/^[-*+]\s+/.test(line)) {
      closePara();
      out.push('<ul>');
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        const item = lines[i].replace(/^[-*+]\s+/, '');
        out.push(`<li>${processInline(item, inlineCodes)}</li>`);
        i++;
      }
      out.push('</ul>');
      continue;
    }

    // Ordered list — consume consecutive N. lines
    if (/^\d+\.\s+/.test(line)) {
      closePara();
      out.push('<ol>');
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const item = lines[i].replace(/^\d+\.\s+/, '');
        out.push(`<li>${processInline(item, inlineCodes)}</li>`);
        i++;
      }
      out.push('</ol>');
      continue;
    }

    // Table — lines starting and ending with |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      closePara();
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      // Separate header, separator and body rows
      const parseRow = (l: string) => l.split('|').slice(1, -1).map(c => c.trim());
      const isSeparator = (l: string) => /^\s*\|[\s\-:|]+\|\s*$/.test(l);
      const sepIdx = tableLines.findIndex(isSeparator);
      const headerLine = sepIdx > 0 ? tableLines[sepIdx - 1] : tableLines[0];
      const bodyLines = tableLines.filter((_, idx) => idx !== sepIdx && tableLines[idx] !== headerLine);

      const headerCells = parseRow(headerLine);
      let table = '<table><thead><tr>';
      headerCells.forEach(cell => {
        table += `<th>${processInline(cell, inlineCodes)}</th>`;
      });
      table += '</tr></thead>';
      if (bodyLines.length > 0) {
        table += '<tbody>';
        bodyLines.forEach(rowLine => {
          table += '<tr>';
          parseRow(rowLine).forEach(cell => {
            table += `<td>${processInline(cell, inlineCodes)}</td>`;
          });
          table += '</tr>';
        });
        table += '</tbody>';
      }
      table += '</table>';
      out.push(table);
      continue;
    }

    // Empty line — close current paragraph
    if (line.trim() === '') {
      closePara();
      i++; continue;
    }

    // Regular text → paragraph
    if (!inParagraph) { out.push('<p>'); inParagraph = true; }
    else { out.push('<br>'); }
    out.push(processInline(line, inlineCodes));
    i++;
  }

  closePara();
  return out.join('');
}

// ─── HTML → Markdown ────────────────────────────────────────────────────────

function nodeToMd(node: Node, listDepth = 0): string {
  if (node.nodeType === Node.TEXT_NODE) {
    // Normalize whitespace — collapse newlines and multiple spaces to a single space.
    // This eliminates indentation artifacts from HTML source formatting.
    return (node.textContent ?? '').replace(/\s+/g, ' ');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const inner = (depth = listDepth) =>
    Array.from(el.childNodes).map(n => nodeToMd(n, depth)).join('');

  switch (tag) {
    case 'h1': return `# ${inner().trim()}\n\n`;
    case 'h2': return `## ${inner().trim()}\n\n`;
    case 'h3': return `### ${inner().trim()}\n\n`;
    case 'h4': return `#### ${inner().trim()}\n\n`;
    case 'h5': return `##### ${inner().trim()}\n\n`;
    case 'h6': return `###### ${inner().trim()}\n\n`;

    case 'p': {
      const content = inner().trim();
      // Skip empty paragraphs (just <br>)
      if (!content || content === '\n') return '';
      return `${content}\n\n`;
    }

    case 'br': return '\n';

    case 'strong':
    case 'b': return `**${inner()}**`;

    case 'em':
    case 'i': return `*${inner()}*`;

    case 's':
    case 'del':
    case 'strike': return `~~${inner()}~~`;

    case 'code': {
      // Inside a pre → raw text (the pre handles the fence)
      if (el.closest('pre')) return el.textContent ?? '';
      return `\`${el.textContent}\``;
    }

    case 'pre': {
      const lang = el.getAttribute('data-lang') ?? 'plaintext';
      const code = el.querySelector('code');
      const codeText = (code ? code.textContent : el.textContent) ?? '';
      const fence = lang === 'plaintext' ? '' : lang;
      return `\`\`\`${fence}\n${codeText}\n\`\`\`\n\n`;
    }

    case 'div': {
      // ray-code-block
      if (el.classList.contains('ray-code-block')) {
        const lang = el.getAttribute('data-lang') ?? 'plaintext';
        const pre = el.querySelector('.ray-code-content');
        const code = pre?.querySelector('code');
        const codeText = (code ? code.textContent : pre?.textContent) ?? '';
        const fence = lang === 'plaintext' ? '' : lang;
        return `\`\`\`${fence}\n${codeText}\n\`\`\`\n\n`;
      }
      return inner() + '\n';
    }

    case 'blockquote': {
      const content = inner().trim().split('\n').map(l => `> ${l}`).join('\n');
      return `${content}\n\n`;
    }

    case 'ul': {
      const indent = '  '.repeat(listDepth);
      const items = Array.from(el.children).map(li => {
        const liContent = Array.from(li.childNodes).map(n => nodeToMd(n, listDepth + 1)).join('').trim();
        return `${indent}- ${liContent}`;
      }).join('\n');
      return `${items}\n\n`;
    }

    case 'ol': {
      const indent = '  '.repeat(listDepth);
      const items = Array.from(el.children).map((li, idx) => {
        const liContent = Array.from(li.childNodes).map(n => nodeToMd(n, listDepth + 1)).join('').trim();
        return `${indent}${idx + 1}. ${liContent}`;
      }).join('\n');
      return `${items}\n\n`;
    }

    case 'li': return inner();

    case 'a': {
      const href = el.getAttribute('href') ?? '';
      return `[${inner()}](${href})`;
    }

    case 'img': {
      const src = el.getAttribute('src') ?? '';
      const alt = el.getAttribute('alt') ?? '';
      return `![${alt}](${src})`;
    }

    case 'hr': return `---\n\n`;

    case 'table': {
      // Basic table → markdown table
      const rows = Array.from(el.querySelectorAll('tr'));
      if (rows.length === 0) return '';
      const mdRows = rows.map(tr =>
        '| ' + Array.from(tr.querySelectorAll('td,th')).map(cell =>
          cell.textContent?.trim() ?? ''
        ).join(' | ') + ' |'
      );
      const headerRow = mdRows[0];
      const cols = (headerRow.match(/\|/g)?.length ?? 2) - 1;
      const separator = '| ' + Array(cols).fill('---').join(' | ') + ' |';
      return [headerRow, separator, ...mdRows.slice(1)].join('\n') + '\n\n';
    }

    default: return inner();
  }
}

export function htmlToMarkdown(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  const raw = Array.from(div.childNodes).map(n => nodeToMd(n)).join('');
  // Collapse 3+ consecutive newlines to 2, then trim
  return raw.replace(/\n{3,}/g, '\n\n').trim();
}

// ─── MarkdownFeature class ───────────────────────────────────────────────────

export class MarkdownFeature {
  private editorArea: HTMLElement;
  private wrapper: HTMLElement;
  private toolbar: HTMLElement;
  private textarea: HTMLTextAreaElement | null = null;
  private _isMarkdownMode = false;

  constructor(editorArea: HTMLElement, wrapper: HTMLElement, toolbar: HTMLElement) {
    this.editorArea = editorArea;
    this.wrapper = wrapper;
    this.toolbar = toolbar;
  }

  get isMarkdownMode(): boolean {
    return this._isMarkdownMode;
  }

  /** Convert current editor content to markdown and show textarea. */
  toggle(): void {
    this._isMarkdownMode ? this.switchToRichText() : this.switchToMarkdown();
  }

  /** Return current content as HTML (handles markdown mode). */
  getContentHtml(): string | null {
    if (!this._isMarkdownMode || !this.textarea) return null;
    return markdownToHtml(this.textarea.value);
  }

  /** Open a file picker and import a .md file into the editor. */
  importFile(onImport: (html: string) => void): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,text/markdown,text/x-markdown';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const html = markdownToHtml(text);
        if (this._isMarkdownMode && this.textarea) {
          this.textarea.value = text;
        } else {
          onImport(html);
        }
        this.updateToggleBtn();
      };
      reader.readAsText(file);
    };
    input.click();
  }

  /** Export current editor content as a .md file download. */
  exportFile(html: string): void {
    const md = this._isMarkdownMode && this.textarea
      ? this.textarea.value
      : htmlToMarkdown(html);
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  destroy(): void {
    if (this._isMarkdownMode) this.switchToRichText();
  }

  private switchToMarkdown(): void {
    const md = htmlToMarkdown(this.editorArea.innerHTML);

    const textarea = document.createElement('textarea');
    textarea.className = 'ray-markdown-textarea';
    textarea.value = md;
    textarea.spellcheck = false;

    this.editorArea.style.display = 'none';
    this.wrapper.insertBefore(textarea, this.editorArea.nextSibling);
    this.textarea = textarea;
    this._isMarkdownMode = true;
    this.updateToggleBtn();
    textarea.focus();
  }

  private switchToRichText(): void {
    if (!this.textarea) return;
    const html = markdownToHtml(this.textarea.value);
    this.textarea.remove();
    this.textarea = null;
    this.editorArea.style.display = '';
    this._isMarkdownMode = false;
    this.updateToggleBtn();
    // Return html so the caller can call setContent
    this._pendingHtml = html;
  }

  // Temp holder used by RayEditor after switchToRichText
  _pendingHtml: string | null = null;

  // MD icon: markdown "M↓" symbol — shown when in markdown mode (click to go back to rich text)
  private static readonly ICON_MD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15V9l3 3 3-3v6"/><path d="M17 15l-2-3-2 3"/></svg>`;
  // Rich text icon: "<>" symbol — shown when in rich text mode (click to switch to markdown)
  private static readonly ICON_RT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;

  private updateToggleBtn(): void {
    const btn = this.toolbar.querySelector<HTMLElement>('.ray-btn-markdownToggle');
    if (!btn) return;
    if (this._isMarkdownMode) {
      btn.classList.add('active');
      btn.title = 'Switch to Rich Text';
      btn.setAttribute('data-tooltip', 'Switch to Rich Text');
      btn.innerHTML = MarkdownFeature.ICON_MD;
    } else {
      btn.classList.remove('active');
      btn.title = 'Markdown Mode';
      btn.setAttribute('data-tooltip', 'Markdown Mode');
      btn.innerHTML = MarkdownFeature.ICON_RT;
    }
  }
}
