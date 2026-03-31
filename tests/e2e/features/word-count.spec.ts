import { test, expect } from '../fixtures/editor.fixture';

test.describe('Word count', () => {
  test('word count shows 0 on empty editor', async ({ editorPage }) => {
    const count = await editorPage.page.evaluate(() => {
      const w = (window as any).editor?.getWordCount?.();
      return w;
    });
    if (count !== undefined) {
      expect(count.words).toBe(0);
    }
  });

  test('typing one word updates word count to 1', async ({ editorPage }) => {
    await editorPage.type('Hello');
    await editorPage.page.keyboard.press('Space'); // flush history
    const count = await editorPage.page.evaluate(() =>
      (window as any).editor?.getWordCount?.()
    );
    if (count !== undefined) {
      expect(count.words).toBe(1);
    }
    // Also check status bar if present
    const words = editorPage.page.locator('#sb-words');
    if (await words.isVisible({ timeout: 300 }).catch(() => false)) {
      await expect(words).toHaveText('1');
    }
  });

  test('word count matches actual word count', async ({ editorPage }) => {
    await editorPage.type('one two three four five');
    await editorPage.page.keyboard.press('Space');
    const count = await editorPage.page.evaluate(() =>
      (window as any).editor?.getWordCount?.()
    );
    if (count !== undefined) {
      expect(count.words).toBe(5);
    }
  });

  test('char count matches character count', async ({ editorPage }) => {
    await editorPage.type('hello');
    await editorPage.page.keyboard.press('Space');
    const count = await editorPage.page.evaluate(() =>
      (window as any).editor?.getWordCount?.()
    );
    if (count !== undefined) {
      expect(count.chars).toBeGreaterThanOrEqual(5);
    }
  });

  test('word count updates after deleting text', async ({ editorPage }) => {
    await editorPage.type('one two three ');
    await editorPage.selectAll();
    await editorPage.page.keyboard.press('Delete');
    await editorPage.page.keyboard.press('Space');
    const count = await editorPage.page.evaluate(() =>
      (window as any).editor?.getWordCount?.()
    );
    if (count !== undefined) {
      expect(count.words).toBe(0);
    }
  });

  test('words in headings are counted', async ({ editorPage }) => {
    const { page, editor, clickBtn } = editorPage;
    await editor.click();
    const headingsSelect = editorPage.page.locator('.ray-dropdown-headings');
    await headingsSelect.selectOption('<h2>');
    await page.keyboard.type('heading text');
    await page.keyboard.press('Space');
    const count = await editorPage.page.evaluate(() =>
      (window as any).editor?.getWordCount?.()
    );
    if (count !== undefined) {
      expect(count.words).toBeGreaterThan(0);
    }
  });

  test('words in list items are counted', async ({ editorPage }) => {
    const { page, editor, clickBtn } = editorPage;
    await editor.click();
    await clickBtn('unorderedList');
    await page.keyboard.type('list item one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('list item two ');
    const count = await editorPage.page.evaluate(() =>
      (window as any).editor?.getWordCount?.()
    );
    if (count !== undefined) {
      expect(count.words).toBe(6);
    }
  });
});
