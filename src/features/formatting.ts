/**
 * Text formatting features: bold, italic, underline, color, etc.
 */

const PRESET_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#ffffff',
  '#ff0000', '#ff4500', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#9900ff',
  '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3d85c8', '#674ea7', '#a61c00',
];

export class FormattingFeature {
  private editorArea: HTMLElement;
  private activePopup: HTMLElement | null = null;

  constructor(editorArea: HTMLElement) {
    this.editorArea = editorArea;
  }

  showTextColorPicker(anchorBtn: HTMLElement): void {
    this._showColorPicker(anchorBtn, 'foreColor');
  }

  showBackgroundColorPicker(anchorBtn: HTMLElement): void {
    this._showColorPicker(anchorBtn, 'backColor');
  }

  private _showColorPicker(anchorBtn: HTMLElement, cmd: 'foreColor' | 'backColor'): void {
    this._closePopup();
    const savedRange = this._saveSelection();

    const popup = document.createElement('div');
    popup.className = 'ray-color-picker-popup';
    this.activePopup = popup;

    // Preset swatches grid
    const swatchGrid = document.createElement('div');
    swatchGrid.className = 'ray-color-swatch-grid';

    PRESET_COLORS.forEach(color => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'ray-color-swatch';
      swatch.style.background = color;
      swatch.title = color;
      swatch.onmousedown = (e) => {
        e.preventDefault();
        this._restoreSelection(savedRange);
        document.execCommand(cmd, false, color);
        this._closePopup();
      };
      swatchGrid.appendChild(swatch);
    });

    // Custom hex input row
    const customRow = document.createElement('div');
    customRow.className = 'ray-color-custom-row';

    const hexLabel = document.createElement('span');
    hexLabel.textContent = '#';
    hexLabel.className = 'ray-color-hex-label';

    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.className = 'ray-color-hex-input';
    hexInput.placeholder = 'hex color';
    hexInput.maxLength = 7;

    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'ray-color-apply-btn';
    applyBtn.textContent = 'Apply';
    applyBtn.onmousedown = (e) => {
      e.preventDefault();
      const val = hexInput.value.startsWith('#') ? hexInput.value : '#' + hexInput.value;
      if (/^#[0-9a-fA-F]{3,6}$/.test(val)) {
        this._restoreSelection(savedRange);
        document.execCommand(cmd, false, val);
        this._closePopup();
      }
    };

    // Remove color button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'ray-color-remove-btn';
    removeBtn.textContent = '✕ Remove';
    removeBtn.onmousedown = (e) => {
      e.preventDefault();
      this._restoreSelection(savedRange);
      if (cmd === 'foreColor') {
        document.execCommand('removeFormat', false, undefined);
      } else {
        document.execCommand(cmd, false, 'transparent');
      }
      this._closePopup();
    };

    customRow.appendChild(hexLabel);
    customRow.appendChild(hexInput);
    customRow.appendChild(applyBtn);

    popup.appendChild(swatchGrid);
    popup.appendChild(customRow);
    popup.appendChild(removeBtn);
    document.body.appendChild(popup);

    // Position below the anchor button, clamped to viewport
    const rect = anchorBtn.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 4;
    let left = rect.left + window.scrollX;
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;

    // Clamp to viewport after layout
    requestAnimationFrame(() => {
      const pr = popup.getBoundingClientRect();
      if (pr.right > window.innerWidth - 8) {
        left = window.innerWidth - pr.width - 8 + window.scrollX;
        popup.style.left = `${left}px`;
      }
      if (pr.bottom > window.innerHeight - 8) {
        top = rect.top + window.scrollY - pr.height - 4;
        popup.style.top = `${top}px`;
      }
    });

    // Close on outside click
    setTimeout(() => {
      const onOutside = (e: MouseEvent) => {
        if (!popup.contains(e.target as Node)) {
          this._closePopup();
          document.removeEventListener('mousedown', onOutside);
        }
      };
      document.addEventListener('mousedown', onOutside);
    }, 0);
  }

  private _closePopup(): void {
    this.activePopup?.remove();
    this.activePopup = null;
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
