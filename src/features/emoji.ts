/**
 * Emoji picker popup.
 * Features: category tabs (emoji icons), search, recently used.
 */

const RECENT_KEY = 'ray-emoji-recent';
const MAX_RECENT = 24;

// Keyword aliases per category for the search filter
const SEARCH_KEYWORDS: Record<string, string[]> = {
  Smileys:    ['smile', 'face', 'happy', 'sad', 'emotion', 'laugh', 'cry', 'angry', 'love', 'fun', 'mood'],
  People:     ['people', 'person', 'hand', 'gesture', 'wave', 'thumbs', 'clap', 'fist', 'finger', 'skin'],
  Animals:    ['animal', 'pet', 'dog', 'cat', 'bird', 'nature', 'plant', 'tree', 'flower', 'fish', 'wild', 'bug'],
  Food:       ['food', 'eat', 'drink', 'pizza', 'burger', 'fruit', 'meal', 'coffee', 'beer', 'cake', 'snack'],
  Activities: ['sport', 'game', 'ball', 'play', 'music', 'art', 'trophy', 'medal', 'instrument', 'dance'],
  Travel:     ['travel', 'place', 'building', 'car', 'plane', 'city', 'country', 'map', 'transport', 'road'],
  Objects:    ['object', 'tool', 'tech', 'phone', 'computer', 'clock', 'money', 'light', 'key', 'lock'],
  Symbols:    ['symbol', 'heart', 'love', 'star', 'fire', 'arrow', 'sign', 'mark', 'check', 'cross'],
  Flags:      ['flag', 'country', 'nation', 'world'],
};

interface EmojiCategory {
  icon: string;
  name: string;
  emojis: string[];
}

const CATEGORIES: EmojiCategory[] = [
  {
    icon: '😀',
    name: 'Smileys',
    emojis: [
      '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗',
      '😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔',
      '😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵',
      '🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦',
      '😧','😮','😲','🥱','😴','🤤','😪','😵','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽',
      '👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾',
    ],
  },
  {
    icon: '👋',
    name: 'People',
    emojis: [
      // Hands & gestures
      '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙',
      '👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜',
      '🙌','🫶','👏','🤲','🙏','✍️','💅','🤳','💪','🦵','🦶','👂','🦻','👃',
      // People
      '👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵',
      '🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷',
      '💆','💇','🚶','🧍','🧎','🏃','💃','🕺',
      '🏋️','🤸','⛹️','🤺','🏊','🏄','🚣','🧘','🛀','🤵','👰','🤰','🤱','👼','🎅','🤶',
    ],
  },
  {
    icon: '🐶',
    name: 'Animals',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐸','🐵','🙈','🙉','🙊','🐔','🐧',
      '🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️',
      '🦂','🐢','🐍','🦎','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅',
      '🐆','🦓','🦍','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙',
      '🐐','🦌','🐕','🐩','🐈','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦦','🦥',
      '🐁','🐀','🐿️','🦔','🌻','🌹','🌷','🌸','🌼','🌺','🍀','🌿','🌱','🌾','🍁','🍂','🍃','🌴','🌵',
    ],
  },
  {
    icon: '🍕',
    name: 'Food',
    emojis: [
      '🍕','🍔','🌮','🌯','🥗','🥙','🍳','🥘','🍲','🥫','🥓','🥩','🍗','🍖','🌭','🥪','🥨','🧀',
      '🍞','🥐','🥖','🥞','🧇','🍜','🍝','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍘','🍥','🥮','🍢',
      '🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🥜','🍯','🧃','🥤','🧋','☕','🍵','🍺',
      '🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾',
    ],
  },
  {
    icon: '⚽',
    name: 'Activities',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🥍','🏑','🏏','🎯','🎮',
      '🕹️','🎲','♟️','🎰','🧩','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🎻','🏆',
      '🥇','🥈','🥉','🏅','🎖️','🎪','🤹','🎠','🎡','🎢',
    ],
  },
  {
    icon: '🌍',
    name: 'Travel',
    emojis: [
      '🌍','🌎','🌏','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏗️',
      '🏘️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','🕌','⛪',
      '🕍','⛩️','🕋','⛲','⛺','🌃','🏙️','🌄','🌅','🌆','🌇','🌉','🌌','🚂','🚄','🚇','🚌','🚑',
      '🚒','🚓','🚕','🚗','🚙','🚜','🏎️','🏍️','🛵','🚲','🛴','✈️','🛫','🛬','💺','🚁','🚀','🛸',
      '⚓','🚢','🛳️','⛵','🚤',
    ],
  },
  {
    icon: '💡',
    name: 'Objects',
    emojis: [
      '⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','💽','💾','💿','📀','📷','📸','📹','🎥','📞','☎️','📺',
      '📻','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','💰','💳','💎','⚖️',
      '🧲','🔧','🔩','⚙️','🔑','🗝️','🔒','🔓','🚪','🛋️','🚽','🚿','🛁','🧴','🧷','🧹','🧺','🧻',
      '🧼','🛒','💈','🎁','🎀','🎊','🎉','🎈','🎆','🎇','🧨','✨',
    ],
  },
  {
    icon: '🔣',
    name: 'Symbols',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝',
      '💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','☯️','⭐','🌟','✨','💫','🔥','💥','❌','✅','⭕',
      '🚫','💯','💢','❗','❕','❓','❔','‼️','⁉️','🔱','⚜️','🔰','♻️','🌐','💤','🔔','🔕','📢',
      '📣','🔇','🔉','🔊','🔅','🔆','📶','🏧','🚾','♿','🅿️','🆔','🆚','💮','🅰️','🅱️','🆎','🆑',
      '🅾️','🆘','🔂','🔁','🔃','▶️','⏩','⏭️','⏯️','◀️','⏪','⏮️','⏫','⏬','🔀',
    ],
  },
  {
    icon: '🏁',
    name: 'Flags',
    emojis: [
      '🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️',
      '🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇯🇵','🇨🇳','🇮🇳','🇧🇷','🇨🇦','🇦🇺','🇷🇺','🇰🇷',
      '🇮🇹','🇪🇸','🇲🇽','🇸🇦','🇿🇦','🇦🇷','🇳🇴','🇸🇪','🇩🇰','🇫🇮','🇳🇱','🇧🇪',
      '🇨🇭','🇦🇹','🇳🇿','🇮🇱','🇵🇹','🇵🇱','🇨🇿','🇹🇷','🇬🇷','🇭🇺','🇷🇴','🇺🇦',
      '🇮🇩','🇹🇭','🇻🇳','🇵🇭','🇲🇾','🇸🇬','🇵🇰',
    ],
  },
];

