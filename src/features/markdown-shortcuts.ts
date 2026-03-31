/**
 * Markdown auto-formatting shortcuts.
 * ## Space → H2, **text** → bold, etc.
 */
export class MarkdownShortcutsFeature {
  private editorArea: HTMLElement;

  constructor(editorArea: HTMLElement) {
    this.editorArea = editorArea;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.editorArea.addEventListener('keydown', e => {
      if (e.key === ' ') {
        this.handleSpaceTrigger(e);
      } else if (e.key === 'Enter') {
        this.handleEnterTrigger(e);
      }
    });

    this.editorArea.addEventListener('input', () => {
      this.handleInlinePatterns();
    });
  }

  /** Handle heading shortcuts: "## " → H2 */
  private handleSpaceTrigger(e: KeyboardEvent): void {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = node.textContent || '';
    const offset = range.startOffset;
    const textBefore = text.slice(0, offset);

    // Heading: # through ######
    const headingMatch = textBefore.match(/^(#{1,6})$/);
    if (headingMatch) {
      e.preventDefault();
      const level = headingMatch[1].length;

      // Replace the current block with a heading element directly
      // (execCommand('formatBlock') is unreliable in headless Chrome)
      const block = (node as Text).parentElement?.closest(
        'p, h1, h2, h3, h4, h5, h6, div'
      );
      if (!block) return;

      const heading = document.createElement(`h${level}`);
      // Copy all children except the # text node
      Array.from(block.childNodes).forEach(child => {
        if (child === node) {
          // Replace the # text with an empty text node
          heading.appendChild(document.createTextNode(''));
        } else {
          heading.appendChild(child.cloneNode(true));
        }
      });
      block.replaceWith(heading);

      // Move cursor to start of new heading
      const textTarget = heading.firstChild ?? heading;
      const newRange = document.createRange();
      newRange.setStart(textTarget, 0);
      newRange.collapse(true);
      const newSel = window.getSelection();
      newSel?.removeAllRanges();
      newSel?.addRange(newRange);
      return;
    }

    // Blockquote: "> "
    if (textBefore === '>') {
      e.preventDefault();
      const block = (node as Text).parentElement?.closest(
        'p, h1, h2, h3, h4, h5, h6, div'
      );
      if (!block) return;
      const bq = document.createElement('blockquote');
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      bq.appendChild(p);
      block.replaceWith(bq);
      const newRange = document.createRange();
      newRange.setStart(p, 0);
      newRange.collapse(true);
      const newSel = window.getSelection();
      newSel?.removeAllRanges();
      newSel?.addRange(newRange);
      return;
    }

    // Unordered list: "- "
    if (textBefore === '-') {
      e.preventDefault();
      const block = range.commonAncestorContainer.parentElement?.closest(
        'p, h1, h2, h3, h4, h5, h6, div'
      );
      if (block) {
        const textNode = range.startContainer as Text;
        textNode.textContent = '';
        document.execCommand('insertUnorderedList');
      }
      return;
    }

    // Ordered list: "1. "
    if (textBefore === '1.') {
      e.preventDefault();
      const block = range.commonAncestorContainer.parentElement?.closest(
        'p, h1, h2, h3, h4, h5, h6, div'
      );
      if (block) {
        const textNode = range.startContainer as Text;
        textNode.textContent = '';
        document.execCommand('insertOrderedList');
      }
      return;
    }
  }

  /** Handle "---" Enter → horizontal rule */
  private handleEnterTrigger(e: KeyboardEvent): void {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = (node.textContent || '').trim();

    if (text === '---' || text === '***' || text === '___') {
      e.preventDefault();

      // Clear the text
      node.textContent = '';

      // Insert <hr>
      const hr = document.createElement('hr');
      hr.setAttribute('contenteditable', 'false');
      hr.className = 'ray-editor-hr';
      hr.style.border = '1px solid #ccc';
      hr.style.margin = '1em 0';

      const para = document.createElement('p');
      para.innerHTML = '<br>';

      const block = range.commonAncestorContainer.parentElement?.closest(
        'p, h1, h2, h3, h4, h5, h6, div'
      );
      if (block) {
        block.after(hr);
        hr.after(para);
        block.remove();
      }

      const newRange = document.createRange();
      newRange.setStart(para, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }

  /** Handle inline patterns: **bold**, *italic*, `code` */
  private handleInlinePatterns(): void {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = node.textContent || '';
    const offset = range.startOffset;

    // **bold** — detect when closing ** is typed
    const boldMatch = text.slice(0, offset).match(/\*\*(.+?)\*\*$/);
    if (boldMatch) {
      this.replaceTextWithElement(
        node as Text,
        text.lastIndexOf('**', offset - 2),
        offset,
        'strong',
        boldMatch[1]
      );
      return;
    }

    // *italic* — single asterisk (not double)
    const italicMatch = text.slice(0, offset).match(/(?<!\*)\*([^*]+?)\*$/);
    if (italicMatch) {
      const start = text.lastIndexOf('*', offset - 2);
      this.replaceTextWithElement(node as Text, start, offset, 'em', italicMatch[1]);
      return;
    }

    // `code`
    const codeMatch = text.slice(0, offset).match(/`([^`]+?)`$/);
    if (codeMatch) {
      const start = text.lastIndexOf('`', offset - 2);
      this.replaceTextWithElement(node as Text, start, offset, 'code', codeMatch[1]);
      return;
    }
  }

  private replaceTextWithElement(
    textNode: Text,
    start: number,
    end: number,
    tag: string,
    content: string
  ): void {
    const before = textNode.textContent!.slice(0, start);
    const after = textNode.textContent!.slice(end);

    const el = document.createElement(tag);
    el.textContent = content;

    const parent = textNode.parentNode!;
    const beforeText = document.createTextNode(before);
    const afterText = document.createTextNode(after + '\u00A0');

    parent.insertBefore(beforeText, textNode);
    parent.insertBefore(el, textNode);
    parent.insertBefore(afterText, textNode);
    parent.removeChild(textNode);

    // Move cursor after the element
    const range = document.createRange();
    range.setStart(afterText, 1);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}
