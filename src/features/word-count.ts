/**
 * Word count status bar.
 */
export class WordCountFeature {
  private editorArea: HTMLElement;
  private statusBar: HTMLElement;

  constructor(editorArea: HTMLElement) {
    this.editorArea = editorArea;
    this.statusBar = this.createStatusBar();
    this.bindEvents();
    this.update();
  }

  private createStatusBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'ray-word-count-bar';
    this.editorArea.parentNode?.appendChild(bar);
    return bar;
  }

  private bindEvents(): void {
    this.editorArea.addEventListener('input', () => this.update());
    this.editorArea.addEventListener('paste', () => setTimeout(() => this.update(), 0));
  }

  update(): void {
    const { words, chars } = this.getWordCount();
    this.statusBar.textContent = `${words} word${words !== 1 ? 's' : ''} · ${chars} character${chars !== 1 ? 's' : ''}`;
  }

  getWordCount(): { words: number; chars: number } {
    const text = this.editorArea.innerText || '';
    const trimmed = text.trim();

    const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
    const chars = trimmed.length;

    return { words, chars };
  }

  destroy(): void {
    this.statusBar.remove();
  }
}
