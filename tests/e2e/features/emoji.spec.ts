import { test, expect } from '../fixtures/editor.fixture';

test.describe('Emoji picker — open/close', () => {
  test('emoji button opens the picker', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('emoji');
    await editorPage.settle();
    const picker = editorPage.page.locator('.ray-emoji-picker');
    await expect(picker).toBeVisible();
  });

  test('Escape closes the picker', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('emoji');
    await editorPage.page.keyboard.press('Escape');
    await editorPage.settle();
    await expect(editorPage.page.locator('.ray-emoji-picker')).not.toBeVisible();
  });

  test('clicking outside closes the picker', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('emoji');
    await editorPage.settle();
    await editorPage.page.mouse.click(10, 10);
    await editorPage.settle();
    await expect(editorPage.page.locator('.ray-emoji-picker')).not.toBeVisible();
  });
});

test.describe('Emoji picker — search', () => {
  test('search shows matching emojis', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('emoji');
    await editorPage.settle();
    const searchInput = editorPage.page.locator('.ray-emoji-search');
    await searchInput.fill('smile');
    await editorPage.settle();
    const buttons = editorPage.page.locator('.ray-emoji-picker button[title]');
    expect(await buttons.count()).toBeGreaterThan(0);
  });

  test('search with no results shows "No results"', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('emoji');
    await editorPage.settle();
    const searchInput = editorPage.page.locator('.ray-emoji-search');
    await searchInput.fill('zzznomatch999');
    await editorPage.settle();
    const noResults = editorPage.page.locator('.ray-emoji-no-results');
    await expect(noResults).toBeVisible();
  });

  test('clearing search restores all emojis', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('emoji');
    await editorPage.settle();
    const searchInput = editorPage.page.locator('.ray-emoji-search');
    await searchInput.fill('smile');
    await editorPage.settle();
    await searchInput.fill('');
    await editorPage.settle();
    const buttons = editorPage.page.locator('.ray-emoji-picker button[title]');
    expect(await buttons.count()).toBeGreaterThan(10);
  });
});

test.describe('Emoji picker — insertion', () => {
  test('clicking an emoji inserts it into editor', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.page.keyboard.type('I am ');
    await editorPage.clickBtn('emoji');
    await editorPage.settle();
    // Click any emoji
    const firstEmoji = editorPage.page.locator('.ray-emoji-picker button[title]').first();
    const emojiChar = await firstEmoji.textContent();
    await firstEmoji.click();
    await editorPage.settle();
    const text = await editorPage.getText();
    expect(text).toContain('I am');
    expect(text.length).toBeGreaterThan('I am '.length); // emoji was inserted
  });

  test('emoji inserts at cursor position, not at end', async ({ editorPage }) => {
    const { page, editor } = editorPage;
    await editorPage.type('ab');
    // Move cursor between a and b
    await editor.click();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight'); // cursor after 'a'
    await editorPage.clickBtn('emoji');
    await editorPage.settle();
    const firstEmoji = editorPage.page.locator('.ray-emoji-picker button[title]').first();
    await firstEmoji.click();
    await editorPage.settle();
    const text = await editorPage.getText();
    // Emoji should be between a and b
    expect(text).toMatch(/a.b/u); // emoji may be multi-code-unit, use unicode flag
  });

  test('emoji in heading renders correctly', async ({ editorPage }) => {
    const { page, editor, clickBtn } = editorPage;
    await editor.click();
    // Use headings dropdown (select element) to set h2
    const headingsSelect = editorPage.page.locator('.ray-dropdown-headings');
    if (await headingsSelect.isVisible({ timeout: 500 }).catch(() => false)) {
      await headingsSelect.selectOption('<h2>');
    }
    await clickBtn('emoji');
    await editorPage.settle();
    await editorPage.page.locator('.ray-emoji-picker button[title]').first().click();
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toContain('<h2');
  });

  test('picker closes after inserting an emoji', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('emoji');
    await editorPage.settle();
    await editorPage.page.locator('.ray-emoji-picker button[title]').first().click();
    await editorPage.settle();
    const picker = editorPage.page.locator('.ray-emoji-picker');
    await expect(picker).not.toBeVisible();
  });
});
