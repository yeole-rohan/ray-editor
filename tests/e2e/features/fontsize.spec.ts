import { test, expect } from '../fixtures/editor.fixture';

async function openFontSizePicker(editorPage: any) {
  await editorPage.clickBtn('fontSize');
  await editorPage.settle();
  return editorPage.page.locator('.ray-fontsize-picker');
}

test.describe('Font size picker — open/close', () => {
  test('fontSize button opens the picker', async ({ editorPage }) => {
    await editorPage.editor.click();
    const picker = await openFontSizePicker(editorPage);
    await expect(picker).toBeVisible();
  });

  test('clicking outside closes the picker', async ({ editorPage }) => {
    await editorPage.editor.click();
    await openFontSizePicker(editorPage);
    // Click somewhere outside
    await editorPage.page.mouse.click(10, 10);
    await editorPage.settle();
    const picker = editorPage.page.locator('.ray-fontsize-picker');
    await expect(picker).not.toBeVisible();
  });

  test('clicking fontSize button again closes the picker', async ({ editorPage }) => {
    await editorPage.editor.click();
    await openFontSizePicker(editorPage);
    await editorPage.clickBtn('fontSize'); // second click
    await editorPage.settle();
    const picker = editorPage.page.locator('.ray-fontsize-picker');
    await expect(picker).not.toBeVisible();
  });

  test('picker shows preset sizes', async ({ editorPage }) => {
    await editorPage.editor.click();
    const picker = await openFontSizePicker(editorPage);
    const items = picker.locator('.ray-fontsize-item');
    expect(await items.count()).toBeGreaterThanOrEqual(10);
  });

  test('picker has custom size input', async ({ editorPage }) => {
    await editorPage.editor.click();
    const picker = await openFontSizePicker(editorPage);
    const input = picker.locator('.ray-fontsize-input');
    await expect(input).toBeVisible();
  });
});

test.describe('Font size — applying', () => {
  test('selecting a preset applies font-size to selected text', async ({ editorPage }) => {
    const { type, selectAll } = editorPage;
    await type('resize me');
    await selectAll();
    const picker = await openFontSizePicker(editorPage);
    const size24 = picker.locator('.ray-fontsize-item').filter({ hasText: '24' }).first();
    await size24.click();
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toContain('24px');
  });

  test('custom size input applies the entered size', async ({ editorPage }) => {
    const { type, selectAll, page } = editorPage;
    await type('custom size');
    await selectAll();
    const picker = await openFontSizePicker(editorPage);
    const input = picker.locator('.ray-fontsize-input');
    await input.fill('42');
    await input.press('Enter');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toContain('42px');
  });

  test('Default button removes font-size from selection', async ({ editorPage }) => {
    const { type, selectAll } = editorPage;
    await type('will be default');
    await selectAll();
    // Apply a size first
    const picker = await openFontSizePicker(editorPage);
    await picker.locator('.ray-fontsize-item').filter({ hasText: '24' }).first().click();
    await editorPage.settle();
    // Now remove it
    await selectAll();
    const picker2 = await openFontSizePicker(editorPage);
    const defaultBtn = picker2.locator('.ray-fontsize-item-default');
    await defaultBtn.click();
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).not.toContain('24px');
  });

  test('applying font size pushes to undo history', async ({ editorPage }) => {
    const { type, selectAll, page } = editorPage;
    await type('undo size');
    await selectAll();
    const picker = await openFontSizePicker(editorPage);
    await picker.locator('.ray-fontsize-item').filter({ hasText: '32' }).first().click();
    await editorPage.settle();
    await page.keyboard.press('Control+z');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).not.toContain('32px');
  });

  test('custom size below minimum (6) is ignored', async ({ editorPage }) => {
    const { type, selectAll } = editorPage;
    await type('too small');
    await selectAll();
    const picker = await openFontSizePicker(editorPage);
    const input = picker.locator('.ray-fontsize-input');
    await input.fill('2'); // below min 6
    await input.press('Enter');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).not.toContain('2px');
  });

  test('custom size above maximum (200) is ignored', async ({ editorPage }) => {
    const { type, selectAll } = editorPage;
    await type('too large');
    await selectAll();
    const picker = await openFontSizePicker(editorPage);
    const input = picker.locator('.ray-fontsize-input');
    await input.fill('999'); // above max 200
    await input.press('Enter');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).not.toContain('999px');
  });
});

test.describe('Font size — hover preview', () => {
  test('hovering a size shows a live preview in the editor', async ({ editorPage }) => {
    const { type, selectAll } = editorPage;
    await type('preview this');
    await selectAll();
    const picker = await openFontSizePicker(editorPage);
    const size48 = picker.locator('.ray-fontsize-item').filter({ hasText: '48' }).first();
    await size48.hover();
    await editorPage.settle();
    // Preview span should exist in editor
    const preview = editorPage.editor.locator('[data-ray-preview]');
    await expect(preview).toBeVisible();
  });

  test('moving mouse away removes the preview', async ({ editorPage }) => {
    const { type, selectAll } = editorPage;
    await type('no preview');
    await selectAll();
    const picker = await openFontSizePicker(editorPage);
    const size48 = picker.locator('.ray-fontsize-item').filter({ hasText: '48' }).first();
    await size48.hover();
    await editorPage.settle();
    // Move away to the picker container (not another size)
    await picker.hover({ position: { x: 2, y: 2 } });
    await editorPage.settle();
    const preview = editorPage.editor.locator('[data-ray-preview]');
    await expect(preview).not.toBeVisible();
  });
});
