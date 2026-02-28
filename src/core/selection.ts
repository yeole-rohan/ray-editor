/**
 * Selection save/restore helpers.
 */
export class SelectionManager {
  private savedRange: Range | null = null;

  save(): Range | null {
    if (window.getSelection) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        this.savedRange = sel.getRangeAt(0).cloneRange();
        return this.savedRange;
      }
    }
    return null;
  }

  restore(range?: Range | null): void {
    const r = range ?? this.savedRange;
    if (r && window.getSelection) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(r);
      }
    }
  }

  getRange(): Range | null {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) return sel.getRangeAt(0);
    return null;
  }

  isCollapsed(): boolean {
    const sel = window.getSelection();
    return !sel || sel.isCollapsed;
  }

  getAncestorElement(): Element | null {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const node = sel.anchorNode;
    if (!node) return null;
    return node.nodeType === Node.TEXT_NODE
      ? node.parentElement
      : (node as Element);
  }

  /** Walk up DOM to find first ancestor with given tag */
  getElementInTag(tagName: string): Element | null {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let node: Node | null = sel.anchorNode;
    while (node && node !== document.body) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as Element).tagName.toLowerCase() === tagName.toLowerCase()
      ) {
        return node as Element;
      }
      node = node.parentNode;
    }
    return null;
  }

  /** Get block-level ancestor of a node */
  getBlockAncestor(node: Node | null): Element | null {
    let n: Node | null = node;
    while (n && n.nodeType === Node.TEXT_NODE) n = n.parentNode;
    while (n && n !== document.body) {
      const style = window.getComputedStyle(n as Element);
      if (
        style.display === 'block' ||
        style.display === 'flex' ||
        style.display === 'grid'
      ) {
        return n as Element;
      }
      n = (n as Element).parentNode;
    }
    return null;
  }
}
