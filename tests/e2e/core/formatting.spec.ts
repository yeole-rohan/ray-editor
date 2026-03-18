import { test, expect } from '../fixtures/editor.fixture';

test.describe('Text formatting', () => {
  test.beforeEach(async ({ editorPage }) => {
    // Type some text and select it all before each formatting test
    await editorPage.type('Format this text');
    await editorPage.selectAll();
  });

  test('bold button wraps selection in <strong> or <b>', async ({ editorPage }) => {
    const { clickBtn, getHTML } = editorPage;
    await clickBtn('bold');
    const html = await getHTML();
    expect(html).toMatch(/<strong>|<b>|font-weight.*bold/i);
  });

  test('italic button wraps selection in <em> or <i>', async ({ editorPage }) => {
    const { clickBtn, getHTML } = editorPage;
    await clickBtn('italic');
    const html = await getHTML();
    expect(html).toMatch(/<em>|<i>/i);
  });

  test('underline button wraps selection in <u>', async ({ editorPage }) => {
    const { clickBtn, getHTML } = editorPage;
    await clickBtn('underline');
    const html = await getHTML();
    expect(html).toMatch(/<u>/i);
  });

  test('strikethrough button wraps selection in <s>', async ({ editorPage }) => {
    const { clickBtn, getHTML } = editorPage;
    await clickBtn('strikethrough');
    const html = await getHTML();
    expect(html).toMatch(/<s>|<strike>|text-decoration.*line-through/i);
  });

  test('bold keyboard shortcut Ctrl+B works', async ({ editorPage }) => {
    const { page, getHTML } = editorPage;
    await page.keyboard.press('Control+b');
    const html = await getHTML();
    expect(html).toMatch(/<strong>|<b>|font-weight.*bold/i);
  });

  test('italic keyboard shortcut Ctrl+I works', async ({ editorPage }) => {
    const { page, getHTML } = editorPage;
    await page.keyboard.press('Control+i');
    const html = await getHTML();
    expect(html).toMatch(/<em>|<i>/i);
  });

  test('toggling bold twice removes formatting', async ({ editorPage }) => {
    const { clickBtn, getHTML, editor } = editorPage;
    await clickBtn('bold');
    // Re-select after formatting (browser may deselect)
    await editorPage.selectAll();
    await clickBtn('bold');
    const html = await getHTML();
    // <strong> should be removed on second click
    expect(html).not.toContain('<strong>');
  });

  test('heading 2 toolbar dropdown wraps content in h2', async ({ editorPage }) => {
    const { editor, getHTML } = editorPage;
    // Headings is a <select> dropdown (.ray-dropdown-headings)
    await editor.click();
    await editorPage.clear();
    await editorPage.type('Heading content');
    await editorPage.selectAll();
    const headingSelect = editorPage.page.locator('.ray-dropdown-headings');
    await headingSelect.selectOption('<h2>');
    await editorPage.settle();
    const html = await getHTML();
    expect(html).toMatch(/<h2/);
  });

  test('remove format clears bold/italic', async ({ editorPage }) => {
    const { clickBtn, getHTML, editor } = editorPage;
    await clickBtn('bold');
    await editorPage.selectAll();
    await clickBtn('removeFormat');
    const html = await getHTML();
    expect(html).not.toContain('<strong>');
  });
});
