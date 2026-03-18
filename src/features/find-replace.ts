/**
 * Find & Replace panel.
 * Ctrl+F = Find, Ctrl+H = Replace
 */
export class FindReplaceFeature {
  private editorArea: HTMLElement;
  private panel: HTMLElement | null = null;
  private matches: Range[] = [];
  private currentIdx = 0;
  private highlights: HTMLElement[] = [];

  constructor(editorArea: HTMLElement) {
    this.editorArea = editorArea;
    this.bindShortcuts();
  }

  private bindShortcuts(): void {
    document.addEventListener('keydown', e => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const ctrl = isMac ? e.metaKey : e.ctrlKey;

      if (ctrl && e.key === 'f') {
        // Only intercept if focus is inside editor or panel
        if (
          this.editorArea.contains(document.activeElement) ||
          this.panel?.contains(document.activeElement)
        ) {
          e.preventDefault();
          this.open(false);
        }
      } else if (ctrl && e.key === 'h') {
        if (
          this.editorArea.contains(document.activeElement) ||
          this.panel?.contains(document.activeElement)
        ) {
          e.preventDefault();
          this.open(true);
        }
      } else if (e.key === 'Escape' && this.panel) {
        this.close();
      }
    });
  }

  open(withReplace = false): void {
    if (this.panel) {
      if (withReplace) {
        this.panel.querySelector<HTMLElement>('.ray-replace-row')!.style.display = 'flex';
      }
      this.panel.querySelector<HTMLInputElement>('#ray-find-input')!.focus();
      return;
    }

    this.panel = document.createElement('div');
    this.panel.className = 'ray-find-panel';
    this.panel.innerHTML = `
      <div class="ray-find-row">
        <input type="text" id="ray-find-input" placeholder="Find…" autocomplete="off" />
        <label class="ray-find-option" title="Case sensitive">
          <input type="checkbox" id="ray-find-case" /> Aa
        </label>
        <label class="ray-find-option" title="Whole word">
          <input type="checkbox" id="ray-find-word" /> \\b
        </label>
        <span id="ray-find-count" class="ray-find-count"></span>
        <button id="ray-find-prev" title="Previous">▲</button>
        <button id="ray-find-next" title="Next">▼</button>
        <button id="ray-find-close" title="Close">✕</button>
      </div>
      <div class="ray-replace-row" style="display:${withReplace ? 'flex' : 'none'};">
        <input type="text" id="ray-replace-input" placeholder="Replace…" autocomplete="off" />
        <button id="ray-replace-one">Replace</button>
        <button id="ray-replace-all">Replace All</button>
      </div>
    `;

    // Insert panel above editor
    this.editorArea.parentNode?.insertBefore(this.panel, this.editorArea);

    const findInput = this.panel.querySelector<HTMLInputElement>('#ray-find-input')!;
    findInput.focus();

    findInput.addEventListener('input', () => this.search());
    this.panel.querySelector('#ray-find-case')!.addEventListener('change', () => this.search());
    this.panel.querySelector('#ray-find-word')!.addEventListener('change', () => this.search());

    this.panel.querySelector('#ray-find-prev')!.addEventListener('click', () =>
      this.navigate(-1)
    );
    this.panel.querySelector('#ray-find-next')!.addEventListener('click', () =>
      this.navigate(1)
    );
    findInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.shiftKey ? this.navigate(-1) : this.navigate(1);
      }
    });

    this.panel.querySelector('#ray-find-close')!.addEventListener('click', () =>
      this.close()
    );

    this.panel.querySelector('#ray-replace-one')!.addEventListener('click', () =>
      this.replaceCurrent()
    );
    this.panel.querySelector('#ray-replace-all')!.addEventListener('click', () =>
      this.replaceAll()
    );
  }

  close(): void {
    this.clearHighlights();
    this.panel?.remove();
    this.panel = null;
    this.matches = [];
    this.currentIdx = 0;
  }

  private search(): void {
    this.clearHighlights();

    const query = this.panel?.querySelector<HTMLInputElement>('#ray-find-input')?.value ?? '';
    if (!query) {
      this.updateCount(0, 0);
      return;
    }

    const caseSensitive =
      this.panel?.querySelector<HTMLInputElement>('#ray-find-case')?.checked ?? false;
    const wholeWord =
      this.panel?.querySelector<HTMLInputElement>('#ray-find-word')?.checked ?? false;

    this.matches = this.findMatches(query, caseSensitive, wholeWord);
    this.currentIdx = 0;

    this.highlightMatches();
    this.updateCount(this.currentIdx + 1, this.matches.length);
    this.scrollToMatch(this.currentIdx);
  }

  private findMatches(
    query: string,
    caseSensitive: boolean,
    wholeWord: boolean
  ): Range[] {
    const ranges: Range[] = [];
    const flags = caseSensitive ? 'g' : 'gi';
    const pattern = wholeWord ? `\\b${this.escapeRegex(query)}\\b` : this.escapeRegex(query);
    const regex = new RegExp(pattern, flags);

    const walker = document.createTreeWalker(
      this.editorArea,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: node => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (parent.closest('.ray-find-match')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      const text = textNode.textContent || '';
      let match: RegExpExecArray | null;
      regex.lastIndex = 0;
      while ((match = regex.exec(text)) !== null) {
        const range = document.createRange();
        range.setStart(textNode, match.index);
        range.setEnd(textNode, match.index + match[0].length);
        ranges.push(range);
      }
    }

    return ranges;
  }

  private highlightMatches(): void {
    // Pre-allocate slots so navigation order matches findMatches order.
    this.highlights = new Array(this.matches.length).fill(null);

    // Group match indices by their start text node.
    // Within the same text node, surroundContents() splits the node and
    // invalidates the offsets of any match to the left — so we must wrap
    // right-to-left (highest offset first) inside each text node.
    const byNode = new Map<Node, number[]>();
    this.matches.forEach((range, i) => {
      const node = range.startContainer;
      if (!byNode.has(node)) byNode.set(node, []);
      byNode.get(node)!.push(i);
    });

    byNode.forEach(indices => {
      // Process highest-offset match first so splits don't shift earlier positions
      for (const i of [...indices].reverse()) {
        const range = this.matches[i];
        const mark = document.createElement('mark');
        mark.className =
          i === this.currentIdx
            ? 'ray-find-match ray-find-active'
            : 'ray-find-match';
        try {
          range.surroundContents(mark);
          this.highlights[i] = mark;
        } catch {
          // Range spans multiple nodes (e.g. bold mid-word) — skip silently
        }
      }
    });

    // Drop null slots from failed wraps (keeps indices stable for navigation)
    this.highlights = this.highlights.filter(Boolean) as HTMLElement[];
  }

  private clearHighlights(): void {
    this.editorArea.querySelectorAll('.ray-find-match').forEach(mark => {
      const parent = mark.parentNode!;
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
    });
    this.highlights = [];
  }

  private navigate(dir: 1 | -1): void {
    if (this.matches.length === 0) return;

    // Update active class
    this.highlights[this.currentIdx]?.classList.remove('ray-find-active');
    this.currentIdx =
      (this.currentIdx + dir + this.matches.length) % this.matches.length;
    this.highlights[this.currentIdx]?.classList.add('ray-find-active');

    this.updateCount(this.currentIdx + 1, this.matches.length);
    this.scrollToMatch(this.currentIdx);
  }

  private scrollToMatch(idx: number): void {
    this.highlights[idx]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  private replaceCurrent(): void {
    const replacement =
      this.panel?.querySelector<HTMLInputElement>('#ray-replace-input')?.value ?? '';
    const mark = this.highlights[this.currentIdx];
    if (!mark) return;

    mark.replaceWith(document.createTextNode(replacement));
    this.highlights.splice(this.currentIdx, 1);
    this.matches.splice(this.currentIdx, 1);

    if (this.currentIdx >= this.matches.length) this.currentIdx = 0;
    this.updateCount(this.currentIdx + 1, this.matches.length);
  }

  private replaceAll(): void {
    const replacement =
      this.panel?.querySelector<HTMLInputElement>('#ray-replace-input')?.value ?? '';
    this.highlights.forEach(mark => {
      mark.replaceWith(document.createTextNode(replacement));
    });
    this.highlights = [];
    this.matches = [];
    this.updateCount(0, 0);
  }

  private updateCount(current: number, total: number): void {
    const countEl = this.panel?.querySelector<HTMLElement>('#ray-find-count');
    if (!countEl) return;
    countEl.textContent = total > 0 ? `${current} of ${total}` : total === 0 && this.panel?.querySelector<HTMLInputElement>('#ray-find-input')?.value ? 'No results' : '';
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  destroy(): void {
    this.close();
  }
}
