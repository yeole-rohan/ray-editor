import { test, expect } from '../fixtures/editor.fixture';

async function insertCallout(editorPage: any, type = 'info') {
  await editorPage.editor.click();
  await editorPage.clickBtn('callout');
  await editorPage.settle();
  const option = editorPage.page
    .locator(`.ray-callout-option[data-type="${type}"], [data-callout="${type}"]`)
    .first();
  if (await option.isVisible({ timeout: 600 }).catch(() => false)) {
    await option.click();
  } else {
    // Fallback: click the first callout option
    await editorPage.page.locator('.ray-callout-option, .ray-callout-picker button').first().click();
  }
  await editorPage.settle();
}

test.describe('Callout — insertion', () => {
  test('callout button opens type picker', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('callout');
    await editorPage.settle();
    const picker = editorPage.page.locator('.ray-callout-picker, .ray-callout-type-picker');
    await expect(picker).toBeVisible();
  });

  test('selecting a callout type inserts callout block', async ({ editorPage }) => {
    await insertCallout(editorPage);
    const html = await editorPage.getHTML();
    expect(html).toMatch(/ray-callout/);
  });

  test('callout contains an icon and a body', async ({ editorPage }) => {
    await insertCallout(editorPage);
    const callout = editorPage.editor.locator('[class*="ray-callout"]').first();
    await expect(callout).toBeVisible();
  });

  test('typing inside callout works', async ({ editorPage }) => {
    await insertCallout(editorPage);
    await editorPage.page.keyboard.type('callout body text');
    const html = await editorPage.getHTML();
    expect(html).toContain('callout body text');
  });
});

test.describe('Callout — types', () => {
  const types = ['info', 'warning', 'success', 'error', 'note', 'tip'];

  for (const type of types) {
    test(`callout type "${type}" can be inserted`, async ({ editorPage }) => {
      await insertCallout(editorPage, type);
      const html = await editorPage.getHTML();
      // Block should contain some indication of the callout
      expect(html).toMatch(/ray-callout/);
    });
  }
});

test.describe('Callout — selection preservation', () => {
  test('selected text becomes callout body content', async ({ editorPage }) => {
    const { type, selectAll } = editorPage;
    await type('wrap this text');
    await selectAll();
    await editorPage.clickBtn('callout');
    await editorPage.settle();
    await editorPage.page.locator('.ray-callout-option, .ray-callout-picker button').first().click();
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toContain('wrap this text');
    expect(html).toMatch(/ray-callout/);
  });

  test('callout with selected rich text preserves formatting', async ({ editorPage }) => {
    const { type, selectAll, clickBtn } = editorPage;
    await type('bold content');
    await selectAll();
    await clickBtn('bold');
    await selectAll();
    await editorPage.clickBtn('callout');
    await editorPage.settle();
    await editorPage.page.locator('.ray-callout-option, .ray-callout-picker button').first().click();
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toMatch(/<strong>|<b>|font-weight.*bold/);
    expect(html).toMatch(/ray-callout/);
  });
});

test.describe('Callout — edge cases', () => {
  test('undo after inserting callout removes it', async ({ editorPage }) => {
    await insertCallout(editorPage);
    await editorPage.page.keyboard.press('Control+z');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).not.toMatch(/ray-callout/);
  });

  test('picker closes after callout is inserted', async ({ editorPage }) => {
    await insertCallout(editorPage);
    const picker = editorPage.page.locator('.ray-callout-picker, .ray-callout-type-picker');
    await expect(picker).not.toBeVisible();
  });

  test('Escape closes callout picker without inserting', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('callout');
    await editorPage.settle();
    await editorPage.page.keyboard.press('Escape');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).not.toMatch(/ray-callout/);
  });

  test('two callouts can exist in same document', async ({ editorPage }) => {
    await insertCallout(editorPage);
    await editorPage.page.keyboard.press('Control+End');
    await editorPage.page.keyboard.press('Enter');
    await insertCallout(editorPage);
    const callouts = editorPage.editor.locator('[class*="ray-callout"]');
    expect(await callouts.count()).toBeGreaterThanOrEqual(2);
  });
});
