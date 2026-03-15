const LANGUAGES = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
];

// Language aliases from common paste sources (GitHub, SO, MDN, Prism, Highlight.js)
const LANG_ALIASES: Record<string, string> = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  py: 'python', python3: 'python',
  sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash',
  htm: 'html', xml: 'html', svg: 'html',
  scss: 'css', sass: 'css', less: 'css',
  jsonc: 'json',
};

function detectLang(el: Element): string {
  // data-lang / lang attributes
  const direct = el.getAttribute('data-lang') ?? el.getAttribute('lang') ?? '';
  if (direct) return normalizeLang(direct);

  // class names: language-js, lang-js, brush: js, highlight-source-js
  const cls = el.className ?? '';
  const m = cls.match(/(?:language-|lang-|brush:\s*|highlight-source-)([a-z0-9+#.-]+)/i);
  if (m) return normalizeLang(m[1]);

  // Check first child <code> element too
  const code = el.querySelector('code');
  if (code) return detectLang(code);

  return 'plaintext';
}

function normalizeLang(raw: string): string {
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  return LANG_ALIASES[key] ?? (LANGUAGES.some(l => l.value === key) ? key : 'plaintext');
}

export function buildCodeBlock(lang: string, codeHtml: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'ray-code-block';
  wrapper.setAttribute('data-lang', lang);

  const header = document.createElement('div');
  header.className = 'ray-code-header';
  header.contentEditable = 'false';

  const select = document.createElement('select');
  select.className = 'ray-code-lang-select';
  LANGUAGES.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    if (value === lang) opt.selected = true;
    select.appendChild(opt);
  });
  select.onchange = () => {
    wrapper.setAttribute('data-lang', select.value);
    highlightBlock(code, select.value);
  };

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'ray-code-delete-btn';
  deleteBtn.type = 'button';
  deleteBtn.title = 'Remove code block';
  deleteBtn.textContent = '✕';
  deleteBtn.onmousedown = (e) => {
    e.preventDefault();
    const newPara = document.createElement('p');
    newPara.innerHTML = '<br>';
    wrapper.parentNode?.insertBefore(newPara, wrapper);
    wrapper.remove();
    const r = document.createRange();
    r.selectNodeContents(newPara);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  };

  header.appendChild(select);
  header.appendChild(deleteBtn);

  const pre = document.createElement('pre');
  pre.className = 'ray-code-content';
  pre.setAttribute('contenteditable', 'true');
  pre.setAttribute('spellcheck', 'false');

  const code = document.createElement('code');
  // If codeHtml already has a wrapping <code>, unwrap it
  const tmp = document.createElement('div');
  tmp.innerHTML = codeHtml;
  const innerCode = tmp.querySelector('code');
  code.innerHTML = innerCode ? innerCode.innerHTML : (tmp.innerHTML || '<br>');

  pre.appendChild(code);
  wrapper.appendChild(header);
  wrapper.appendChild(pre);

  // Apply syntax highlighting after a microtask (so the block is in the DOM)
  if (lang !== 'plaintext') {
    requestAnimationFrame(() => highlightBlock(code, lang));
  }

  return wrapper;
}

// ─── Highlight.js lazy loader ─────────────────────────────────────────────

declare global {
  interface Window {
    hljs?: {
      highlight: (code: string, opts: { language: string; ignoreIllegals?: boolean }) => { value: string };
      getLanguage: (lang: string) => unknown;
    };
  }
}

let hljsLoading = false;
let hljsLoaded = false;
const hljsQueue: Array<() => void> = [];

function loadHljs(cb: () => void): void {
  if (hljsLoaded) { cb(); return; }
  hljsQueue.push(cb);
  if (hljsLoading) return;
  hljsLoading = true;

  // CSS theme
  if (!document.querySelector('#ray-hljs-css')) {
    const link = document.createElement('link');
    link.id = 'ray-hljs-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
    document.head.appendChild(link);
  }

  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
  script.onload = () => {
    hljsLoaded = true;
    hljsQueue.splice(0).forEach(fn => fn());
  };
  script.onerror = () => { hljsLoading = false; }; // allow retry
  document.head.appendChild(script);
}

export function highlightBlock(codeEl: HTMLElement, lang: string): void {
  if (lang === 'plaintext' || !lang) return;
  loadHljs(() => {
    if (!window.hljs) return;
    const supported = window.hljs.getLanguage(lang);
    if (!supported) return;
    try {
      const text = codeEl.textContent ?? '';
      const result = window.hljs.highlight(text, { language: lang, ignoreIllegals: true });
      codeEl.innerHTML = result.value;
    } catch { /* ignore */ }
  });
}

/**
 * Code block and inline code features.
 */
export class CodeBlockFeature {
  private editorArea: HTMLElement;

  constructor(editorArea: HTMLElement) {
    this.editorArea = editorArea;
  }

  insertCodeBlock(): void {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    if (!this.editorArea.contains(selection.anchorNode)) return;

    const range = selection.getRangeAt(0);
    const wrapper = buildCodeBlock('javascript', '<br>');
    range.deleteContents();
    range.insertNode(wrapper);

    // Place cursor inside code
    setTimeout(() => {
      const code = wrapper.querySelector('code')!;
      const newRange = document.createRange();
      newRange.selectNodeContents(code);
      newRange.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(newRange);
    }, 0);
  }

  handlePaste(e: ClipboardEvent): boolean {
    const html = e.clipboardData?.getData('text/html') ?? '';
    if (!html) return false;

    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    // Only intercept if there's a <pre> or ray-code-block in the pasted content
    if (!tmp.querySelector('pre, .ray-code-block')) return false;

    // Check selection before swallowing the event
    const sel = window.getSelection();
    if (!sel?.rangeCount || !this.editorArea.contains(sel.anchorNode)) return false;

    e.preventDefault();

    const range = sel.getRangeAt(0);
    range.deleteContents();

    const fragment = document.createDocumentFragment();

    const processNode = (node: Node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        fragment.appendChild(node.cloneNode(true));
        return;
      }
      const el = node as Element;

      // Already a ray-code-block (copied from editor) — rebuild with live handlers
      if (el.classList.contains('ray-code-block')) {
        const lang = el.getAttribute('data-lang') ?? 'plaintext';
        const pre = el.querySelector('.ray-code-content');
        fragment.appendChild(buildCodeBlock(lang, pre?.innerHTML ?? '<br>'));
        return;
      }

      // Raw <pre> from external source (GitHub, SO, MDN, etc.)
      if (el.tagName === 'PRE') {
        fragment.appendChild(buildCodeBlock(detectLang(el), el.innerHTML));
        return;
      }

      // Container elements wrapping code — recurse into children
      if (el.querySelector('pre, .ray-code-block')) {
        el.childNodes.forEach(processNode);
        return;
      }

      // Everything else — keep as-is
      fragment.appendChild(node.cloneNode(true));
    };

    tmp.childNodes.forEach(processNode);
    range.insertNode(fragment);
    sel.collapseToEnd();
    return true;
  }

  insertInlineCode(): void {
    const selection = window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    const parentCode = this.getSelectedElementInTag('code');
    if (parentCode) {
      // Unwrap existing code
      const parent = parentCode.parentNode!;
      while (parentCode.firstChild) {
        parent.insertBefore(parentCode.firstChild, parentCode);
      }
      parent.removeChild(parentCode);
    } else {
      const code = document.createElement('code');
      code.textContent = selectedText;
      range.deleteContents();
      range.insertNode(code);

      const newRange = document.createRange();
      newRange.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  }

  handleCodeBlockExit(e: KeyboardEvent, elementNode: Element): void {
    if (e.key !== 'Enter' || e.shiftKey) return;

    const codeContent = elementNode.closest('.ray-code-content');
    if (!codeContent) return;

    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);

    // Check if current line (before and after cursor) is empty
    const preRange = document.createRange();
    preRange.setStart(codeContent, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    const textBefore = preRange.toString();
    const currentLine = textBefore.slice(textBefore.lastIndexOf('\n') + 1);

    const postRange = document.createRange();
    postRange.setStart(range.startContainer, range.startOffset);
    postRange.setEnd(codeContent, codeContent.childNodes.length);
    const textAfter = postRange.toString();
    const nlIdx = textAfter.indexOf('\n');
    const lineAfterCursor = nlIdx === -1 ? textAfter : textAfter.slice(0, nlIdx);

    if (currentLine === '' && lineAfterCursor === '') {
      e.preventDefault();

      // Remove the trailing empty line from the code block
      if (textBefore.endsWith('\n')) {
        const preRange2 = document.createRange();
        preRange2.setStart(codeContent, 0);
        preRange2.setEnd(range.startContainer, range.startOffset);
        preRange2.deleteContents();
      }

      const newPara = document.createElement('p');
      newPara.innerHTML = '<br>';

      const codeBlock = codeContent.closest('.ray-code-block');
      if (codeBlock) {
        codeBlock.parentNode?.insertBefore(newPara, codeBlock.nextSibling);

        const newRange = document.createRange();
        newRange.selectNodeContents(newPara);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    }
  }

  handleInlineCodeExit(e: KeyboardEvent, sel: Selection, elementNode: Element): void {
    if (e.key !== 'ArrowRight') return;

    const inlineCode = elementNode.closest('code');
    if (!inlineCode || !sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    const atEnd = range.endOffset === inlineCode.textContent!.length;

    if (atEnd) {
      e.preventDefault();
      const spacer = document.createTextNode('\u00A0');
      inlineCode.parentNode!.insertBefore(spacer, inlineCode.nextSibling);

      const newRange = document.createRange();
      newRange.setStartAfter(spacer);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }

  private getSelectedElementInTag(tagName: string): Element | null {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return null;
    let node: Node | null = sel.anchorNode;
    while (node && node !== document) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as Element).tagName.toLowerCase() === tagName.toLowerCase()
      ) {
        return node as Element;
      }
      node = node.parentNode;
    }
    return null;
  }
}
