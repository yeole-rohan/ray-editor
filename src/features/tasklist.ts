import { insertBlockAtCursor } from '../core/dom-utils';

/**
 * Task / to-do list feature.
 *
 * Each <li> is the single editable surface. The checkbox is a custom
 * <span class="ray-task-checkbox" contenteditable="false"> followed by a plain
 * text node — no nested contenteditable spans, no native inputs.
 *
 * DOM structure (inside editor):
 *   <ul class="ray-task-list">
 *     <li class="ray-task-item" data-checked="false">
 *       <span class="ray-task-checkbox" contenteditable="false" role="checkbox"
 *             aria-checked="false" aria-label="Task status"></span>
 *       Buy milk
 *     </li>
 *   </ul>
 *
 * getContent() output (clean HTML — span stripped, data-checked preserved):
 *   <ul class="ray-task-list">
 *     <li data-checked="false">Buy milk</li>
 *   </ul>
 *
 * setContent() / restoreFromHTML: bare <li data-checked> → span + text node.
 * Also migrates old formats (span+text-span, native input) automatically.
 */
export class TaskListFeature {
  private editorArea: HTMLElement;

  constructor(editorArea: HTMLElement) {
    this.editorArea = editorArea;
    this.bindClickHandler();
  }

  /** Insert a new task list at the current cursor position */
  insertTaskList(): void {
    const item = this.buildTaskItem(false, '');
    const ul = document.createElement('ul');
    ul.className = 'ray-task-list';
    ul.appendChild(item);

    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0);
      if (!this.editorArea.contains(range.commonAncestorContainer)) return;

      insertBlockAtCursor(this.editorArea, range, ul, false);

