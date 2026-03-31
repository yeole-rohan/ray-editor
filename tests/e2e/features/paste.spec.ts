import { test, expect } from '../fixtures/editor.fixture';

// ─── Word 2019 ───────────────────────────────────────────────────────────────

test.describe('Paste from Word 2019', () => {
  test('pastes without throwing an error', async ({ editorPage }) => {
    await expect(editorPage.pasteFixture('word-2019')).resolves.not.toThrow();
  });

  test('preserves heading structure', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('word-2019');
    const html = await getHTML();
    expect(html).toMatch(/<h1[^>]*>.*Project Report.*<\/h1>/s);
    expect(html).toMatch(/<h2[^>]*>/);
  });

  test('strips MSO namespace elements (o:p, w:*, xml)', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('word-2019');
    const html = await getHTML();
    expect(html).not.toContain('o:p');
    expect(html).not.toContain('w:');
    expect(html).not.toContain('<xml');
  });

  test('strips MSO CSS classes and mso- inline styles', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('word-2019');
    const html = await getHTML();
    expect(html).not.toContain('MsoNormal');
    expect(html).not.toContain('mso-');
  });

  test('preserves bold and italic text', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('word-2019');
    const html = await getHTML();
    expect(html).toMatch(/<strong>|font-weight.*bold/i);
    expect(html).toMatch(/<em>|font-style.*italic/i);
  });

  test('preserves table structure', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('word-2019');
    const html = await getHTML();
    expect(html).toContain('<table');
    expect(html).toContain('<td');
    expect(html).toContain('Task');
    expect(html).toContain('Alice');
  });

  test('strips <style> blocks from Word HTML', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('word-2019');
    const html = await getHTML();
    expect(html).not.toContain('<style');
    expect(html).not.toContain('@font-face');
  });

  test('content is editable after Word paste', async ({ editorPage }) => {
    const { pasteFixture, page } = editorPage;
    await pasteFixture('word-2019');
    // Place cursor at end and type
    await editorPage.editor.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type(' appended');
    const text = await editorPage.getText();
    expect(text).toContain('appended');
  });
});

// ─── Google Docs ─────────────────────────────────────────────────────────────

test.describe('Paste from Google Docs', () => {
  test('pastes without throwing an error', async ({ editorPage }) => {
    await expect(editorPage.pasteFixture('google-docs')).resolves.not.toThrow();
  });

  test('unwraps docs-internal-guid wrapper', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('google-docs');
    const html = await getHTML();
    expect(html).not.toContain('docs-internal-guid');
  });

  test('preserves heading hierarchy', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('google-docs');
    const html = await getHTML();
    expect(html).toMatch(/<h1[^>]*>.*Project Overview.*<\/h1>/s);
    expect(html).toMatch(/<h2[^>]*>.*Background.*<\/h2>/s);
  });

  test('promotes bold spans to <strong>', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('google-docs');
    const html = await getHTML();
    expect(html).toMatch(/<strong[\s>]/);
  });

  test('promotes italic spans to <em>', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('google-docs');
    const html = await getHTML();
    expect(html).toMatch(/<em[\s>]/);
  });

  test('strips layout-only inline styles (margin, padding, line-height)', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('google-docs');
    const html = await getHTML();
    expect(html).not.toContain('margin-top');
    expect(html).not.toContain('line-height');
    expect(html).not.toContain('padding-inline-start');
  });

  test('preserves allowed inline styles (color, font-size)', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('google-docs');
    const html = await getHTML();
    // Color and font-size from Google Docs should survive if meaningful
    expect(html).toMatch(/color:|font-size:/);
  });

  test('preserves list structure', async ({ editorPage }) => {
    const { pasteFixture, editor } = editorPage;
    await pasteFixture('google-docs');
    const listItems = editor.locator('li');
    await expect(listItems.first()).toBeVisible();
    expect(await listItems.count()).toBeGreaterThanOrEqual(3);
  });
});

// ─── Notion ──────────────────────────────────────────────────────────────────

test.describe('Paste from Notion', () => {
  test('preserves heading and paragraph structure', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('notion');
    const html = await getHTML();
    expect(html).toContain('<h1');
    expect(html).toContain('Getting Started');
  });

  test('preserves inline code', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('notion');
    const html = await getHTML();
    expect(html).toContain('<code>');
  });

  test('preserves links with href', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('notion');
    const html = await getHTML();
    expect(html).toContain('<a');
    expect(html).toContain('href=');
    expect(html).toContain('rohanyeole.com');
  });

  test('preserves list items', async ({ editorPage }) => {
    const { pasteFixture, editor } = editorPage;
    await pasteFixture('notion');
    const items = editor.locator('li');
    expect(await items.count()).toBeGreaterThanOrEqual(3);
  });
});