export class EmojiFeature {
  private editorArea: HTMLElement;
  private picker: HTMLElement | null = null;
  private savedRange: Range | null = null;
  private _closeAC: AbortController | null = null;

  constructor(editorArea: HTMLElement) {
    this.editorArea = editorArea;
  }

  toggle(anchorEl?: HTMLElement): void {
    if (this.picker) {
      this.close();
      return;
    }
    const sel = window.getSelection();
    if (sel?.rangeCount) {
      this.savedRange = sel.getRangeAt(0).cloneRange();
    }
    this.open(anchorEl);
  }

  private open(anchorEl?: HTMLElement): void {
    const picker = document.createElement('div');
    picker.className = 'ray-emoji-picker';
    this.picker = picker;

    // ── Search input ───────────────────────────────────────────────────────
    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = 'Search emojis…';
    search.className = 'ray-emoji-search';
    search.setAttribute('autocomplete', 'off');
    picker.appendChild(search);

    // ── Category tabs ──────────────────────────────────────────────────────
    const tabs = document.createElement('div');
    tabs.className = 'ray-emoji-tabs';
    picker.appendChild(tabs);

    // ── Scrollable content ─────────────────────────────────────────────────
    const content = document.createElement('div');
    content.className = 'ray-emoji-content';
    picker.appendChild(content);

    // Search results grid (hidden until query typed)
    const searchGrid = document.createElement('div');
    searchGrid.className = 'ray-emoji-grid ray-emoji-grid-hidden';
    searchGrid.dataset.cat = 'search';
    content.appendChild(searchGrid);

    // Recently used
    const recent = this.loadRecent();
    let firstActiveGrid: HTMLElement | null = null;

    if (recent.length > 0) {
      const recentTab = this.makeTab('🕑', 'Recently Used');
      tabs.appendChild(recentTab);
      const recentGrid = document.createElement('div');
      recentGrid.className = 'ray-emoji-grid';
      recentGrid.dataset.cat = 'recent';
      recent.forEach(e => recentGrid.appendChild(this.makeEmojiBtn(e)));
      content.appendChild(recentGrid);
      recentTab.addEventListener('click', () => this.switchTab(tabs, content, recentTab, recentGrid));
      recentTab.classList.add('ray-emoji-tab-active');
      firstActiveGrid = recentGrid;
    }

    // Category grids
    CATEGORIES.forEach(cat => {
      const tab = this.makeTab(cat.icon, cat.name);
      tabs.appendChild(tab);
      const grid = document.createElement('div');
      grid.className = 'ray-emoji-grid' + (firstActiveGrid ? ' ray-emoji-grid-hidden' : '');
      grid.dataset.cat = cat.name;
      cat.emojis.forEach(e => grid.appendChild(this.makeEmojiBtn(e)));
      content.appendChild(grid);
      if (!firstActiveGrid) {
        tab.classList.add('ray-emoji-tab-active');
        firstActiveGrid = grid;
      }
      tab.addEventListener('click', () => this.switchTab(tabs, content, tab, grid));
    });

    document.body.appendChild(picker);

    // ── Position ───────────────────────────────────────────────────────────
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      picker.style.position = 'fixed';
      picker.style.zIndex = '99999';
      const estimatedH = 360;
      const top = window.innerHeight - rect.bottom >= estimatedH
        ? rect.bottom + 4
        : rect.top - estimatedH - 4;
      let left = rect.left;
      if (left + 294 > window.innerWidth) left = window.innerWidth - 298;
      picker.style.top = `${Math.max(4, top)}px`;
      picker.style.left = `${Math.max(4, left)}px`;
    }

