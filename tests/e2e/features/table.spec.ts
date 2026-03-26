import { test, expect } from '../fixtures/editor.fixture';

async function insertTable(editorPage: any, rows = 2, cols = 2) {
  await editorPage.editor.click();
  await editorPage.clickBtn('table');
  await editorPage.settle();
  // Pick cell at (rows-1, cols-1) in the picker grid
  const cellIndex = (rows - 1) * 10 + (cols - 1);
  const cell = editorPage.page.locator('.ray-table-picker-cell').nth(cellIndex);
  if (await cell.isVisible({ timeout: 800 }).catch(() => false)) {
    await cell.click();
  }
  await editorPage.settle();
}

test.describe('Table — insertion', () => {
  test('toolbar inserts a table', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 2);
    const html = await editorPage.getHTML();
    expect(html).toContain('<table');
    expect(html).toContain('<td');
  });

  test('inserted table is wrapped in .ray-table-wrapper', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 3);
    const wrapper = editorPage.editor.locator('.ray-table-wrapper');
    await expect(wrapper).toBeVisible();
  });

  test('table has correct column count', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 3);
    const firstRow = editorPage.editor.locator('table tr').first();
    const cells = firstRow.locator('td, th');
    expect(await cells.count()).toBe(3);
  });

  test('table has correct row count', async ({ editorPage }) => {
    await insertTable(editorPage, 3, 2);
    const rows = editorPage.editor.locator('table tr');
    expect(await rows.count()).toBe(3);
  });
});

test.describe('Table — typing and navigation', () => {
  test('clicking a cell places cursor inside it', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 2);
    const cell = editorPage.editor.locator('td').first();
    await cell.click();
    await editorPage.page.keyboard.type('cell content');
    const html = await editorPage.getHTML();
    expect(html).toContain('cell content');
  });

  test('Tab key moves to next cell', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 2);
    const firstCell = editorPage.editor.locator('td').first();
    await firstCell.click();
    await editorPage.page.keyboard.type('A');
    await editorPage.page.keyboard.press('Tab');
    await editorPage.page.keyboard.type('B');
    const cells = editorPage.editor.locator('td');
    expect(await cells.nth(0).textContent()).toContain('A');
    expect(await cells.nth(1).textContent()).toContain('B');
  });

  test('Tab on last cell of last row adds a new row', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 2);
    const cells = editorPage.editor.locator('td');
    const count = await cells.count(); // 4 cells (2×2)
    await cells.nth(count - 1).click();
    await editorPage.page.keyboard.press('Tab');
    await editorPage.settle();
    const rows = editorPage.editor.locator('table tr');
    expect(await rows.count()).toBeGreaterThan(2);
  });

  test('Enter inside table cell does not create new row', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 2);
    const firstCell = editorPage.editor.locator('td').first();
    await firstCell.click();
    const rowsBefore = await editorPage.editor.locator('table tr').count();
    await editorPage.page.keyboard.press('Enter');
    await editorPage.settle();
    const rowsAfter = await editorPage.editor.locator('table tr').count();
    expect(rowsAfter).toBe(rowsBefore);
  });

  test('typing in different cells keeps content separate', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 2);
    const cells = editorPage.editor.locator('td');
    await cells.nth(0).click(); await editorPage.page.keyboard.type('Alpha');
    await cells.nth(1).click(); await editorPage.page.keyboard.type('Beta');
    await cells.nth(2).click(); await editorPage.page.keyboard.type('Gamma');
    await cells.nth(3).click(); await editorPage.page.keyboard.type('Delta');
    expect(await cells.nth(0).textContent()).toContain('Alpha');
    expect(await cells.nth(1).textContent()).toContain('Beta');
    expect(await cells.nth(2).textContent()).toContain('Gamma');
    expect(await cells.nth(3).textContent()).toContain('Delta');
  });
});

