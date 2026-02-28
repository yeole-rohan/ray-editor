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
    modal.innerHTML = `
      <div class="modal-content">
        <h3 style="margin:0 0 12px;font-size:16px;">${anchor ? 'Edit Link' : 'Insert Link'}</h3>
        <label>URL</label>
        <input type="text" id="ray-link-url" placeholder="https://" />
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

  showLinkPopup(anchor: HTMLAnchorElement): void {
    document.querySelector('.ray-editor-link-edit-remove')?.remove();

    const popup = document.createElement('div');
    popup.className = 'ray-editor-link-edit-remove';
    popup.innerHTML = `
      <button class="ray-edit-link-btn">Edit</button>
      <button class="ray-remove-link-btn">Remove</button>
    `;
    document.body.appendChild(popup);

    const rect = anchor.getBoundingClientRect();
    popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;

    popup.querySelector('.ray-edit-link-btn')!.addEventListener('click', () => {
      this.openLinkModal(anchor);
      popup.remove();
    });

    popup.querySelector('.ray-remove-link-btn')!.addEventListener('click', () => {
      this.removeLink(anchor);
      popup.remove();
    });

    const onDocClick = (e: MouseEvent) => {
      if (!popup.contains(e.target as Node) && e.target !== anchor) {
        popup.remove();
        document.removeEventListener('click', onDocClick);
      }
    };
    document.addEventListener('click', onDocClick);
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
