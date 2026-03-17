import { SelectionManager } from '../core/selection';
import { sanitizeUrl } from '../core/sanitize';

/**
 * Link modal, edit popup, remove link.
 */
export class LinkFeature {
  private editorArea: HTMLElement;
  private selectionManager: SelectionManager;

  constructor(editorArea: HTMLElement, selectionManager: SelectionManager) {
    this.editorArea = editorArea;
    this.selectionManager = selectionManager;
  }

  openLinkModal(anchor: HTMLAnchorElement | null = null): void {
    const savedRange = this.selectionManager.save();

    const modal = document.createElement('div');
    modal.className = 'ray-editor-link-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', anchor ? 'Edit Link' : 'Insert Link');
    modal.innerHTML = `
      <div class="modal-content">
        <h3 style="margin:0 0 12px;font-size:16px;">${anchor ? 'Edit Link' : 'Insert Link'}</h3>
        <label for="ray-link-url">URL</label>
        <input type="text" id="ray-link-url" placeholder="https://" aria-label="URL" />
        <p id="ray-link-url-error" style="color:red;font-size:12px;display:none;margin:-6px 0 6px;">Please enter a valid URL.</p>
        <label>Target</label>
        <select id="ray-link-target">
          <option value="_self">Same Tab</option>
          <option value="_blank">New Tab</option>
        </select>
        <label>Rel</label>
        <select id="ray-link-rel">
          <option value="">Follow</option>
          <option value="nofollow">No Follow</option>
        </select>
        <div class="modal-actions" style="margin-top:12px;">
          <button id="ray-insert-link">${anchor ? 'Update Link' : 'Insert Link'}</button>
          <button id="ray-cancel-link">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const urlInput = modal.querySelector<HTMLInputElement>('#ray-link-url')!;
    const targetSelect = modal.querySelector<HTMLSelectElement>('#ray-link-target')!;
    const relSelect = modal.querySelector<HTMLSelectElement>('#ray-link-rel')!;
    const urlError = modal.querySelector<HTMLElement>('#ray-link-url-error')!;

    if (anchor) {
      urlInput.value = anchor.getAttribute('href') || '';
      targetSelect.value = anchor.getAttribute('target') || '_self';
      relSelect.value = anchor.getAttribute('rel') || '';
    }

    urlInput.focus();

    // Focus trap + Escape — listener is on the modal element itself so it is
    // automatically removed when the modal leaves the DOM (no document leak).
    modal.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); modal.remove(); return; }
      if (e.key !== 'Tab') return;
      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>('input, select, button')
      ).filter(el => !el.hasAttribute('disabled'));
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    modal.querySelector('#ray-insert-link')!.addEventListener('click', () => {
      const url = urlInput.value.trim();

      if (!url) {
        urlError.textContent = 'Please enter a URL.';
        urlError.style.display = 'block';
        return;
      }

      this.selectionManager.restore(savedRange);

      const safeUrl = sanitizeUrl(url);
      if (!safeUrl) {
        urlError.textContent = 'URL scheme not allowed (javascript: / vbscript: / data: are blocked).';
        urlError.style.display = 'block';
        return;
      }

      if (anchor) {
        // codeql[js/xss-through-dom] -- safeUrl has passed through sanitizeUrl(), blocking javascript:, vbscript:, and data: schemes.
        anchor.setAttribute('href', safeUrl);
        anchor.setAttribute('target', targetSelect.value);
        if (relSelect.value) {
          anchor.setAttribute('rel', relSelect.value);
        } else {
          anchor.removeAttribute('rel');
        }
      } else {
        try {
          this.applyLinkToSelection({
            href: safeUrl,
            target: targetSelect.value,
            rel: relSelect.value,
          });
        } catch (err) {
          urlError.textContent = 'Invalid selection. Select clean inline text.';
          urlError.style.display = 'block';
          return;
        }
      }

      modal.remove();
    });

    modal.querySelector('#ray-cancel-link')!.addEventListener('click', () => {
      modal.remove();
    });

    // Close on backdrop click
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.remove();
    });
  }

  private _tooltipEl: HTMLElement | null = null;
  private _tooltipHideTimer: ReturnType<typeof setTimeout> | null = null;
  private _tooltipAC: AbortController | null = null;

  showLinkTooltip(anchor: HTMLAnchorElement): void {
    if (this._tooltipHideTimer !== null) {
      clearTimeout(this._tooltipHideTimer);
      this._tooltipHideTimer = null;
    }
    // Don't show if already showing for this anchor
    if (this._tooltipEl && this._tooltipEl.dataset.anchor === anchor.href) return;

    this.hideLinkTooltip(0);

    const href = anchor.getAttribute('href') || '';
    const rawDisplay = href.length > 50 ? href.slice(0, 47) + '…' : href;

    const tooltip = document.createElement('div');
    tooltip.className = 'ray-link-tooltip';
    tooltip.dataset.anchor = href;

    // Build tooltip with DOM APIs so URL content is never interpolated as HTML
    const urlSpan = document.createElement('span');
    urlSpan.className = 'ray-link-tooltip-url';
    urlSpan.textContent = rawDisplay;

    const openLink = document.createElement('a');
    openLink.className = 'ray-link-tooltip-open';
    openLink.href = href;          // safe: href attribute set via property, not innerHTML
    openLink.target = '_blank';
    openLink.rel = 'noopener noreferrer';
    openLink.setAttribute('aria-label', 'Open link in new tab');
    openLink.textContent = '↗ Open';

    tooltip.appendChild(urlSpan);
    tooltip.appendChild(openLink);
    document.body.appendChild(tooltip);
    this._tooltipEl = tooltip;

    const rect = anchor.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + window.scrollY + 6}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;

    // AbortController so all hover listeners are cleaned up when tooltip hides
    this._tooltipAC = new AbortController();
    const { signal } = this._tooltipAC;

    const scheduleHide = () => {
      this._tooltipHideTimer = setTimeout(() => this.hideLinkTooltip(0), 2000);
    };
    const cancelHide = () => {
      if (this._tooltipHideTimer !== null) {
        clearTimeout(this._tooltipHideTimer);
        this._tooltipHideTimer = null;
      }
    };

    anchor.addEventListener('mouseleave', scheduleHide, { signal });
    anchor.addEventListener('mouseenter', cancelHide, { signal });
    tooltip.addEventListener('mouseenter', cancelHide, { signal });
    tooltip.addEventListener('mouseleave', scheduleHide, { signal });
  }

  hideLinkTooltip(delay = 500): void {
    if (this._tooltipHideTimer !== null) clearTimeout(this._tooltipHideTimer);
    if (delay === 0) {
      this._tooltipAC?.abort();
      this._tooltipAC = null;
      this._tooltipEl?.remove();
      this._tooltipEl = null;
      this._tooltipHideTimer = null;
    } else {
      this._tooltipHideTimer = setTimeout(() => {
        this._tooltipAC?.abort();
        this._tooltipAC = null;
        this._tooltipEl?.remove();
        this._tooltipEl = null;
        this._tooltipHideTimer = null;
      }, delay);
    }
  }

  showLinkPopup(anchor: HTMLAnchorElement): void {
    document.querySelector('.ray-editor-link-edit-remove')?.remove();
    this.hideLinkTooltip(0);

    const isNewTab = anchor.target === '_blank';

    const popup = document.createElement('div');
    popup.className = 'ray-editor-link-edit-remove';
    document.body.appendChild(popup);

    const editBtn = document.createElement('button');
    editBtn.className = 'ray-edit-link-btn';
    editBtn.setAttribute('aria-label', 'Edit link');
    editBtn.textContent = 'Edit';

    const tabBtn = document.createElement('button');
    tabBtn.className = 'ray-link-newtab-btn' + (isNewTab ? ' active' : '');
    tabBtn.setAttribute('aria-label', isNewTab ? 'Remove new tab' : 'Open in new tab');
    tabBtn.title = 'Toggle new tab';
    tabBtn.textContent = '↗';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'ray-remove-link-btn';
    removeBtn.setAttribute('aria-label', 'Remove link');
    removeBtn.textContent = 'Remove';

    popup.appendChild(editBtn);
    popup.appendChild(tabBtn);
    popup.appendChild(removeBtn);

    const rect = anchor.getBoundingClientRect();
    popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;

    // AbortController for the document click-outside listener — aborted whenever
    // the popup closes (edit, remove, or outside click) so no leak.
    const popupAC = new AbortController();
    const closePopup = () => { popupAC.abort(); popup.remove(); };

    editBtn.addEventListener('click', () => {
      this.openLinkModal(anchor);
      closePopup();
    });

    tabBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const openNewTab = anchor.target !== '_blank';
      anchor.target = openNewTab ? '_blank' : '_self';
      tabBtn.classList.toggle('active', openNewTab);
      tabBtn.setAttribute('aria-label', openNewTab ? 'Remove new tab' : 'Open in new tab');
    });

    removeBtn.addEventListener('click', () => {
      this.removeLink(anchor);
      closePopup();
    });

    document.addEventListener('click', (e: MouseEvent) => {
      if (!popup.contains(e.target as Node) && e.target !== anchor) closePopup();
    }, { signal: popupAC.signal });
  }

  destroy(): void {
    if (this._tooltipHideTimer !== null) clearTimeout(this._tooltipHideTimer);
    this._tooltipHideTimer = null;
    this._tooltipAC?.abort();
    this._tooltipAC = null;
    this._tooltipEl?.remove();
    this._tooltipEl = null;
    document.querySelector('.ray-editor-link-edit-remove')?.remove();
    document.querySelector('.ray-editor-link-modal')?.remove();
  }

  removeLink(anchor: HTMLAnchorElement): void {
    const parent = anchor.parentNode!;
    while (anchor.firstChild) {
      parent.insertBefore(anchor.firstChild, anchor);
    }
    parent.removeChild(anchor);
  }

  private applyLinkToSelection({
    href,
    target,
    rel,
  }: {
    href: string;
    target: string;
    rel: string;
  }): void {
    const selection = window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);

    const startBlock = this.selectionManager.getBlockAncestor(range.startContainer);
    const endBlock = this.selectionManager.getBlockAncestor(range.endContainer);

    if (startBlock !== endBlock) {
      throw new Error('Cross-block selection');
    }

    const safeHref = sanitizeUrl(href);
    if (!safeHref) {
      throw new Error('URL scheme not allowed');
    }

    const anchor = document.createElement('a');
    // codeql[js/xss-through-dom] -- safeHref has passed through sanitizeUrl(), blocking javascript:, vbscript:, and data: schemes.
    anchor.href = safeHref;
    anchor.target = target || '_self';
    if (rel) anchor.rel = rel;
    anchor.className = 'ray-link';

    range.surroundContents(anchor);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
