/**
 * Fullscreen mode toggle.
 */
export class FullscreenFeature {
  private wrapper: HTMLElement;
  private toolbar: HTMLElement;
  private isFullscreen = false;

  constructor(wrapper: HTMLElement, toolbar: HTMLElement) {
    this.wrapper = wrapper;
    this.toolbar = toolbar;
    this.bindKeyboardShortcut();
  }

  private static readonly ICON_ENTER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
  private static readonly ICON_EXIT  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="8 3 3 3 3 8"/><polyline points="21 8 21 3 16 3"/><polyline points="3 16 3 21 8 21"/><polyline points="16 21 21 21 21 16"/></svg>`;

  toggle(): void {
    this.isFullscreen = !this.isFullscreen;
    this.wrapper.classList.toggle('ray-fullscreen', this.isFullscreen);

    const btn = this.toolbar.querySelector<HTMLElement>('.ray-btn-fullscreen');
    if (btn) {
      btn.classList.toggle('active', this.isFullscreen);
      btn.title = this.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
      btn.setAttribute('data-tooltip', btn.title);
      btn.innerHTML = this.isFullscreen ? FullscreenFeature.ICON_EXIT : FullscreenFeature.ICON_ENTER;
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