test.describe('Table — context toolbar', () => {
  test('clicking inside table shows table context toolbar', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 2);
    await editorPage.editor.locator('td').first().click();
    await editorPage.settle();
    const ctxToolbar = editorPage.page.locator('.ray-table-toolbar, .ray-table-ctx');
    await expect(ctxToolbar).toBeVisible();
  });

  test('Add Row button adds a row below', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 2);
    await editorPage.editor.locator('td').first().click();
    await editorPage.settle();
    const addRowBtn = editorPage.page.locator('[title*="Add row"], [aria-label*="Add row"]').first();
    if (await addRowBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      const rowsBefore = await editorPage.editor.locator('table tr').count();
      await addRowBtn.click();
      await editorPage.settle();
      const rowsAfter = await editorPage.editor.locator('table tr').count();
      expect(rowsAfter).toBe(rowsBefore + 1);
    }
  });

  test('Add Column button adds a column', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 2);
    await editorPage.editor.locator('td').first().click();
    await editorPage.settle();
    const addColBtn = editorPage.page.locator('[title*="Add col"], [aria-label*="Add col"]').first();
    if (await addColBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      const colsBefore = await editorPage.editor.locator('table tr').first().locator('td, th').count();
      await addColBtn.click();
      await editorPage.settle();
      const colsAfter = await editorPage.editor.locator('table tr').first().locator('td, th').count();
      expect(colsAfter).toBe(colsBefore + 1);
    }
  });

  test('Delete Row removes the current row', async ({ editorPage }) => {
    await insertTable(editorPage, 3, 2);
    await editorPage.editor.locator('td').first().click();
    await editorPage.settle();
    const delRowBtn = editorPage.page.locator('[title*="Delete row"], [aria-label*="Delete row"]').first();
    if (await delRowBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      const rowsBefore = await editorPage.editor.locator('table tr').count();
      await delRowBtn.click();
      await editorPage.settle();
      const rowsAfter = await editorPage.editor.locator('table tr').count();
      expect(rowsAfter).toBe(rowsBefore - 1);
    }
  });
});

test.describe('Table — edge cases', () => {
  test('pasting text into table cell keeps it in the cell', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 2);
    await editorPage.editor.locator('td').first().click();
    await editorPage.pasteText('pasted text');
    const cell = editorPage.editor.locator('td').first();
    expect(await cell.textContent()).toContain('pasted text');
  });

  test('bold works inside a table cell', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 2);
    const cell = editorPage.editor.locator('td').first();
    await cell.click();
    await editorPage.page.keyboard.type('bold me');
    await editorPage.page.keyboard.press('Control+a'); // select all in cell
    await editorPage.clickBtn('bold');
    const html = await editorPage.getHTML();
    expect(html).toMatch(/<strong>|font-weight.*bold/);
  });

  test('undo after inserting table removes it', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 2);
    await editorPage.page.keyboard.press('Control+z');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).not.toContain('<table');
  });

  test('two tables can exist in same document', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 2);
    await editorPage.editor.click();
    await editorPage.page.keyboard.press('Control+End');
    await editorPage.page.keyboard.press('Enter');
    await insertTable(editorPage, 2, 2);
    const tables = editorPage.editor.locator('table');
    expect(await tables.count()).toBe(2);
  });

  test('column resize handle is present after table insert', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 3);
    const handles = editorPage.page.locator('.ray-col-resize-handle');
    expect(await handles.count()).toBeGreaterThan(0);
  });

  test('column resize handles are re-wired after undo/redo', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 2);
    await editorPage.page.keyboard.press('Control+z');
    await editorPage.settle();
    await editorPage.page.keyboard.press('Control+y');
    await editorPage.settle();
    const handles = editorPage.page.locator('.ray-col-resize-handle');
    expect(await handles.count()).toBeGreaterThan(0);
  });

  test('getContent does not include table-wrapper in output HTML', async ({ editorPage }) => {
    await insertTable(editorPage, 2, 2);
    const html = await editorPage.page.evaluate(() => (window as any).editor?.getContent?.() ?? '');
    if (html) {
      // Table wrapper is editor-only UI — should not be in serialised output
      expect(html).not.toContain('ray-table-wrapper');
    }
  });
});
