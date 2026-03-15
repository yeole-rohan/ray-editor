import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskListFeature, serializeTaskLists } from '../../src/features/tasklist';

describe('TaskListFeature', () => {
  let editorArea: HTMLElement;
  let feature: TaskListFeature;

  beforeEach(() => {
    document.body.innerHTML = '';
    editorArea = document.createElement('div');
    editorArea.className = 'ray-editor-content';
    editorArea.contentEditable = 'true';
    document.body.appendChild(editorArea);
    feature = new TaskListFeature(editorArea);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ─── buildTaskItem ────────────────────────────────────────────────────────

  describe('buildTaskItem', () => {
    it('creates an <li> element with class ray-task-item', () => {
      const li = feature.buildTaskItem(false, 'Buy milk');
      expect(li.tagName).toBe('LI');
      expect(li.classList.contains('ray-task-item')).toBe(true);
    });

    it('sets data-checked="false" for unchecked item', () => {
      const li = feature.buildTaskItem(false, 'Buy milk');
      expect(li.getAttribute('data-checked')).toBe('false');
    });

    it('sets data-checked="true" for checked item', () => {
      const li = feature.buildTaskItem(true, 'Done item');
      expect(li.getAttribute('data-checked')).toBe('true');
    });

    it('creates .ray-task-checkbox span', () => {
      const li = feature.buildTaskItem(false, 'Buy milk');
      const checkbox = li.querySelector('.ray-task-checkbox');
      expect(checkbox).not.toBeNull();
      expect(checkbox?.tagName).toBe('SPAN');
    });

    it('checkbox has contenteditable="false"', () => {
      const li = feature.buildTaskItem(false, 'Task');
      const checkbox = li.querySelector('.ray-task-checkbox') as HTMLElement;
      expect(checkbox.contentEditable).toBe('false');
    });

    it('checkbox has role="checkbox"', () => {
      const li = feature.buildTaskItem(false, 'Task');
      const checkbox = li.querySelector('.ray-task-checkbox');
      expect(checkbox?.getAttribute('role')).toBe('checkbox');
    });

    it('unchecked item: checkbox aria-checked="false"', () => {
      const li = feature.buildTaskItem(false, 'Task');
      const checkbox = li.querySelector('.ray-task-checkbox');
      expect(checkbox?.getAttribute('aria-checked')).toBe('false');
    });

    it('checked item: checkbox aria-checked="true"', () => {
      const li = feature.buildTaskItem(true, 'Done item');
      const checkbox = li.querySelector('.ray-task-checkbox');
      expect(checkbox?.getAttribute('aria-checked')).toBe('true');
    });

    it('checked item: checkbox has .checked class', () => {
      const li = feature.buildTaskItem(true, 'Done item');
      const checkbox = li.querySelector('.ray-task-checkbox');
      expect(checkbox?.classList.contains('checked')).toBe(true);
    });

    it('unchecked item: checkbox does NOT have .checked class', () => {
      const li = feature.buildTaskItem(false, 'Pending task');
      const checkbox = li.querySelector('.ray-task-checkbox');
      expect(checkbox?.classList.contains('checked')).toBe(false);
    });

    it('checkbox has aria-label="Task status"', () => {
      const li = feature.buildTaskItem(false, 'Task');
      const checkbox = li.querySelector('.ray-task-checkbox');
      expect(checkbox?.getAttribute('aria-label')).toBe('Task status');
    });

    it('creates .ray-task-text span with correct text', () => {
      const li = feature.buildTaskItem(false, 'Buy milk');
      const textSpan = li.querySelector('.ray-task-text');
      expect(textSpan).not.toBeNull();
      expect(textSpan?.textContent).toBe('Buy milk');
    });

    it('creates .ray-task-text span for checked item with correct text', () => {
      const li = feature.buildTaskItem(true, 'Done item');
      const textSpan = li.querySelector('.ray-task-text');
      expect(textSpan?.textContent).toBe('Done item');
    });

    it('empty text still creates valid structure', () => {
      const li = feature.buildTaskItem(false, '');
      expect(li.classList.contains('ray-task-item')).toBe(true);
      const checkbox = li.querySelector('.ray-task-checkbox');
      const textSpan = li.querySelector('.ray-task-text');
      expect(checkbox).not.toBeNull();
      expect(textSpan).not.toBeNull();
      expect(textSpan?.textContent).toBe('');
    });

    it('li contains exactly two child spans', () => {
      const li = feature.buildTaskItem(false, 'Task');
      expect(li.children.length).toBe(2);
    });

    it('checkbox span comes before text span', () => {
      const li = feature.buildTaskItem(false, 'Task');
      expect(li.children[0].classList.contains('ray-task-checkbox')).toBe(true);
      expect(li.children[1].classList.contains('ray-task-text')).toBe(true);
    });
  });

  // ─── TaskListFeature.restoreFromHTML ──────────────────────────────────────

  describe('TaskListFeature.restoreFromHTML', () => {
    it('rebuilds span structure from bare li[data-checked="false"] inside ul.ray-task-list', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li data-checked="false">Buy milk</li>
        </ul>
      `;
      TaskListFeature.restoreFromHTML(container);
      const li = container.querySelector('li');
      expect(li?.classList.contains('ray-task-item')).toBe(true);
      expect(li?.querySelector('.ray-task-checkbox')).not.toBeNull();
      expect(li?.querySelector('.ray-task-text')).not.toBeNull();
    });

    it('sets aria-checked="false" for unchecked item', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li data-checked="false">Task</li>
        </ul>
      `;
      TaskListFeature.restoreFromHTML(container);
      const checkbox = container.querySelector('.ray-task-checkbox');
      expect(checkbox?.getAttribute('aria-checked')).toBe('false');
    });

    it('sets aria-checked="true" and .checked class for checked item', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li data-checked="true">Done task</li>
        </ul>
      `;
      TaskListFeature.restoreFromHTML(container);
      const checkbox = container.querySelector('.ray-task-checkbox');
      expect(checkbox?.getAttribute('aria-checked')).toBe('true');
      expect(checkbox?.classList.contains('checked')).toBe(true);
    });

    it('preserves task text in .ray-task-text span', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li data-checked="false">Buy milk</li>
        </ul>
      `;
      TaskListFeature.restoreFromHTML(container);
      const textSpan = container.querySelector('.ray-task-text');
      expect(textSpan?.textContent).toBe('Buy milk');
    });

    it('does nothing to empty container', () => {
      const container = document.createElement('div');
      container.innerHTML = '';
      expect(() => TaskListFeature.restoreFromHTML(container)).not.toThrow();
      expect(container.children.length).toBe(0);
    });

    it('ignores <li> without data-type="taskItem" that are not in ray-task-list', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul>
          <li>Regular list item</li>
        </ul>
      `;
      TaskListFeature.restoreFromHTML(container);
      const li = container.querySelector('li');
      expect(li?.querySelector('.ray-task-checkbox')).toBeNull();
    });

    it('ignores <li> that already have span structure (no double-restore)', () => {
      const container = document.createElement('div');
      // Pre-built with full span structure
      container.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false">
            <span class="ray-task-checkbox" contenteditable="false" role="checkbox" aria-checked="false" aria-label="Task status"></span>
            <span class="ray-task-text">Already restored</span>
          </li>
        </ul>
      `;
      TaskListFeature.restoreFromHTML(container);
      // Should not create duplicate checkboxes
      const checkboxes = container.querySelectorAll('.ray-task-checkbox');
      expect(checkboxes.length).toBe(1);
    });

    it('handles multiple task items correctly', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li data-checked="false">Task one</li>
          <li data-checked="true">Task two</li>
          <li data-checked="false">Task three</li>
        </ul>
      `;
      TaskListFeature.restoreFromHTML(container);
      const items = container.querySelectorAll('.ray-task-item');
      expect(items.length).toBe(3);
      const checkboxes = container.querySelectorAll('.ray-task-checkbox');
      expect(checkboxes.length).toBe(3);
      expect(checkboxes[1].getAttribute('aria-checked')).toBe('true');
      expect(checkboxes[1].classList.contains('checked')).toBe(true);
      expect(checkboxes[0].getAttribute('aria-checked')).toBe('false');
    });

    it('restores items from ol.ray-task-list as well', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ol class="ray-task-list">
          <li data-checked="false">Ordered task</li>
        </ol>
      `;
      TaskListFeature.restoreFromHTML(container);
      const checkbox = container.querySelector('.ray-task-checkbox');
      expect(checkbox).not.toBeNull();
    });

    it('sets contenteditable="false" on restored checkbox span', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li data-checked="false">Task</li>
        </ul>
      `;
      TaskListFeature.restoreFromHTML(container);
      const checkbox = container.querySelector('.ray-task-checkbox') as HTMLElement;
      expect(checkbox.contentEditable).toBe('false');
    });
  });

  // ─── serializeTaskLists ───────────────────────────────────────────────────

  describe('serializeTaskLists', () => {
    it('converts .ray-task-item span structure to clean li with data-checked', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false">
            <span class="ray-task-checkbox" contenteditable="false"></span>
            <span class="ray-task-text">Buy milk</span>
          </li>
        </ul>
      `;
      serializeTaskLists(container);
      const li = container.querySelector('li');
      expect(li?.querySelector('.ray-task-checkbox')).toBeNull();
      expect(li?.querySelector('.ray-task-text')).toBeNull();
      expect(li?.textContent?.trim()).toBe('Buy milk');
      expect(li?.getAttribute('data-checked')).toBe('false');
    });

    it('unchecked item → data-checked="false"', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false">
            <span class="ray-task-checkbox"></span>
            <span class="ray-task-text">Unchecked task</span>
          </li>
        </ul>
      `;
      serializeTaskLists(container);
      const li = container.querySelector('li');
      expect(li?.getAttribute('data-checked')).toBe('false');
    });

    it('checked item → data-checked="true"', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="true">
            <span class="ray-task-checkbox checked"></span>
            <span class="ray-task-text">Checked task</span>
          </li>
        </ul>
      `;
      serializeTaskLists(container);
      const li = container.querySelector('li');
      expect(li?.getAttribute('data-checked')).toBe('true');
    });

    it('removes ray-task-item class from serialized li', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false">
            <span class="ray-task-checkbox"></span>
            <span class="ray-task-text">Task</span>
          </li>
        </ul>
      `;
      serializeTaskLists(container);
      const li = container.querySelector('li');
      expect(li?.hasAttribute('class')).toBe(false);
    });

    it('does nothing when container has no .ray-task-item elements', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>Not a task list</p><ul><li>Regular item</li></ul>';
      const originalHTML = container.innerHTML;
      serializeTaskLists(container);
      expect(container.innerHTML).toBe(originalHTML);
    });

    it('preserves surrounding non-task-list content', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <p>Before content</p>
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false">
            <span class="ray-task-checkbox"></span>
            <span class="ray-task-text">Task</span>
          </li>
        </ul>
        <p>After content</p>
      `;
      serializeTaskLists(container);
      expect(container.textContent).toContain('Before content');
      expect(container.textContent).toContain('After content');
      expect(container.textContent).toContain('Task');
    });

    it('serializes multiple tasks correctly', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false">
            <span class="ray-task-checkbox"></span>
            <span class="ray-task-text">Task one</span>
          </li>
          <li class="ray-task-item" data-checked="true">
            <span class="ray-task-checkbox checked"></span>
            <span class="ray-task-text">Task two</span>
          </li>
        </ul>
      `;
      serializeTaskLists(container);
      const items = container.querySelectorAll('li');
      expect(items.length).toBe(2);
      expect(items[0].getAttribute('data-checked')).toBe('false');
      expect(items[0].textContent?.trim()).toBe('Task one');
      expect(items[1].getAttribute('data-checked')).toBe('true');
      expect(items[1].textContent?.trim()).toBe('Task two');
    });

    it('removes all internal span elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false">
            <span class="ray-task-checkbox"></span>
            <span class="ray-task-text">Task</span>
          </li>
        </ul>
      `;
      serializeTaskLists(container);
      expect(container.querySelectorAll('span').length).toBe(0);
    });
  });

  // ─── Round-trip test ──────────────────────────────────────────────────────

  describe('Round-trip: buildTaskItem → serializeTaskLists → restoreFromHTML', () => {
    it('produces equivalent structure after round-trip for unchecked item', () => {
      // Build
      const li = feature.buildTaskItem(false, 'Buy groceries');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      const container = document.createElement('div');
      container.appendChild(ul);

      // Serialize
      serializeTaskLists(container);
      const serializedLi = container.querySelector('li');
      expect(serializedLi?.textContent?.trim()).toBe('Buy groceries');
      expect(serializedLi?.getAttribute('data-checked')).toBe('false');

      // Restore
      TaskListFeature.restoreFromHTML(container);
      const restoredLi = container.querySelector('li');
      expect(restoredLi?.classList.contains('ray-task-item')).toBe(true);
      expect(restoredLi?.getAttribute('data-checked')).toBe('false');
      expect(restoredLi?.querySelector('.ray-task-checkbox')).not.toBeNull();
      expect(restoredLi?.querySelector('.ray-task-text')?.textContent).toBe('Buy groceries');
      expect(restoredLi?.querySelector('.ray-task-checkbox')?.getAttribute('aria-checked')).toBe('false');
    });

    it('produces equivalent structure after round-trip for checked item', () => {
      const li = feature.buildTaskItem(true, 'Completed task');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      const container = document.createElement('div');
      container.appendChild(ul);

      serializeTaskLists(container);
      const serializedLi = container.querySelector('li');
      expect(serializedLi?.getAttribute('data-checked')).toBe('true');
      expect(serializedLi?.textContent?.trim()).toBe('Completed task');

      TaskListFeature.restoreFromHTML(container);
      const restoredLi = container.querySelector('li');
      expect(restoredLi?.classList.contains('ray-task-item')).toBe(true);
      expect(restoredLi?.getAttribute('data-checked')).toBe('true');
      const checkbox = restoredLi?.querySelector('.ray-task-checkbox');
      expect(checkbox?.getAttribute('aria-checked')).toBe('true');
      expect(checkbox?.classList.contains('checked')).toBe(true);
      expect(restoredLi?.querySelector('.ray-task-text')?.textContent).toBe('Completed task');
    });
  });

  // ─── Click handler ────────────────────────────────────────────────────────

  describe('Click handler (toggle)', () => {
    it('toggles unchecked task to checked on checkbox click', () => {
      const li = feature.buildTaskItem(false, 'Toggle me');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      const checkbox = li.querySelector('.ray-task-checkbox') as HTMLElement;
      checkbox.click();

      expect(li.getAttribute('data-checked')).toBe('true');
      expect(checkbox.getAttribute('aria-checked')).toBe('true');
      expect(checkbox.classList.contains('checked')).toBe(true);
    });

    it('toggles checked task to unchecked on checkbox click', () => {
      const li = feature.buildTaskItem(true, 'Already done');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      const checkbox = li.querySelector('.ray-task-checkbox') as HTMLElement;
      checkbox.click();

      expect(li.getAttribute('data-checked')).toBe('false');
      expect(checkbox.getAttribute('aria-checked')).toBe('false');
      expect(checkbox.classList.contains('checked')).toBe(false);
    });

    it('fires input event on checkbox toggle', () => {
      let fired = false;
      editorArea.addEventListener('input', () => { fired = true; });

      const li = feature.buildTaskItem(false, 'Task');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      const checkbox = li.querySelector('.ray-task-checkbox') as HTMLElement;
      checkbox.click();

      expect(fired).toBe(true);
    });

    it('does not toggle when clicking outside checkbox', () => {
      const li = feature.buildTaskItem(false, 'Task');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      const textSpan = li.querySelector('.ray-task-text') as HTMLElement;
      textSpan.click();

      expect(li.getAttribute('data-checked')).toBe('false');
    });
  });
});
