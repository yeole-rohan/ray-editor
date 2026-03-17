/**
 * Callout / alert box blocks.
 *
 * Four variants: info, warning, success, error.
 *
 * DOM structure (inside editor):
 *   <div class="ray-callout ray-callout-info">
 *     <span class="ray-callout-icon" contenteditable="false">ℹ️</span>
 *     <div class="ray-callout-body"><p>Your note here…</p></div>
 *   </div>
 *
 * getContent() passes this through as-is — clean semantic HTML.
 */

export type CalloutType = 'info' | 'warning' | 'success' | 'error';

const CALLOUT_ICONS: Record<CalloutType, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
  error: '❌',
};

const CALLOUT_LABELS: Record<CalloutType, string> = {
  info: 'Info',
  warning: 'Warning',
  success: 'Success',
  error: 'Error',
};

export class CalloutFeature {
  private editorArea: HTMLElement;
  private activePopup: HTMLElement | null = null;

  constructor(editorArea: HTMLElement) {
    this.editorArea = editorArea;
  }

  /** Show 4-item picker anchored to the toolbar button, then insert chosen callout */
  showPicker(anchorBtn: HTMLElement): void {
    this.closePicker();

    const popup = document.createElement('div');
    popup.className = 'ray-callout-picker';

    (Object.keys(CALLOUT_ICONS) as CalloutType[]).forEach(type => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `ray-callout-picker-btn ray-callout-picker-${type}`;
      btn.innerHTML = `<span>${CALLOUT_ICONS[type]}</span> ${CALLOUT_LABELS[type]}`;
      btn.addEventListener('click', () => {
        this.insertCallout(type);
        this.closePicker();
      });
      popup.appendChild(btn);
    });

    document.body.appendChild(popup);
    this.activePopup = popup;

    // Position below anchor button
    const rect = anchorBtn.getBoundingClientRect();
    popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;

    // Close on outside click
    const onOutside = (e: MouseEvent) => {
      if (!popup.contains(e.target as Node) && e.target !== anchorBtn) {
        this.closePicker();
        document.removeEventListener('click', onOutside, true);
      }
    };
    setTimeout(() => document.addEventListener('click', onOutside, true), 0);
  }

  closePicker(): void {
    this.activePopup?.remove();
    this.activePopup = null;
  }

  insertCallout(type: CalloutType): void {
    const sel = window.getSelection();

    // Capture selected text/HTML before altering the range
    let selectedHtml = '';
    if (sel?.rangeCount && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      const div = document.createElement('div');
      div.appendChild(range.cloneContents());
      selectedHtml = div.innerHTML;
    }

    const callout = document.createElement('div');
    callout.className = `ray-callout ray-callout-${type}`;
    callout.contentEditable = 'false';

    const icon = document.createElement('span');
    icon.className = 'ray-callout-icon';
    icon.contentEditable = 'false';
    icon.textContent = CALLOUT_ICONS[type];

    const body = document.createElement('div');
    body.className = 'ray-callout-body';
    body.contentEditable = 'true';
    const p = document.createElement('p');
    if (selectedHtml) {
      p.innerHTML = selectedHtml;
    } else {
      p.textContent = `${CALLOUT_LABELS[type]}: `;
    }
    body.appendChild(p);

    callout.appendChild(icon);
    callout.appendChild(body);

    const spacerAfter = document.createElement('p');
    spacerAfter.innerHTML = '<br>';

    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0);

      // Find block ancestor (direct child of editorArea) to insert after it
      let blockNode: Node | null = range.commonAncestorContainer;
      while (blockNode && blockNode.parentNode !== this.editorArea) {
        blockNode = blockNode.parentNode;
      }

      if (blockNode && blockNode.parentNode === this.editorArea) {
        // If text was selected, remove it from the source block first
        if (selectedHtml) range.deleteContents();
        (blockNode as Element).after(callout, spacerAfter);
      } else {
        range.deleteContents();
        const frag = document.createDocumentFragment();
        frag.appendChild(callout);
        frag.appendChild(spacerAfter);
        range.insertNode(frag);
      }

      // Place cursor at end of callout body
      const newRange = document.createRange();
      newRange.setStart(p, p.childNodes.length);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      callout.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      this.editorArea.appendChild(callout);
      this.editorArea.appendChild(spacerAfter);
    }

    this.editorArea.focus();
  }

  destroy(): void {
    this.closePicker();
  }
}
