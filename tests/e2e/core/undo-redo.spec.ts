import { test, expect } from '../fixtures/editor.fixture';

test.describe('Undo / Redo', () => {
  test('Ctrl+Z undoes typed text', async ({ editorPage }) => {
    const { type, page, getText } = editorPage;
    await type('Hello world ');
    await page.keyboard.press('Control+z');
    const text = await getText();
    // After undo, "world" or the last word boundary should be gone
    expect(text.length).toBeLessThan('Hello world '.length);
  });

  test('Ctrl+Y redoes after undo', async ({ editorPage }) => {
    const { type, page, getText } = editorPage;
    await type('Hello world ');
    const beforeUndo = await getText();
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+y');
    const afterRedo = await getText();
    expect(afterRedo).toBe(beforeUndo);
  });

  test('undo removes bold formatting', async ({ editorPage }) => {
    const { type, page, clickBtn, selectAll, getHTML } = editorPage;
    await type('Bold me ');
    await selectAll();
    await clickBtn('bold');
    const boldHTML = await getHTML();
    // Editor may produce <b> or <strong> depending on execCommand implementation
    expect(boldHTML).toMatch(/<strong>|<b>/);

    await page.keyboard.press('Control+z');
    await editorPage.settle();
    const afterUndo = await getHTML();
    expect(afterUndo).not.toMatch(/<strong>|<b>/);
  });

  test('undo after inserting a table removes the table', async ({ editorPage }) => {
    const { clickBtn, page, getHTML } = editorPage;
    await editorPage.editor.click();
    // Type a word + Space so keyup(Space) pushes a history entry.
    // This gives dispatchCommand('table') something non-duplicate to push against,
    // ensuring Ctrl+Z has a prior state to restore.
    await page.keyboard.type('x ');
    await editorPage.settle();

    await clickBtn('table');
    const cell = editorPage.page.locator('.ray-table-picker-cell').nth(4);
    if (await cell.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cell.click();
    }
    await editorPage.settle();

    const withTable = await getHTML();
    expect(withTable).toContain('<table');

    await page.keyboard.press('Control+z');
    await editorPage.settle();

    const afterUndo = await getHTML();
    expect(afterUndo).not.toContain('<table');
  });

  test('undo restores table column resize handles after redo', async ({ editorPage }) => {
    const { clickBtn, page, editor } = editorPage;
    await editor.click();

    // Insert table
    await clickBtn('table');
    const cell = editorPage.page.locator('.ray-table-picker-cell').nth(4);
    if (await cell.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cell.click();
    }
    await editorPage.settle();

    // Undo then redo
    await page.keyboard.press('Control+z');
    await editorPage.settle();
    await page.keyboard.press('Control+y');
    await editorPage.settle();

    // After redo, table wrapper should be re-wired (applyStructure called)
    const wrapper = editorPage.page.locator('.ray-table-wrapper');
    await expect(wrapper).toBeVisible();
  });

  test('multiple undos roll back multiple steps', async ({ editorPage }) => {
    const { type, page, getText } = editorPage;
    await type('step one ');
    await type('step two ');
    await type('step three ');

    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+z');

    const text = await getText();
    expect(text).toContain('step one');
    expect(text).not.toContain('step three');
  });

  test('new edit after undo clears redo stack', async ({ editorPage }) => {
    const { type, page, getText } = editorPage;
    await type('original ');
    await page.keyboard.press('Control+z');
    await type('new content ');
    // Redo should have nothing to restore
    await page.keyboard.press('Control+y');
    const text = await getText();
    expect(text).toContain('new content');
  });
});
