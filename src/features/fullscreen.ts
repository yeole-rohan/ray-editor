/**
 * Fullscreen mode toggle.
 */
export class FullscreenFeature {
  private wrapper: HTMLElement;
  private isFullscreen = false;

  constructor(wrapper: HTMLElement) {
    this.wrapper = wrapper;
    this.bindKeyboardShortcut();
  }

  toggle(): void {
    this.isFullscreen = !this.isFullscreen;
    this.wrapper.classList.toggle('ray-fullscreen', this.isFullscreen);

    const btn = document.getElementById('ray-btn-fullscreen');
    if (btn) {
      btn.classList.toggle('active', this.isFullscreen);
      btn.title = this.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
      btn.setAttribute('data-tooltip', btn.title);
    }
  }

  private bindKeyboardShortcut(): void {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isFullscreen) {
        this.toggle();
      }
    });
  }

  destroy(): void {
    if (this.isFullscreen) {
      this.wrapper.classList.remove('ray-fullscreen');
    }
  }
}
