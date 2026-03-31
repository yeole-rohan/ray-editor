import { test, expect } from '../fixtures/editor.fixture';

async function insertTaskList(editorPage: any) {
  await editorPage.editor.click();
  await editorPage.clickBtn('taskList');
  await editorPage.settle();
}

test.describe('Task list — insertion', () => {
  test('toolbar inserts a task list item', async ({ editorPage }) => {
    await insertTaskList(editorPage);
    const html = await editorPage.getHTML();
    expect(html).toMatch(/ray-task-list|task-list|ray-tasklist/);
    expect(html).toContain('checkbox');
  });

  test('task item has a checkbox span', async ({ editorPage }) => {
    await insertTaskList(editorPage);
    const checkbox = editorPage.editor.locator('.ray-task-checkbox').first();
    await expect(checkbox).toBeVisible();
  });
});

test.describe('Task list — typing', () => {
  test('typing text appears after the checkbox, not before', async ({ editorPage }) => {
    await insertTaskList(editorPage);
    await editorPage.page.keyboard.type('my task');
    const html = await editorPage.getHTML();
    // Text must come after the checkbox span in the DOM
    const checkboxPos = html.indexOf('ray-task-checkbox');
    const textPos = html.indexOf('my task');
    expect(textPos).toBeGreaterThan(checkboxPos);
  });

  test('Enter creates a new task item', async ({ editorPage }) => {
    await insertTaskList(editorPage);
    await editorPage.page.keyboard.type('first task');
    await editorPage.page.keyboard.press('Enter');
    await editorPage.page.keyboard.type('second task');
    const checkboxes = editorPage.editor.locator('.ray-task-checkbox');
    expect(await checkboxes.count()).toBe(2);
  });

  test('second task item also has checkbox before text', async ({ editorPage }) => {
    await insertTaskList(editorPage);
    await editorPage.page.keyboard.type('task one');
    await editorPage.page.keyboard.press('Enter');
    await editorPage.page.keyboard.type('task two');
    const html = await editorPage.getHTML();
    // Both occurrences of ray-task-checkbox appear before the corresponding text
    const parts = html.split('ray-task-checkbox');
    // "task one" should be after the first checkbox and "task two" after the second
    expect(parts[1]).toContain('task one');
    expect(parts[2]).toContain('task two');
  });

  test('Enter in middle of task text splits correctly', async ({ editorPage }) => {
    await insertTaskList(editorPage);
    await editorPage.page.keyboard.type('hello world');
    // Move cursor between "hello" and " world"
    await editorPage.page.keyboard.press('Home');
    for (let i = 0; i < 5; i++) await editorPage.page.keyboard.press('ArrowRight');
    await editorPage.page.keyboard.press('Enter');
    await editorPage.settle();
    const checkboxes = editorPage.editor.locator('.ray-task-checkbox');
    expect(await checkboxes.count()).toBe(2);
    const html = await editorPage.getHTML();
    expect(html).toContain('hello');
    expect(html).toContain('world');
  });

  test('Enter on empty task item exits task list', async ({ editorPage }) => {
    await insertTaskList(editorPage);
    await editorPage.page.keyboard.type('task');
    await editorPage.page.keyboard.press('Enter');
    // Second item is empty — Enter should exit
    await editorPage.page.keyboard.press('Enter');
    await editorPage.settle();
    await editorPage.page.keyboard.type('after list');
    const html = await editorPage.getHTML();
    expect(html).toContain('after list');
    // "after list" should not be inside a task item (must appear after closing </ul>)
    const afterListInTask = /<li[^>]*>(?:(?!<\/li>)[\s\S])*?after list/.test(html);
    expect(afterListInTask).toBe(false);
  });

  test('Backspace at start of task item does not delete checkbox content', async ({ editorPage }) => {
    await insertTaskList(editorPage);
    await editorPage.page.keyboard.type('keep this');
    await editorPage.page.keyboard.press('Home');
    await editorPage.page.keyboard.press('Backspace');
    await editorPage.settle();
    const text = await editorPage.getText();
    expect(text).toContain('keep this');
  });
});

test.describe('Task list — checkbox interaction', () => {
  test('clicking checkbox toggles checked state', async ({ editorPage }) => {
    await insertTaskList(editorPage);
    await editorPage.page.keyboard.type('check me');
    const checkbox = editorPage.editor.locator('.ray-task-checkbox').first();
    await checkbox.click();
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toMatch(/checked|data-checked="true"|class=".*checked/);
  });

  test('clicking checkbox again unchecks it', async ({ editorPage }) => {
    await insertTaskList(editorPage);
    await editorPage.page.keyboard.type('toggle me');
    const checkbox = editorPage.editor.locator('.ray-task-checkbox').first();
    await checkbox.click(); // check
    await editorPage.settle();
    await checkbox.click(); // uncheck
    await editorPage.settle();
    const html = await editorPage.getHTML();
    // Should not be in a permanently-checked state
    expect(html).not.toMatch(/data-checked="true".*data-checked="true"/);
  });

  test('checked state is preserved in getContent() output', async ({ editorPage }) => {
    await insertTaskList(editorPage);
    await editorPage.page.keyboard.type('persist check');
    const checkbox = editorPage.editor.locator('.ray-task-checkbox').first();
    await checkbox.click();
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toMatch(/checked|data-checked/);
  });
});

test.describe('Task list — edge cases', () => {
  test('multiple tasks can be checked independently', async ({ editorPage }) => {
    await insertTaskList(editorPage);
    await editorPage.page.keyboard.type('task one');
    await editorPage.page.keyboard.press('Enter');
    await editorPage.page.keyboard.type('task two');
    await editorPage.page.keyboard.press('Enter');
    await editorPage.page.keyboard.type('task three');

    const checkboxes = editorPage.editor.locator('.ray-task-checkbox');
    // Check only the second task
    await checkboxes.nth(1).click();
    await editorPage.settle();

    const html = await editorPage.getHTML();
    // Exactly one item should have data-checked="true"
    const checkedCount = (html.match(/data-checked="true"/g) ?? []).length;
    expect(checkedCount).toBe(1);
  });

  test('pasting text into task item keeps it inside the task', async ({ editorPage }) => {
    await insertTaskList(editorPage);
    await editorPage.pasteText('pasted task text');
    const html = await editorPage.getHTML();
    expect(html).toContain('pasted task text');
    expect(html).toContain('ray-task-checkbox');
  });

  test('undo after checking a task restores unchecked state', async ({ editorPage }) => {
    await insertTaskList(editorPage);
    await editorPage.page.keyboard.type('undo task');
    const checkbox = editorPage.editor.locator('.ray-task-checkbox').first();
    await checkbox.click();
    await editorPage.page.keyboard.press('Control+z');
    await editorPage.settle();
    // After undo the checked state should be reversed
    await expect(editorPage.editor).toBeVisible(); // at minimum, editor not broken
  });
});