      // Place cursor after the checkbox span so the user can start typing
      const span = item.querySelector('.ray-task-checkbox');
      if (span) {
        const newRange = document.createRange();
        newRange.setStartAfter(span);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    } else {
      this.editorArea.appendChild(ul);
    }
  }

  /** Build a single task list item: custom checkbox span + text node */
  buildTaskItem(checked: boolean, text: string): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'ray-task-item';
    li.setAttribute('data-checked', String(checked));
    li.appendChild(TaskListFeature.buildCheckboxSpan(checked));
    li.appendChild(document.createTextNode(text));
    return li;
  }

  /**
   * Handle Enter and Backspace inside task list items.
   * - Enter on non-empty item → split text at cursor into new task item
   * - Enter on empty item     → exit task list, insert <p> after
   * - Backspace at text start → convert item to <p>, remove from list
   */
  handleKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Enter' && e.key !== 'Backspace') return;

    const sel = window.getSelection();
    if (!sel?.rangeCount) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    const li = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element)
      ?.closest<HTMLLIElement>('.ray-task-item');
    if (!li) return;

    if (e.key === 'Enter') {
      e.preventDefault();

      // Repair structure first — moves any text that slipped before the span to after it
      this.normalizeTaskItem(li);

      const textNode = this.getTextNode(li);
      const text = textNode?.textContent ?? '';

      if (text.trim() === '') {
        // Empty item → exit task list
        const ul = li.closest('.ray-task-list')!;
        li.remove();
        const newPara = document.createElement('p');
        newPara.innerHTML = '<br>';
        if (ul.children.length === 0) {
          ul.replaceWith(newPara);
        } else {
          ul.after(newPara);
        }
        const r = document.createRange();
        r.setStart(newPara, 0);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      } else {
        // Split text at cursor into a new task item
        let textAfter = '';
        if (textNode && range.startContainer === textNode) {
          // Cursor is inside the text node — split at offset
          textAfter = textNode.textContent!.slice(range.startOffset);
          textNode.textContent = textNode.textContent!.slice(0, range.startOffset);
        } else if (range.startContainer === li) {
          // Cursor is a child-index reference on the li itself.
          // offset 0 = before span (shouldn't happen after normalize, but guard anyway)
          // offset 1 = after span / start of text → textAfter = all text
          // offset 2+ = after text node → textAfter = ''
          const span = li.querySelector('.ray-task-checkbox');
          const spanIdx = span ? Array.from(li.childNodes).indexOf(span) : -1;
          if (range.startOffset <= spanIdx + 1 && textNode) {
            textAfter = textNode.textContent ?? '';
            textNode.textContent = '';
          }
          // offset beyond text node → textAfter stays ''
        }
        const newLi = this.buildTaskItem(false, textAfter);
        li.after(newLi);

        const newSpan = newLi.querySelector('.ray-task-checkbox');
        const r = document.createRange();
        if (newSpan) {
          r.setStartAfter(newSpan);
        } else {
          r.setStart(newLi, newLi.childNodes.length);
        }
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      }
      return;
    }

    if (e.key === 'Backspace' && sel.isCollapsed) {
      this.normalizeTaskItem(li);
      const textNode = this.getTextNode(li);
      const atStart =
        !textNode ||
        (range.startContainer === textNode && range.startOffset === 0) ||
        (range.startContainer === li && range.startOffset <= 1);

      if (!atStart) return;
      e.preventDefault();

      const text = textNode?.textContent ?? '';
      const ul = li.closest('.ray-task-list')!;
      li.remove();

      const p = document.createElement('p');
      if (text.trim()) {
        p.textContent = text;
      } else {
        p.innerHTML = '<br>';
      }

      if (ul.children.length === 0) {
        ul.replaceWith(p);
      } else {
        ul.before(p);
      }

      const r = document.createRange();
      r.setStart(p, p.childNodes.length);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  }

  /**
   * Rebuild task list items from clean getContent() HTML (bare li[data-checked]).
   * Also migrates old formats (span+text-span, native input) automatically.
   */
  static restoreFromHTML(container: HTMLElement): void {
    container.querySelectorAll<HTMLLIElement>('ul.ray-task-list li, ol.ray-task-list li').forEach(li => {
      // Already has new format (span without old .ray-task-text)
      if (li.querySelector('.ray-task-checkbox') && !li.querySelector('.ray-task-text')) return;

      const checked = li.getAttribute('data-checked') === 'true';

      // Migrate old span format that still has .ray-task-text
      const oldCheckboxSpan = li.querySelector<HTMLElement>('.ray-task-checkbox');
      if (oldCheckboxSpan) {
        const textSpan = li.querySelector<HTMLElement>('.ray-task-text');
        const text = textSpan ? (textSpan.textContent ?? '') : '';
        li.className = 'ray-task-item';
        li.innerHTML = '';
        li.appendChild(TaskListFeature.buildCheckboxSpan(checked));
        li.appendChild(document.createTextNode(text));
        return;
      }

      // Migrate native input format
      const input = li.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (input) {
        const text = li.textContent?.trim() ?? '';
        li.className = 'ray-task-item';
        li.innerHTML = '';
        li.appendChild(TaskListFeature.buildCheckboxSpan(checked));
        li.appendChild(document.createTextNode(text));
        return;
      }

      // Clean format (bare li with text only)
      const text = li.textContent?.trim() ?? '';
      li.className = 'ray-task-item';
      li.innerHTML = '';
      li.appendChild(TaskListFeature.buildCheckboxSpan(checked));
      li.appendChild(document.createTextNode(text));
    });
  }

  private static buildCheckboxSpan(checked: boolean): HTMLSpanElement {
    const checkbox = document.createElement('span');
    checkbox.className = 'ray-task-checkbox';
    checkbox.setAttribute('contenteditable', 'false');
    checkbox.setAttribute('role', 'checkbox');
    checkbox.setAttribute('aria-checked', String(checked));
    checkbox.setAttribute('aria-label', 'Task status');
    if (checked) checkbox.classList.add('checked');
    return checkbox;
  }

  /** Return the text node that follows the checkbox span (the canonical content node). */
  private getTextNode(li: HTMLLIElement): Text | null {
    const span = li.querySelector('.ray-task-checkbox');
    if (span) {
      let node: ChildNode | null = span.nextSibling;
      while (node) {
        if (node.nodeType === Node.TEXT_NODE) return node as Text;
        node = node.nextSibling;
      }
      return null;
    }
    for (const node of Array.from(li.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) return node as Text;
    }
    return null;
  }

  /**
   * If the browser allowed text/nodes to slip before the checkbox span
   * (e.g. cursor was at li[offset=0] and user typed), move them to after the span.
   * Called at the start of every keydown handler to guarantee structure before splits.
   */
  private normalizeTaskItem(li: HTMLLIElement): void {
    const span = li.querySelector('.ray-task-checkbox');
    if (!span) return;
    const misplaced: ChildNode[] = [];
    let node: ChildNode | null = li.firstChild;
    while (node && node !== span) {
      misplaced.push(node);
      node = node.nextSibling;
    }
    if (misplaced.length === 0) return;
    // Move each misplaced node to immediately after the span (preserves Range objects)
    const afterSpan = span.nextSibling;
    for (const n of misplaced) {
      li.removeChild(n);
      li.insertBefore(n, afterSpan);
    }
  }

  /**
   * Intercept click on the checkbox span: toggle checked state,
   * sync data-checked / aria-checked / .checked class.
   */
  private bindClickHandler(): void {
    this.editorArea.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('ray-task-checkbox')) return;

      const li = target.closest<HTMLElement>('.ray-task-item');
      if (!li) return;

      const nowChecked = li.getAttribute('data-checked') !== 'true';
      li.setAttribute('data-checked', String(nowChecked));
      target.setAttribute('aria-checked', String(nowChecked));
      target.classList.toggle('checked', nowChecked);
      li.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
}

/**
 * Serialize task list items for getContent() output.
 * Removes the checkbox span; text node stays → clean <li data-checked>text</li>.
 */
export function serializeTaskLists(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.ray-task-item').forEach(li => {
    const checkbox = li.querySelector('.ray-task-checkbox');
    const checked = li.getAttribute('data-checked') ?? 'false';
    checkbox?.remove();
    const text = li.textContent ?? '';
    li.textContent = text;
    li.setAttribute('data-checked', checked);
    li.removeAttribute('class');
  });
}
