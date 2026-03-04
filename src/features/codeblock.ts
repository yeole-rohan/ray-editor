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

    const wrapper = document.createElement('div');
    wrapper.className = 'ray-code-block';
    wrapper.setAttribute('data-lang', 'javascript');

    // ── Header bar ──────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'ray-code-header';
    header.contentEditable = 'false';

    const select = document.createElement('select');
    select.className = 'ray-code-lang-select';
    LANGUAGES.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if (value === 'javascript') opt.selected = true;
      select.appendChild(opt);
    });
    select.onchange = () => {
      wrapper.setAttribute('data-lang', select.value);
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

    // ── Code area ────────────────────────────────────────────────────────────
    const pre = document.createElement('pre');
    pre.className = 'ray-code-content';
    pre.setAttribute('contenteditable', 'true');
    pre.setAttribute('spellcheck', 'false');

    const code = document.createElement('code');
    code.innerHTML = '<br>';

    pre.appendChild(code);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);

    range.deleteContents();
    range.insertNode(wrapper);

    // Place cursor inside code
    setTimeout(() => {
      const newRange = document.createRange();
      newRange.selectNodeContents(code);
      newRange.collapse(true);

      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(newRange);
    }, 0);
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