    // ── Search wiring ──────────────────────────────────────────────────────
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      if (!q) {
        searchGrid.classList.add('ray-emoji-grid-hidden');
        // Restore previously active tab
        const activeCat = tabs.querySelector<HTMLElement>('.ray-emoji-tab-active')?.dataset.tabName ?? '';
        content.querySelectorAll<HTMLElement>('.ray-emoji-grid[data-cat]').forEach(g => {
          g.classList.toggle('ray-emoji-grid-hidden', g.dataset.cat !== activeCat);
        });
        return;
      }
      const results = this.filterEmojis(q);
      searchGrid.innerHTML = '';
      if (results.length === 0) {
        const msg = document.createElement('div');
        msg.className = 'ray-emoji-no-results';
        msg.textContent = 'No results';
        searchGrid.appendChild(msg);
      } else {
        results.forEach(e => searchGrid.appendChild(this.makeEmojiBtn(e)));
      }
      content.querySelectorAll<HTMLElement>('.ray-emoji-grid:not([data-cat="search"])').forEach(g =>
        g.classList.add('ray-emoji-grid-hidden')
      );
      searchGrid.classList.remove('ray-emoji-grid-hidden');
    });

    // ── Outside-click close ────────────────────────────────────────────────
    this._closeAC = new AbortController();
    const { signal } = this._closeAC;
    const onOutside = (e: MouseEvent) => {
      if (this.picker && !this.picker.contains(e.target as Node) && e.target !== anchorEl) {
        this.close();
      }
    };
    setTimeout(() => document.addEventListener('click', onOutside, { signal }), 0);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private makeTab(icon: string, name: string): HTMLButtonElement {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'ray-emoji-tab';
    tab.textContent = icon;
    tab.title = name;
    tab.setAttribute('aria-label', name);
    tab.dataset.tabName = name;
    return tab;
  }

  private switchTab(
    tabs: HTMLElement,
    content: HTMLElement,
    activeTab: HTMLButtonElement,
    activeGrid: HTMLElement,
  ): void {
    tabs.querySelectorAll('.ray-emoji-tab').forEach(t => t.classList.remove('ray-emoji-tab-active'));
    content.querySelectorAll<HTMLElement>('.ray-emoji-grid').forEach(g => g.classList.add('ray-emoji-grid-hidden'));
    activeTab.classList.add('ray-emoji-tab-active');
    activeGrid.classList.remove('ray-emoji-grid-hidden');
  }

  private makeEmojiBtn(emoji: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ray-emoji-btn';
    btn.textContent = emoji;
    btn.title = emoji;
    btn.addEventListener('click', () => this.insertEmoji(emoji));
    return btn;
  }

  private filterEmojis(q: string): string[] {
    const matching = CATEGORIES.filter(cat =>
      cat.name.toLowerCase().includes(q) ||
      (SEARCH_KEYWORDS[cat.name] ?? []).some(kw => kw.includes(q))
    );
    // Return only matched emojis; empty array signals "no results" to caller
    return matching.flatMap(c => c.emojis);
  }

  private insertEmoji(emoji: string): void {
    this.close();
    if (this.savedRange) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(this.savedRange);
    }
    this.editorArea.focus();
    document.execCommand('insertText', false, emoji);
    this.saveRecent(emoji);
  }

  private loadRecent(): string[] {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  }

  private saveRecent(emoji: string): void {
    try {
      const list = this.loadRecent().filter(e => e !== emoji);
      list.unshift(emoji);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
    } catch { /* private mode */ }
  }

  private close(): void {
    this._closeAC?.abort();
    this._closeAC = null;
    this.picker?.remove();
    this.picker = null;
  }

  destroy(): void {
    this.close();
  }
}
