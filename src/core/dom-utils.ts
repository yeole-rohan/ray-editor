/**
 * Shared DOM utility helpers used across editor features.
 */

/**
 * Returns true if `el` is a block-level element with no meaningful content
 * (empty or only contains a single <br>).
 */
export function isEmptyBlock(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return false;
  const tag = node.tagName.toLowerCase();
  if (tag !== 'p' && tag !== 'div' && tag !== 'li') return false;
  const html = node.innerHTML.trim();
  return html === '' || html === '<br>' || html === '<BR>';
}

/**
 * Inserts `newEl` into `editorArea` relative to the cursor's block ancestor,
 * avoiding double-paragraph artifacts.
 *
 * Strategy:
 * - If the cursor's direct-child-of-editorArea block is empty: insert `newEl`
 *   BEFORE it so the existing empty paragraph serves as the exit spacer after.
 * - If the block has content: insert `newEl` AFTER it, then append `spacer` only
 *   when the next sibling isn't already a paragraph.
 *
 * Returns the spacer paragraph that was used (either the original empty block
 * reused as spacer, or a newly created one), so callers can place the cursor.
 */
export function insertBlockAtCursor(
  editorArea: HTMLElement,
  range: Range,
  newEl: HTMLElement,
  createSpacer = true
): HTMLElement {
  let blockNode: Node | null = range.commonAncestorContainer;
  while (blockNode && blockNode.parentNode !== editorArea) {
    blockNode = blockNode.parentNode;
  }

  let spacer: HTMLElement;

  if (blockNode && blockNode.parentNode === editorArea) {
    if (isEmptyBlock(blockNode as HTMLElement)) {
      // Reuse the existing empty paragraph as the exit spacer
      (blockNode as HTMLElement).before(newEl);
      spacer = blockNode as HTMLElement;
    } else {
      (blockNode as HTMLElement).after(newEl);
      // Only add a spacer if the next sibling is not already a paragraph
      const nextSib = newEl.nextSibling;
      if (createSpacer && (!nextSib || !(nextSib instanceof HTMLElement) || nextSib.tagName !== 'P')) {
        spacer = document.createElement('p');
        spacer.innerHTML = '<br>';
        newEl.after(spacer);
      } else {
        spacer = (nextSib as HTMLElement) ?? newEl;
      }
    }
  } else {
    // Fallback: plain insertion at range position
    range.deleteContents();
    range.insertNode(newEl);
    if (createSpacer) {
      spacer = document.createElement('p');
      spacer.innerHTML = '<br>';
      newEl.after(spacer);
    } else {
      spacer = newEl;
    }
  }

  return spacer;
}
