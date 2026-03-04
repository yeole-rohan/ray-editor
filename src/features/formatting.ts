/**
 * Text formatting features: bold, italic, underline, color, etc.
 */
export class FormattingFeature {
  private editorArea: HTMLElement;

  constructor(editorArea: HTMLElement) {
    this.editorArea = editorArea;
  }

  applyTextColor(): void {
    const savedRange = this._saveSelection();
    const input = document.createElement('input');
    input.type = 'color';
    input.value = '#000000';
    Object.assign(input.style, { position: 'absolute', left: '-9999px' });
    document.body.appendChild(input);
    input.onchange = () => {
      this._restoreSelection(savedRange);
      document.execCommand('foreColor', false, input.value);
      input.remove();
    };
    input.click();
  }

  applyBackgroundColor(): void {
    const savedRange = this._saveSelection();
    const input = document.createElement('input');
    input.type = 'color';
    input.value = '#ffffff';
    Object.assign(input.style, { position: 'absolute', left: '-9999px' });
    document.body.appendChild(input);
    input.onchange = () => {
      this._restoreSelection(savedRange);
      document.execCommand('backColor', false, input.value);
      input.remove();
    };
    input.click();
  }

  private _saveSelection(): Range | null {
    const sel = window.getSelection();
    return sel?.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  }

  private _restoreSelection(range: Range | null): void {
    if (!range) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  transformSelectedText(mode: 'upper' | 'lower'): void {
    this.applyTextTransformation(text =>
      mode === 'upper' ? text.toUpperCase() : text.toLowerCase()
    );
  }

  toggleTextCase(): void {
    this.applyTextTransformation(text =>
      [...text]
        .map(c => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
        .join('')
    );
  }

  private applyTextTransformation(transformFn: (text: string) => string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText.trim()) return;

    range.deleteContents();
    range.insertNode(document.createTextNode(transformFn(selectedText)));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
