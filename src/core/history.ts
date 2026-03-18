/**
 * Custom undo/redo stack with configurable depth.
 * Provides better reliability than browser's built-in undo.
 */
export class HistoryManager {
  private stack: string[] = [];
  private index: number = -1;
  private maxSize: number;
  private editorArea: HTMLElement;

  /**
   * Called after every undo/redo restore so the host can re-wire interactive
   * structures (table resize handles, code block selects, task checkboxes, etc.)
   * that are lost when innerHTML is replaced.
   */
  onRestore?: () => void;

  constructor(editorArea: HTMLElement, maxSize = 100) {
    this.editorArea = editorArea;
    this.maxSize = maxSize;
  }

  /** Record current state */
  push(html: string): void {
    // Discard any redo history
    this.stack = this.stack.slice(0, this.index + 1);

    // Avoid duplicates (handles undo/redo restorations that fire input events)
    if (this.stack[this.index] === html) return;

    this.stack.push(html);
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    } else {
      this.index++;
    }
  }

  undo(): void {
    if (this.index <= 0) return;
    this.index--;
    this.editorArea.innerHTML = this.stack[this.index];
    this.onRestore?.();
    this.moveCursorToEnd();
  }

  redo(): void {
    if (this.index >= this.stack.length - 1) return;
    this.index++;
    this.editorArea.innerHTML = this.stack[this.index];
    this.onRestore?.();
    this.moveCursorToEnd();
  }

  canUndo(): boolean {
    return this.index > 0;
  }

  canRedo(): boolean {
    return this.index < this.stack.length - 1;
  }

  private moveCursorToEnd(): void {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(this.editorArea);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}
