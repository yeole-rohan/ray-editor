/**
 * Special characters picker — grid popup with ~90 commonly used characters.
 */

const CHAR_GROUPS: Array<{ label: string; chars: string[] }> = [
  {
    label: 'Symbols',
    chars: ['©', '®', '™', '°', '§', '¶', '†', '‡', '•', '·', '…', '‰', '№', '℃', '℉', '♠', '♣', '♥', '♦'],
  },
  {
    label: 'Math',
    chars: ['×', '÷', '±', '≤', '≥', '≠', '≈', '∞', '√', '∑', '∏', 'Δ', 'π', 'μ', 'Ω', '∂', '∫', '∈', '∅'],
  },
  {
    label: 'Currency',
    chars: ['€', '£', '¥', '¢', '₹', '₽', '₿', '₩', '¤', '₪', '₦', '₺', '₴'],
  },
  {
    label: 'Arrows',
    chars: ['←', '→', '↑', '↓', '↔', '↕', '⇐', '⇒', '⇑', '⇓', '⇔', '↩', '↪', '↗', '↘'],
  },
  {
    label: 'Punctuation',
    chars: ['\u201C', '\u201D', '\u2018', '\u2019', '‹', '›', '«', '»', '–', '—', '‐', '¿', '¡', '·'],
  },
  {
    label: 'Greek',
    chars: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'λ', 'ξ', 'σ', 'φ', 'ψ', 'ω', 'Σ', 'Π', 'Φ', 'Ψ', 'Ω'],
  },
];

export class SpecialCharsFeature {
  private activePopup: HTMLElement | null = null;
  private savedSelection: { range: Range; } | null = null;
  private _openAC: AbortController | null = null;

  toggle(anchorBtn: HTMLElement): void {
    if (this.activePopup) {
      this.close();
      return;
    }
    this.open(anchorBtn);
  }

  private open(anchorBtn: HTMLElement): void {
    // Save selection before popup steals focus
    const sel = window.getSelection();
    if (sel?.rangeCount) {
      this.savedSelection = { range: sel.getRangeAt(0).cloneRange() };
    }

    const popup = document.createElement('div');
    popup.className = 'ray-special-chars-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'Special characters');

    CHAR_GROUPS.forEach(group => {
      const groupEl = document.createElement('div');
      groupEl.className = 'ray-sc-group';

      const label = document.createElement('div');
      label.className = 'ray-sc-group-label';
      label.textContent = group.label;
      groupEl.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'ray-sc-grid';

      group.chars.forEach(char => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ray-sc-char';
        btn.textContent = char;
        btn.title = char;
        btn.setAttribute('aria-label', `Insert ${char}`);
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.insertChar(char);
          this.close();
        });
        grid.appendChild(btn);
      });

      groupEl.appendChild(grid);
      popup.appendChild(groupEl);
    });

    document.body.appendChild(popup);
    this.activePopup = popup;

    // Position below anchor
    const rect = anchorBtn.getBoundingClientRect();
    const popupWidth = 320;
    let left = rect.left + window.scrollX;
    if (left + popupWidth > window.innerWidth - 8) {
      left = window.innerWidth - popupWidth - 8;
    }
    popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
    popup.style.left = `${Math.max(4, left)}px`;

    // Close on outside click or Escape — AbortController cleans up both
    // listeners via any close path (char click, outside click, or Escape).
    this._openAC = new AbortController();
    const { signal } = this._openAC;
    const onOutside = (e: MouseEvent) => {
      if (!popup.contains(e.target as Node) && e.target !== anchorBtn) this.close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.close();
    };
    setTimeout(() => document.addEventListener('click', onOutside, { capture: true, signal }), 0);
    document.addEventListener('keydown', onKey, { signal });
  }

  private insertChar(char: string): void {
    // Restore selection then insert
    if (this.savedSelection) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(this.savedSelection.range);
    }
    document.execCommand('insertText', false, char);
    this.savedSelection = null;
  }

  close(): void {
    this._openAC?.abort();
    this._openAC = null;
    this.activePopup?.remove();
    this.activePopup = null;
  }

  destroy(): void {
    this.close();
  }
}
