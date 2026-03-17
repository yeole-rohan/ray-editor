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
    it('creates an <li> with class ray-task-item', () => {
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

    it('creates a .ray-task-checkbox span', () => {
      const li = feature.buildTaskItem(false, 'Buy milk');
      const checkbox = li.querySelector('.ray-task-checkbox');
      expect(checkbox).not.toBeNull();
      expect(checkbox?.tagName).toBe('SPAN');
    });

    it('checkbox span has contentEditable="false"', () => {
      const li = feature.buildTaskItem(false, 'Task');
      const checkbox = li.querySelector<HTMLElement>('.ray-task-checkbox')!;
      expect(checkbox.getAttribute('contenteditable')).toBe('false');
    });

    it('checkbox span has aria-label="Task status"', () => {
      const li = feature.buildTaskItem(false, 'Task');
      const checkbox = li.querySelector<HTMLElement>('.ray-task-checkbox')!;
      expect(checkbox.getAttribute('aria-label')).toBe('Task status');
    });

    it('checkbox span has role="checkbox"', () => {
      const li = feature.buildTaskItem(false, 'Task');
      const checkbox = li.querySelector<HTMLElement>('.ray-task-checkbox')!;
      expect(checkbox.getAttribute('role')).toBe('checkbox');
    });

    it('unchecked item: aria-checked is "false"', () => {
      const li = feature.buildTaskItem(false, 'Task');
      const checkbox = li.querySelector<HTMLElement>('.ray-task-checkbox')!;
      expect(checkbox.getAttribute('aria-checked')).toBe('false');
    });

    it('checked item: aria-checked is "true"', () => {
      const li = feature.buildTaskItem(true, 'Done item');
      const checkbox = li.querySelector<HTMLElement>('.ray-task-checkbox')!;
      expect(checkbox.getAttribute('aria-checked')).toBe('true');
    });

    it('checked item: checkbox span has .checked class', () => {
      const li = feature.buildTaskItem(true, 'Done item');
      const checkbox = li.querySelector<HTMLElement>('.ray-task-checkbox')!;
      expect(checkbox.classList.contains('checked')).toBe(true);
    });

    it('unchecked item: checkbox span does not have .checked class', () => {
      const li = feature.buildTaskItem(false, 'Buy milk');
      const checkbox = li.querySelector<HTMLElement>('.ray-task-checkbox')!;
      expect(checkbox.classList.contains('checked')).toBe(false);
    });

    it('task text is a text node (no .ray-task-text span)', () => {
      const li = feature.buildTaskItem(false, 'Buy milk');
      expect(li.querySelector('.ray-task-text')).toBeNull();
      const textNode = Array.from(li.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
      expect(textNode).not.toBeUndefined();
      expect(textNode?.textContent).toBe('Buy milk');
    });

    it('li.textContent equals the task text', () => {
      const li = feature.buildTaskItem(false, 'Buy milk');
      // span has no text content, so li.textContent === task text
      expect(li.textContent).toBe('Buy milk');
    });

    it('li has exactly one element child (the span)', () => {
      const li = feature.buildTaskItem(false, 'Task');
      expect(li.children.length).toBe(1);
      expect(li.children[0].classList.contains('ray-task-checkbox')).toBe(true);
    });

    it('span comes before the text node', () => {
      const li = feature.buildTaskItem(false, 'Task');
      expect((li.childNodes[0] as HTMLElement).classList?.contains('ray-task-checkbox')).toBe(true);
      expect(li.childNodes[1].nodeType).toBe(Node.TEXT_NODE);
    });

    it('empty text creates valid structure', () => {
      const li = feature.buildTaskItem(false, '');
      expect(li.querySelector('.ray-task-checkbox')).not.toBeNull();
      const textNode = Array.from(li.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
      expect(textNode?.textContent).toBe('');
    });

    it('does not create a native input[type="checkbox"]', () => {
      const li = feature.buildTaskItem(false, 'Task');
      expect(li.querySelector('input[type="checkbox"]')).toBeNull();
    });
  });

  // ─── TaskListFeature.restoreFromHTML ──────────────────────────────────────

  describe('TaskListFeature.restoreFromHTML', () => {
    it('rebuilds span + text node from bare li[data-checked="false"]', () => {
      const container = document.createElement('div');
      container.innerHTML = `<ul class="ray-task-list"><li data-checked="false">Buy milk</li></ul>`;
      TaskListFeature.restoreFromHTML(container);
      const li = container.querySelector('li')!;
      expect(li.classList.contains('ray-task-item')).toBe(true);
      expect(li.querySelector('.ray-task-checkbox')).not.toBeNull();
      const textNode = Array.from(li.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
      expect(textNode?.textContent).toBe('Buy milk');
    });

    it('sets aria-checked="false" for unchecked item', () => {
      const container = document.createElement('div');
      container.innerHTML = `<ul class="ray-task-list"><li data-checked="false">Task</li></ul>`;
      TaskListFeature.restoreFromHTML(container);
      const checkbox = container.querySelector<HTMLElement>('.ray-task-checkbox')!;
      expect(checkbox.getAttribute('aria-checked')).toBe('false');
    });

    it('sets aria-checked="true" and .checked class for checked item', () => {
      const container = document.createElement('div');
      container.innerHTML = `<ul class="ray-task-list"><li data-checked="true">Done</li></ul>`;
      TaskListFeature.restoreFromHTML(container);
      const checkbox = container.querySelector<HTMLElement>('.ray-task-checkbox')!;
      expect(checkbox.getAttribute('aria-checked')).toBe('true');
      expect(checkbox.classList.contains('checked')).toBe(true);
    });

    it('preserves task text as a text node', () => {
      const container = document.createElement('div');
      container.innerHTML = `<ul class="ray-task-list"><li data-checked="false">Buy milk</li></ul>`;
      TaskListFeature.restoreFromHTML(container);
      const li = container.querySelector('li')!;
      const textNode = Array.from(li.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
      expect(textNode?.textContent).toBe('Buy milk');
    });

    it('does nothing to empty container', () => {
      const container = document.createElement('div');
      expect(() => TaskListFeature.restoreFromHTML(container)).not.toThrow();
    });

    it('ignores <li> not inside .ray-task-list', () => {
      const container = document.createElement('div');
      container.innerHTML = `<ul><li>Regular</li></ul>`;
      TaskListFeature.restoreFromHTML(container);
      expect(container.querySelector('.ray-task-checkbox')).toBeNull();
    });

    it('does not double-restore items already having span', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false">
            <span class="ray-task-checkbox" contenteditable="false" role="checkbox" aria-checked="false" aria-label="Task status"></span>
            Already restored
          </li>
        </ul>`;
      TaskListFeature.restoreFromHTML(container);
      expect(container.querySelectorAll('.ray-task-checkbox').length).toBe(1);
    });

    it('handles multiple task items', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li data-checked="false">Task one</li>
          <li data-checked="true">Task two</li>
          <li data-checked="false">Task three</li>
        </ul>`;
      TaskListFeature.restoreFromHTML(container);
      const checkboxes = container.querySelectorAll<HTMLElement>('.ray-task-checkbox');
      expect(checkboxes.length).toBe(3);
      expect(checkboxes[1].getAttribute('aria-checked')).toBe('true');
      expect(checkboxes[0].getAttribute('aria-checked')).toBe('false');
    });

    it('restores from ol.ray-task-list as well', () => {
      const container = document.createElement('div');
      container.innerHTML = `<ol class="ray-task-list"><li data-checked="false">Task</li></ol>`;
      TaskListFeature.restoreFromHTML(container);
      expect(container.querySelector('.ray-task-checkbox')).not.toBeNull();
    });

    it('migrates old span+text-span format to new span+text-node format', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false">
            <span class="ray-task-checkbox" contenteditable="false"></span>
            <span class="ray-task-text">Old format text</span>
          </li>
        </ul>`;
      TaskListFeature.restoreFromHTML(container);
      const li = container.querySelector('li')!;
      expect(li.querySelector('.ray-task-text')).toBeNull();
      expect(li.querySelector('.ray-task-checkbox')).not.toBeNull();
      const textNode = Array.from(li.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
      expect(textNode?.textContent).toBe('Old format text');
    });

    it('migrates native input format to span format', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="true">
            <input type="checkbox" checked>Done task</li>
        </ul>`;
      TaskListFeature.restoreFromHTML(container);
      const li = container.querySelector('li')!;
      expect(li.querySelector('input[type="checkbox"]')).toBeNull();
      expect(li.querySelector('.ray-task-checkbox')).not.toBeNull();
      const checkbox = li.querySelector<HTMLElement>('.ray-task-checkbox')!;
      expect(checkbox.getAttribute('aria-checked')).toBe('true');
    });
  });

  // ─── serializeTaskLists ───────────────────────────────────────────────────

  describe('serializeTaskLists', () => {
    it('removes checkbox span and preserves task text', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false">
            <span class="ray-task-checkbox" contenteditable="false"></span>Buy milk</li>
        </ul>`;
      serializeTaskLists(container);
      const li = container.querySelector('li')!;
      expect(li.querySelector('.ray-task-checkbox')).toBeNull();
      expect(li.textContent?.trim()).toBe('Buy milk');
      expect(li.getAttribute('data-checked')).toBe('false');
    });

    it('removes ray-task-item class from serialized li', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false">
            <span class="ray-task-checkbox" contenteditable="false"></span>Task</li>
        </ul>`;
      serializeTaskLists(container);
      expect(container.querySelector('li')?.hasAttribute('class')).toBe(false);
    });

    it('preserves data-checked="true" for checked items', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="true">
            <span class="ray-task-checkbox checked" contenteditable="false"></span>Done</li>
        </ul>`;
      serializeTaskLists(container);
      expect(container.querySelector('li')?.getAttribute('data-checked')).toBe('true');
    });

    it('serializes multiple tasks correctly', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false"><span class="ray-task-checkbox" contenteditable="false"></span>Task one</li>
          <li class="ray-task-item" data-checked="true"><span class="ray-task-checkbox checked" contenteditable="false"></span>Task two</li>
        </ul>`;
      serializeTaskLists(container);
      const items = container.querySelectorAll('li');
      expect(items[0].textContent?.trim()).toBe('Task one');
      expect(items[0].getAttribute('data-checked')).toBe('false');
      expect(items[1].textContent?.trim()).toBe('Task two');
      expect(items[1].getAttribute('data-checked')).toBe('true');
    });

    it('does nothing when no .ray-task-item elements present', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>Normal</p><ul><li>Item</li></ul>';
      const original = container.innerHTML;
      serializeTaskLists(container);
      expect(container.innerHTML).toBe(original);
    });

    it('removes all .ray-task-checkbox spans after serialization', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false"><span class="ray-task-checkbox" contenteditable="false"></span>Task</li>
        </ul>`;
      serializeTaskLists(container);
      expect(container.querySelectorAll('.ray-task-checkbox').length).toBe(0);
    });
  });

  // ─── Round-trip ───────────────────────────────────────────────────────────

  describe('Round-trip: buildTaskItem → serializeTaskLists → restoreFromHTML', () => {
    it('round-trips unchecked item correctly', () => {
      const li = feature.buildTaskItem(false, 'Buy groceries');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      const container = document.createElement('div');
      container.appendChild(ul);

      serializeTaskLists(container);
      expect(container.querySelector('li')?.textContent?.trim()).toBe('Buy groceries');
      expect(container.querySelector('li')?.getAttribute('data-checked')).toBe('false');

      TaskListFeature.restoreFromHTML(container);
      const restoredLi = container.querySelector('li')!;
      expect(restoredLi.classList.contains('ray-task-item')).toBe(true);
      expect(restoredLi.querySelector('.ray-task-checkbox')).not.toBeNull();
      const textNode = Array.from(restoredLi.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
      expect(textNode?.textContent).toBe('Buy groceries');
    });

    it('round-trips checked item correctly', () => {
      const li = feature.buildTaskItem(true, 'Completed');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      const container = document.createElement('div');
      container.appendChild(ul);

      serializeTaskLists(container);
      TaskListFeature.restoreFromHTML(container);

      const checkbox = container.querySelector<HTMLElement>('.ray-task-checkbox')!;
      expect(checkbox.getAttribute('aria-checked')).toBe('true');
      expect(checkbox.classList.contains('checked')).toBe(true);
      expect(container.querySelector('li')?.getAttribute('data-checked')).toBe('true');
    });
  });

  // ─── Checkbox toggle (click handler) ──────────────────────────────────────

  describe('Checkbox toggle via click', () => {
    function fireClick(target: HTMLElement): void {
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }

    it('toggles unchecked to checked on click', () => {
      const li = feature.buildTaskItem(false, 'Toggle me');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      const checkbox = li.querySelector<HTMLElement>('.ray-task-checkbox')!;
      fireClick(checkbox);

      expect(checkbox.getAttribute('aria-checked')).toBe('true');
      expect(checkbox.classList.contains('checked')).toBe(true);
      expect(li.getAttribute('data-checked')).toBe('true');
    });

    it('toggles checked to unchecked on click', () => {
      const li = feature.buildTaskItem(true, 'Already done');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      const checkbox = li.querySelector<HTMLElement>('.ray-task-checkbox')!;
      fireClick(checkbox);

      expect(checkbox.getAttribute('aria-checked')).toBe('false');
      expect(checkbox.classList.contains('checked')).toBe(false);
      expect(li.getAttribute('data-checked')).toBe('false');
    });

    it('fires input event on toggle', () => {
      let fired = false;
      editorArea.addEventListener('input', () => { fired = true; });

      const li = feature.buildTaskItem(false, 'Task');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      fireClick(li.querySelector('.ray-task-checkbox')!);
      expect(fired).toBe(true);
    });

    it('does not toggle when click is on the text (not checkbox span)', () => {
      const li = feature.buildTaskItem(false, 'Task');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      fireClick(li); // fires on li, not the checkbox span
      const checkbox = li.querySelector<HTMLElement>('.ray-task-checkbox')!;
      expect(checkbox.getAttribute('aria-checked')).toBe('false');
    });
  });

  // ─── handleKeydown ────────────────────────────────────────────────────────

  describe('handleKeydown', () => {
    function makeKeyEvent(key: string): KeyboardEvent {
      return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    }

    function setSelectionInTextNode(li: HTMLLIElement, offset = 0): void {
      const textNode = Array.from(li.childNodes).find(n => n.nodeType === Node.TEXT_NODE) as Text;
      const r = document.createRange();
      r.setStart(textNode ?? li, offset);
      r.collapse(true);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(r);
    }

    it('Enter on empty item removes it and inserts <p>', () => {
      const li = feature.buildTaskItem(false, '');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      setSelectionInTextNode(li, 0);
      const e = makeKeyEvent('Enter');
      feature.handleKeydown(e);

      expect(e.defaultPrevented).toBe(true);
      expect(editorArea.querySelector('.ray-task-item')).toBeNull();
      expect(editorArea.querySelector('p')).not.toBeNull();
    });

    it('Enter on empty item replaces empty list with <p>', () => {
      const li = feature.buildTaskItem(false, '');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      setSelectionInTextNode(li, 0);
      feature.handleKeydown(makeKeyEvent('Enter'));

      expect(editorArea.querySelector('.ray-task-list')).toBeNull();
      expect(editorArea.querySelector('p')).not.toBeNull();
    });

    it('Enter on non-empty item creates a new task item', () => {
      const li = feature.buildTaskItem(false, 'Buy milk');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      setSelectionInTextNode(li, 8);
      feature.handleKeydown(makeKeyEvent('Enter'));

      expect(editorArea.querySelectorAll('.ray-task-item').length).toBe(2);
    });

    it('Enter splits text at cursor', () => {
      const li = feature.buildTaskItem(false, 'BuyMilk');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      setSelectionInTextNode(li, 3);
      feature.handleKeydown(makeKeyEvent('Enter'));

      const items = editorArea.querySelectorAll('.ray-task-item');
      expect(items[0].textContent).toBe('Buy');
      expect(items[1].textContent).toBe('Milk');
    });

    it('new item from Enter is unchecked', () => {
      const li = feature.buildTaskItem(true, 'Done');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      setSelectionInTextNode(li, 4);
      feature.handleKeydown(makeKeyEvent('Enter'));

      const newItem = editorArea.querySelectorAll('.ray-task-item')[1];
      expect(newItem.getAttribute('data-checked')).toBe('false');
      const newCheckbox = newItem.querySelector<HTMLElement>('.ray-task-checkbox')!;
      expect(newCheckbox.getAttribute('aria-checked')).toBe('false');
      expect(newCheckbox.classList.contains('checked')).toBe(false);
    });

    it('Backspace at start removes item and creates <p> with text', () => {
      const li = feature.buildTaskItem(false, 'Hello');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      setSelectionInTextNode(li, 0);
      const e = makeKeyEvent('Backspace');
      feature.handleKeydown(e);

      expect(e.defaultPrevented).toBe(true);
      expect(editorArea.querySelector('.ray-task-item')).toBeNull();
      expect(editorArea.querySelector('p')?.textContent).toBe('Hello');
    });

    it('Backspace at start replaces empty list with <p>', () => {
      const li = feature.buildTaskItem(false, '');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      setSelectionInTextNode(li, 0);
      feature.handleKeydown(makeKeyEvent('Backspace'));

      expect(editorArea.querySelector('.ray-task-list')).toBeNull();
    });

    it('Backspace mid-text does not intercept', () => {
      const li = feature.buildTaskItem(false, 'Hello');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      setSelectionInTextNode(li, 3);
      const e = makeKeyEvent('Backspace');
      feature.handleKeydown(e);

      expect(e.defaultPrevented).toBe(false);
    });

    it('non-Enter/Backspace keys are ignored', () => {
      const li = feature.buildTaskItem(false, 'Task');
      const ul = document.createElement('ul');
      ul.className = 'ray-task-list';
      ul.appendChild(li);
      editorArea.appendChild(ul);

      setSelectionInTextNode(li, 0);
      const e = makeKeyEvent('ArrowDown');
      feature.handleKeydown(e);
      expect(e.defaultPrevented).toBe(false);
    });

    it('Enter outside a task item does nothing', () => {
      const p = document.createElement('p');
      p.textContent = 'Normal';
      editorArea.appendChild(p);

      const r = document.createRange();
      r.setStart(p.firstChild!, 0);
      r.collapse(true);
      window.getSelection()!.removeAllRanges();
      window.getSelection()!.addRange(r);

      const e = makeKeyEvent('Enter');
      feature.handleKeydown(e);
      expect(e.defaultPrevented).toBe(false);
    });
  });
});
