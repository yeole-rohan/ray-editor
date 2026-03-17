/**
 * Font size picker — custom popup with preset sizes, live preview, and custom input.
 */

const PRESET_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

export class FontSizeFeature {
  private editorArea: HTMLElement;
  private picker: HTMLElement | null = null;
  private savedRange: Range | null = null;
  private previewSpan: HTMLElement | null = null;

  constructor(editorArea: HTMLElement) {
    this.editorArea = editorArea;
  }

  show(anchorBtn: HTMLElement): void {
    if (this.picker) {
      this.close();
      return;
    }

    // Save selection before picker opens (mousedown on toolbar button already did this,
    // but capture it here too in case we're called programmatically)
    const sel = window.getSelection();
    this.savedRange = sel?.rangeCount ? sel.getRangeAt(0).cloneRange() : null;

    const picker = document.createElement('div');
    picker.className = 'ray-fontsize-picker';
    // Prevent focus loss so the editor selection stays alive
    picker.addEventListener('mousedown', e => e.preventDefault());
    this.picker = picker;

    // ── Custom size input ─────────────────────────────────────────────────────
    const inputRow = document.createElement('div');
    inputRow.className = 'ray-fontsize-input-row';

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '6';
    input.max = '200';
    input.placeholder = 'Custom…';
    input.className = 'ray-fontsize-input';

    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.textContent = '↵';
    applyBtn.className = 'ray-fontsize-apply-btn';
    applyBtn.title = 'Apply custom size';
    applyBtn.setAttribute('aria-label', 'Apply custom font size');

    const doApplyCustom = () => {
      const px = parseInt(input.value, 10);
      if (!isNaN(px) && px >= 6 && px <= 200) this.applySize(px);
    };
    applyBtn.addEventListener('click', doApplyCustom);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doApplyCustom(); });

    inputRow.appendChild(input);
    inputRow.appendChild(applyBtn);
    picker.appendChild(inputRow);

    // ── Preset list ───────────────────────────────────────────────────────────
    const list = document.createElement('div');
    list.className = 'ray-fontsize-list';

    // "Default" clears font-size from the selection
    const defaultItem = document.createElement('button');
    defaultItem.type = 'button';
    defaultItem.className = 'ray-fontsize-item ray-fontsize-item-default';
    defaultItem.textContent = 'Default';
    defaultItem.setAttribute('aria-label', 'Remove font size');
    defaultItem.addEventListener('mouseenter', () => this.previewSize(0));
    defaultItem.addEventListener('mouseleave', () => this.removePreview());
    defaultItem.addEventListener('click', () => this.applySize(0));
    list.appendChild(defaultItem);

    PRESET_SIZES.forEach(px => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'ray-fontsize-item';
      item.setAttribute('aria-label', `${px} pixels`);
      // Show the label at a visually scaled version so users can gauge the size
      item.innerHTML = `<span style="font-size:${Math.min(px, 22)}px;line-height:1">${px}px</span>`;
      item.addEventListener('mouseenter', () => this.previewSize(px));
      item.addEventListener('mouseleave', () => this.removePreview());
      item.addEventListener('click', () => this.applySize(px));
      list.appendChild(item);
    });

    picker.appendChild(list);
    document.body.appendChild(picker);

    // ── Position below anchor ─────────────────────────────────────────────────
    const rect = anchorBtn.getBoundingClientRect();
    const estimatedH = 420;
    const top = window.innerHeight - rect.bottom >= estimatedH
      ? rect.bottom + 4
      : rect.top - estimatedH - 4;
    let left = rect.left;
    if (left + 160 > window.innerWidth) left = window.innerWidth - 164;
    picker.style.cssText =
      `position:fixed;z-index:99999;top:${Math.max(4, top)}px;left:${Math.max(4, left)}px`;

    // ── Outside-click close ───────────────────────────────────────────────────
    const onOutside = (e: MouseEvent) => {
      if (this.picker && !this.picker.contains(e.target as Node) && e.target !== anchorBtn) {
        this.close();
        document.removeEventListener('click', onOutside);
      }
    };
    setTimeout(() => document.addEventListener('click', onOutside), 0);
  }

  // ── Preview ───────────────────────────────────────────────────────────────

  private previewSize(px: number): void {
    this.removePreview();
    if (!this.savedRange || this.savedRange.collapsed) return;
    if (px === 0) return; // "Default" — no visual preview needed (would just remove size)

    try {
      const range = this.savedRange.cloneRange();
      const span = document.createElement('span');
      span.setAttribute('data-ray-preview', '1');
      span.style.fontSize = `${px}px`;
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
      this.previewSpan = span;
    } catch {
      // Cross-block selection or other DOM error — skip preview silently
    }
  }

  private removePreview(): void {
    if (!this.previewSpan) return;
    const parent = this.previewSpan.parentNode;
    if (!parent) { this.previewSpan = null; return; }
    // Move all children back to parent (restores original DOM)
    const frag = document.createDocumentFragment();
    while (this.previewSpan.firstChild) frag.appendChild(this.previewSpan.firstChild);
    parent.replaceChild(frag, this.previewSpan);
    this.previewSpan = null;
  }

  // ── Apply ─────────────────────────────────────────────────────────────────

  private applySize(px: number): void {
    if (this.previewSpan) {
      // Finalize the existing preview span
      this.previewSpan.removeAttribute('data-ray-preview');
      if (px === 0) {
        // "Default" — unwrap the span entirely
        const parent = this.previewSpan.parentNode;
        if (parent) {
          const frag = document.createDocumentFragment();
          while (this.previewSpan.firstChild) frag.appendChild(this.previewSpan.firstChild);
          parent.replaceChild(frag, this.previewSpan);
        }
      } else {
        this.previewSpan.style.fontSize = `${px}px`;
      }
      this.previewSpan = null;
    } else if (this.savedRange && !this.savedRange.collapsed) {
      // No preview active (e.g., collapsed range on hover or preview failed)
      if (px === 0) {
        this.clearSizeFromRange();
      } else {
        this.wrapWithSize(this.savedRange, px);
      }
    }

    // Close without calling removePreview (already handled above)
    this.picker?.remove();
    this.picker = null;
    this.savedRange = null;
  }

  private wrapWithSize(range: Range, px: number): void {
    try {
      const r = range.cloneRange();
      const span = document.createElement('span');
      span.style.fontSize = `${px}px`;
      const frag = r.extractContents();
      this.stripFragmentFontSize(frag);
      span.appendChild(frag);
      r.insertNode(span);

      // Move cursor to end of inserted span
      const sel = window.getSelection();
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(newRange);
    } catch {
      // Fallback for tricky selections
      try {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range.cloneRange());
        document.execCommand('insertHTML', false,
          `<span style="font-size:${px}px">${range.cloneContents().textContent ?? ''}</span>`);
      } catch { /* silent fail */ }
    }
  }

  private clearSizeFromRange(): void {
    if (!this.savedRange) return;
    // Walk up ancestors from the selection and clear any font-size inline styles
    let node: Node | null = this.savedRange.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    while (node && node !== this.editorArea && node.nodeType === Node.ELEMENT_NODE) {
      (node as HTMLElement).style?.removeProperty('font-size');
      node = node.parentNode;
    }
  }

  /** Strip font-size from child spans inside an extracted DocumentFragment. */
  private stripFragmentFontSize(frag: DocumentFragment): void {
    frag.querySelectorAll<HTMLElement>('span').forEach(s => {
      s.style.removeProperty('font-size');
      // Unwrap the span if it has no other styles left
      if (!s.style.cssText.trim() && !s.className) {
        const p = s.parentNode;
        if (p) {
          while (s.firstChild) p.insertBefore(s.firstChild, s);
          p.removeChild(s);
        }
      }
    });
  }

  destroy(): void {
    this.close();
  }

  private close(): void {
    this.removePreview();
    this.picker?.remove();
    this.picker = null;
    this.savedRange = null;
  }
}
