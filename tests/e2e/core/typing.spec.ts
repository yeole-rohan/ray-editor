import { test, expect } from '../fixtures/editor.fixture';

test.describe('Basic typing', () => {
  test('types plain text into editor', async ({ editorPage }) => {
    const { type, getText } = editorPage;
    await type('Hello RayEditor');
    expect(await getText()).toContain('Hello RayEditor');
  });

  test('text appears inside a paragraph element', async ({ editorPage }) => {
    const { type, getHTML } = editorPage;
    await type('Paragraph text');
    const html = await getHTML();
    expect(html).toContain('<p>');
    expect(html).toContain('Paragraph text');
  });

  test('Enter key creates a new paragraph', async ({ editorPage }) => {
    const { type, page, getHTML } = editorPage;
    await type('First line');
    await page.keyboard.press('Enter');
    await type('Second line');
    const html = await getHTML();
    // Both lines present, separated by block structure
    expect(html).toContain('First line');
    expect(html).toContain('Second line');
    const pCount = (html.match(/<p/g) ?? []).length;
    expect(pCount).toBeGreaterThanOrEqual(2);
  });

  test('Backspace deletes last character', async ({ editorPage }) => {
    const { type, page, getText } = editorPage;
    await type('Hello');
    await page.keyboard.press('Backspace');
    const text = await getText();
    expect(text).toContain('Hell');
    expect(text).not.toContain('Hello');
  });

  test('typing special characters does not break editor', async ({ editorPage }) => {
    const { type, getText } = editorPage;
    await type('< > & " \' ');
    const text = await getText();
    expect(text).toContain('<');
    expect(text).toContain('>');
    expect(text).toContain('&');
  });

  test('pasting plain text inserts content', async ({ editorPage }) => {
    const { pasteText, getText } = editorPage;
    await pasteText('Pasted plain text content');
    expect(await getText()).toContain('Pasted plain text content');
  });

  test('multiple paragraphs preserve order', async ({ editorPage }) => {
    const { type, page, editor } = editorPage;
    // Use type() only for first call (which also clicks to focus).
    // Subsequent keyboard.type() calls don't re-click and reposition cursor.
    await type('Alpha');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Beta');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Gamma');

    const paragraphs = await editor.locator('p').allTextContents();
    const nonEmpty = paragraphs.filter(t => t.trim().length > 0);
    expect(nonEmpty[0]).toContain('Alpha');
    expect(nonEmpty[1]).toContain('Beta');
    expect(nonEmpty[2]).toContain('Gamma');
  });
});
