/**
 * Callout / alert box blocks.
 *
 * DOM structure (inside editor):
 *   <div class="ray-callout ray-callout-info">
 *     <span class="ray-callout-icon" contenteditable="false">ℹ️</span>
 *     <div class="ray-callout-body"><p>Your note here…</p></div>
 *   </div>
 *
 * getContent() passes this through as-is — clean semantic HTML.
 */
import { insertBlockAtCursor } from '../core/dom-utils';

export type CalloutType = 'info' | 'warning' | 'success' | 'error' | 'tip' | 'note' | 'important' | 'caution';

const CALLOUT_ICONS: Record<CalloutType, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
  error: '❌',
  tip: '💡',
  note: '📝',
  important: '🔔',
  caution: '🔥',
};

const CALLOUT_LABELS: Record<CalloutType, string> = {
  info: 'Info',
  warning: 'Warning',
  success: 'Success',
  error: 'Error',
  tip: 'Tip',
  note: 'Note',
  important: 'Important',
  caution: 'Caution',
};

export class CalloutFeature {
  private editorArea: HTMLElement;
  private activePopup: HTMLElement | null = null;
  private _pickerAC: AbortController | null = null;
  private _savedRange: Range | null = null;
  private _onInsert: (() => void) | null;

  constructor(editorArea: HTMLElement, onInsert?: () => void) {
    this.editorArea = editorArea;
    this._onInsert = onInsert ?? null;
  }

  /** Show 4-item picker anchored to the toolbar button, then insert chosen callout */
  showPicker(anchorBtn: HTMLElement): void {
    this.closePicker();

    // Save selection so it can be restored after picker interaction steals focus
    const sel = window.getSelection();
    if (sel?.rangeCount && this.editorArea.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      this._savedRange = sel.getRangeAt(0).cloneRange();
    } else {
      this._savedRange = null;
    }

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

    // Close on outside click — AbortController ensures the listener is always
    // removed regardless of which path closes the picker.
    this._pickerAC = new AbortController();
    const { signal } = this._pickerAC;
    const onOutside = (e: MouseEvent) => {
      if (!popup.contains(e.target as Node) && e.target !== anchorBtn) {
        this.closePicker();
      }
    };
    setTimeout(() => document.addEventListener('click', onOutside, { capture: true, signal }), 0);
  }

  closePicker(): void {
    this._pickerAC?.abort();
    this._pickerAC = null;
    this.activePopup?.remove();
    this.activePopup = null;
  }

  insertCallout(type: CalloutType): void {
    // Restore saved selection (picker interaction may have stolen focus)
    if (this._savedRange) {
      this.editorArea.focus();
      const sel = window.getSelection();
      try {
        sel?.removeAllRanges();
        sel?.addRange(this._savedRange);
      } catch { /* range may be stale */ }
      this._savedRange = null;
    }

    const sel = window.getSelection();

    // Bail out if the selection is not inside the editor area
    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0);
      if (!this.editorArea.contains(range.commonAncestorContainer)) return;
    }

    // Capture selected content, expanding to block boundaries so inline
    // formatting wrappers (<b>, <strong>, etc.) are included in the clone.
    let selectedFrag: DocumentFragment | null = null;
    if (sel?.rangeCount && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      const getBlock = (node: Node): Element | null => {
        let el: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element;
        while (el && el !== this.editorArea) {
          if (['P','H1','H2','H3','H4','H5','H6','LI','BLOCKQUOTE','DIV'].includes((el as Element).tagName.toUpperCase())) return el as Element;
          el = (el as Element).parentElement;
        }
        return null;
      };
      const startBlock = getBlock(range.startContainer);
      const endBlock = getBlock(range.endContainer);
      if (startBlock && startBlock === endBlock) {
        // Single block — clone its full contents to preserve inline formatting
        const expanded = document.createRange();
        expanded.selectNodeContents(startBlock);
        selectedFrag = expanded.cloneContents();
      } else {
        selectedFrag = range.cloneContents();
      }
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
    if (selectedFrag && selectedFrag.childNodes.length > 0) {
      p.appendChild(selectedFrag);
    } else {
      p.textContent = `${CALLOUT_LABELS[type]}: `;
    }
    body.appendChild(p);

    callout.appendChild(icon);
    callout.appendChild(body);

    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0);
      if (selectedFrag) range.deleteContents();

      insertBlockAtCursor(this.editorArea, range, callout);

      // Focus the callout body first so the cursor lands inside it,
      // not at the top of the outer editor area.
      body.focus();
      const newRange = document.createRange();
      newRange.setStart(p, p.childNodes.length);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      callout.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      const spacer = document.createElement('p');
      spacer.innerHTML = '<br>';
      this.editorArea.appendChild(callout);
      this.editorArea.appendChild(spacer);
      body.focus();
    }

    // Notify host so history can be pushed (enables Ctrl+Z undo)
    this._onInsert?.();
  }

  destroy(): void {
    this.closePicker();
  }
}
