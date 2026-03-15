/**
 * Task / to-do list feature.
 *
 * Uses custom span-based checkboxes instead of <input type="checkbox"> because
 * native inputs inside contenteditable are unreliable across browsers and get
 * stripped by sanitizers. The span approach gives full control over click
 * behaviour and serialization.
 *
 * DOM structure (inside editor):
 *   <ul class="ray-task-list">
 *     <li class="ray-task-item" data-checked="false">
 *       <span class="ray-task-checkbox" contenteditable="false"
 *             role="checkbox" aria-checked="false" aria-label="Task status"></span>
 *       <span class="ray-task-text"> </span>
 *     </li>
 *   </ul>
 *
 * getContent() output (clean HTML — data-checked preserved, no editor classes):
 *   <ul class="ray-task-list">
 *     <li data-checked="false">task text</li>
 *   </ul>
 *
 * setContent() / paste normalizer: bare <li data-checked> → full span structure.
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

    const spacer = document.createElement('p');
    spacer.innerHTML = '<br>';

    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();

      const frag = document.createDocumentFragment();
      frag.appendChild(ul);
      frag.appendChild(spacer);
      range.insertNode(frag);

      // Place cursor inside the task text span
      const textSpan = item.querySelector<HTMLElement>('.ray-task-text');
      if (textSpan) {
        const newRange = document.createRange();
        newRange.setStart(textSpan, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    } else {
      this.editorArea.appendChild(ul);
      this.editorArea.appendChild(spacer);
    }
  }

  /** Build a single task list item DOM element */
  buildTaskItem(checked: boolean, text: string): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'ray-task-item';
    li.setAttribute('data-checked', String(checked));

    const checkbox = document.createElement('span');
    checkbox.className = 'ray-task-checkbox';
    checkbox.contentEditable = 'false';
    checkbox.setAttribute('role', 'checkbox');
    checkbox.setAttribute('aria-checked', String(checked));
    checkbox.setAttribute('aria-label', 'Task status');
    if (checked) checkbox.classList.add('checked');

    const textSpan = document.createElement('span');
    textSpan.className = 'ray-task-text';
    textSpan.textContent = text || '';

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    return li;
  }

  /**
   * Rebuild task list items from clean getContent() HTML (bare li[data-checked]).
   * Call this in setContent() after parsing external HTML.
   */
  static restoreFromHTML(container: HTMLElement): void {
    container.querySelectorAll<HTMLLIElement>('ul.ray-task-list li, ol.ray-task-list li').forEach(li => {
      // Already has span structure → skip
      if (li.querySelector('.ray-task-checkbox')) return;

      const checked = li.getAttribute('data-checked') === 'true';
      const text = li.textContent?.trim() ?? '';

      li.className = 'ray-task-item';

      const checkbox = document.createElement('span');
      checkbox.className = 'ray-task-checkbox';
      checkbox.contentEditable = 'false';
      checkbox.setAttribute('role', 'checkbox');
      checkbox.setAttribute('aria-checked', String(checked));
      checkbox.setAttribute('aria-label', 'Task status');
      if (checked) checkbox.classList.add('checked');

      const textSpan = document.createElement('span');
      textSpan.className = 'ray-task-text';
      textSpan.textContent = text;

      li.innerHTML = '';
      li.appendChild(checkbox);
      li.appendChild(textSpan);
    });
  }

  private bindClickHandler(): void {
    this.editorArea.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('ray-task-checkbox')) return;

      const li = target.closest<HTMLElement>('.ray-task-item');
      if (!li) return;

      const isChecked = li.getAttribute('data-checked') === 'true';
      const nowChecked = !isChecked;

      li.setAttribute('data-checked', String(nowChecked));
      target.setAttribute('aria-checked', String(nowChecked));
      target.classList.toggle('checked', nowChecked);

      // Fire content:change so history and onChange fire
      li.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
}

/**
 * Serialize task list items for getContent() output.
 * Strips the span structure, preserves data-checked, outputs clean text.
 */
export function serializeTaskLists(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.ray-task-item').forEach(li => {
    const checkbox = li.querySelector('.ray-task-checkbox');
    const textSpan = li.querySelector('.ray-task-text');
    const checked = li.getAttribute('data-checked') ?? 'false';
    const text = textSpan?.textContent ?? li.textContent ?? '';

    checkbox?.remove();
    textSpan?.remove();

    li.textContent = text;
    li.setAttribute('data-checked', checked);
    li.removeAttribute('class'); // strip ray-task-item class for clean output
  });
}
