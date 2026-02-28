/**
 * Emoji picker popup.
 */

const EMOJI_CATEGORIES: Record<string, string[]> = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡'],
  'Gestures': ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '🤜', '🤛', '✊', '👊', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Objects': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '⭐', '🌟', '✨', '💫', '🔥', '💥', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇'],
  'Nature': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🦇', '🌻', '🌹', '🌷', '🌸', '🌼', '🌺', '🍀', '🌿'],
  'Food': ['🍕', '🍔', '🌮', '🌯', '🥗', '🍜', '🍝', '🍛', '🍣', '🍱', '🥟', '🦪', '🍦', '🍰', '🎂', '🍩', '🍪', '☕', '🍵', '🧃', '🥤', '🍺', '🍻', '🥂', '🍷'],
};

export class EmojiFeature {
  private editorArea: HTMLElement;
  private picker: HTMLElement | null = null;
  private savedRange: Range | null = null;

  constructor(editorArea: HTMLElement) {
    this.editorArea = editorArea;
  }

  toggle(anchorEl?: HTMLElement): void {
    if (this.picker) {
      this.close();
      return;
    }

    // Save current selection before picker opens
    const sel = window.getSelection();
    if (sel?.rangeCount) {
      this.savedRange = sel.getRangeAt(0).cloneRange();
    }

    this.open(anchorEl);
  }

  private open(anchorEl?: HTMLElement): void {
    this.picker = document.createElement('div');
    this.picker.className = 'ray-emoji-picker';

    // Build category tabs and grids
    const tabs = document.createElement('div');
    tabs.className = 'ray-emoji-tabs';

    const content = document.createElement('div');
    content.className = 'ray-emoji-content';

    let firstCategory = true;
    Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'ray-emoji-tab' + (firstCategory ? ' ray-emoji-tab-active' : '');
      tab.textContent = category;
      tabs.appendChild(tab);

      const grid = document.createElement('div');
      grid.className = 'ray-emoji-grid' + (firstCategory ? '' : ' ray-emoji-grid-hidden');

      emojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ray-emoji-btn';
        btn.textContent = emoji;
        btn.title = emoji;
        btn.addEventListener('click', () => {
          this.insertEmoji(emoji);
        });
        grid.appendChild(btn);
      });

      content.appendChild(grid);

      tab.addEventListener('click', () => {
        // Deactivate all tabs + grids
        tabs.querySelectorAll('.ray-emoji-tab').forEach(t => t.classList.remove('ray-emoji-tab-active'));
        content.querySelectorAll('.ray-emoji-grid').forEach(g => g.classList.add('ray-emoji-grid-hidden'));

        tab.classList.add('ray-emoji-tab-active');
        grid.classList.remove('ray-emoji-grid-hidden');
      });

      firstCategory = false;
    });

    this.picker.appendChild(tabs);
    this.picker.appendChild(content);
    document.body.appendChild(this.picker);

    // Position near button
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      this.picker.style.position = 'fixed';
      this.picker.style.left = `${rect.left}px`;
      this.picker.style.top = `${rect.bottom + 4}px`;
      this.picker.style.zIndex = '99999';
    }

    // Close on outside click
    const onOutside = (e: MouseEvent) => {
      if (
        this.picker &&
        !this.picker.contains(e.target as Node) &&
        e.target !== anchorEl
      ) {
        this.close();
        document.removeEventListener('click', onOutside);
      }
    };
    setTimeout(() => document.addEventListener('click', onOutside), 0);
  }

  private insertEmoji(emoji: string): void {
    this.close();

    // Restore selection then insert
    if (this.savedRange) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(this.savedRange);
    }

    this.editorArea.focus();
    document.execCommand('insertText', false, emoji);
  }

  private close(): void {
    this.picker?.remove();
    this.picker = null;
  }

  destroy(): void {
    this.close();
  }
}
