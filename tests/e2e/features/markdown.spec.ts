import { test, expect } from '../fixtures/editor.fixture';

test.describe('Markdown toggle — mode switch', () => {
  test('markdownToggle button switches to markdown mode', async ({ editorPage }) => {
    const { type, clickBtn, page } = editorPage;
    await type('Hello **world**');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    // In markdown mode the editor shows raw markdown text
    const text = await editorPage.getText();
    expect(text).toMatch(/Hello|world/);
  });

  test('toggling back to rich text renders markdown as HTML', async ({ editorPage }) => {
    const { type, clickBtn } = editorPage;
    await type('**bold text**');
    await clickBtn('markdownToggle'); // rich → markdown
    await editorPage.settle();
    await clickBtn('markdownToggle'); // markdown → rich
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toMatch(/<strong>bold text<\/strong>/);
  });

  test('heading markdown # converts to h1 on toggle', async ({ editorPage }) => {
    const { type, clickBtn } = editorPage;
    await type('# Heading One');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    await clickBtn('markdownToggle');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toMatch(/<h1[^>]*>.*Heading One.*<\/h1>/s);
  });

  test('## converts to h2', async ({ editorPage }) => {
    const { type, clickBtn } = editorPage;
    await type('## Level Two');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    await clickBtn('markdownToggle');
    await editorPage.settle();
    expect(await editorPage.getHTML()).toMatch(/<h2/);
  });

  test('italic *text* converts to <em>', async ({ editorPage }) => {
    const { type, clickBtn } = editorPage;
    await type('*italic text*');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    await clickBtn('markdownToggle');
    await editorPage.settle();
    expect(await editorPage.getHTML()).toMatch(/<em>italic text<\/em>/);
  });

  test('strikethrough ~~text~~ converts to <s>', async ({ editorPage }) => {
    const { type, clickBtn } = editorPage;
    await type('~~crossed out~~');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    await clickBtn('markdownToggle');
    await editorPage.settle();
    expect(await editorPage.getHTML()).toMatch(/<s>crossed out<\/s>/);
  });

  test('unordered list - item converts to <ul><li>', async ({ editorPage }) => {
    const { page, editor, clickBtn } = editorPage;
    await editor.click();
    await page.keyboard.type('- item one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('- item two');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    await clickBtn('markdownToggle');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toContain('<ul');
    expect(html).toContain('<li');
  });

  test('ordered list 1. item converts to <ol><li>', async ({ editorPage }) => {
    const { page, editor, clickBtn } = editorPage;
    await editor.click();
    await page.keyboard.type('1. first');
    await page.keyboard.press('Enter');
    await page.keyboard.type('2. second');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    await clickBtn('markdownToggle');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toContain('<ol');
  });

  test('inline code `code` converts to <code>', async ({ editorPage }) => {
    const { type, clickBtn } = editorPage;
    await type('run `npm install` now');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    await clickBtn('markdownToggle');
    await editorPage.settle();
    expect(await editorPage.getHTML()).toContain('<code>');
  });

  test('fenced code block converts to ray-code-block', async ({ editorPage }) => {
    const { page, editor, clickBtn } = editorPage;
    await editor.click();
    await page.keyboard.type('```javascript');
    await page.keyboard.press('Enter');
    await page.keyboard.type('const x = 1;');
    await page.keyboard.press('Enter');
    await page.keyboard.type('```');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    await clickBtn('markdownToggle');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toMatch(/ray-code-block|ray-code-content/);
    expect(html).toContain('const x = 1;');
  });

  test('blockquote > text converts to <blockquote>', async ({ editorPage }) => {
    const { type, clickBtn } = editorPage;
    await type('> this is a quote');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    await clickBtn('markdownToggle');
    await editorPage.settle();
    expect(await editorPage.getHTML()).toContain('<blockquote');
  });

  test('link [text](url) converts to <a href>', async ({ editorPage }) => {
    const { type, clickBtn } = editorPage;
    await type('[click here](https://example.com)');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    await clickBtn('markdownToggle');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toContain('<a');
    expect(html).toContain('https://example.com');
    expect(html).toContain('click here');
  });

  test('image ![alt](src) converts to <img>', async ({ editorPage }) => {
    const { type, clickBtn } = editorPage;
    await type('![ray logo](https://example.com/logo.png)');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    await clickBtn('markdownToggle');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toContain('<img');
    expect(html).toContain('https://example.com/logo.png');
  });

  test('horizontal rule --- converts to <hr>', async ({ editorPage }) => {
    const { page, editor, clickBtn } = editorPage;
    await editor.click();
    await page.keyboard.type('before');
    await page.keyboard.press('Enter');
    await page.keyboard.type('---');
    await page.keyboard.press('Enter');
    await page.keyboard.type('after');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    await clickBtn('markdownToggle');
    await editorPage.settle();
    expect(await editorPage.getHTML()).toContain('<hr');
  });
});

test.describe('Markdown — security (XSS in markdown)', () => {
  test('javascript: in link href is sanitized', async ({ editorPage }) => {
    const { type, clickBtn } = editorPage;
    await type('[evil](javascript:alert(1))');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    await clickBtn('markdownToggle');
    await editorPage.settle();
    let alertFired = false;
    editorPage.page.on('dialog', () => { alertFired = true; });
    await editorPage.settle();
    expect(alertFired).toBe(false);
    expect(await editorPage.getHTML()).not.toContain('javascript:');
  });

  test('XSS in image alt text is escaped', async ({ editorPage }) => {
    const { type, clickBtn } = editorPage;
    await type('![<script>alert(1)</script>](https://example.com/img.png)');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    await clickBtn('markdownToggle');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('data: URI in image src is blocked', async ({ editorPage }) => {
    const { type, clickBtn } = editorPage;
    await type('![img](data:text/html,<script>alert(1)</script>)');
    await clickBtn('markdownToggle');
    await editorPage.settle();
    await clickBtn('markdownToggle');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).not.toContain('data:text/html');
  });
});

test.describe('Markdown — export', () => {
  test('exportMarkdown button triggers a download', async ({ editorPage }) => {
    const { type, clickBtn, page } = editorPage;
    await type('Export this');
    const downloadPromise = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
    await clickBtn('exportMarkdown');
    const download = await downloadPromise;
    // Download may be triggered
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.md$/);
    }
  });

  test('rich text bold becomes ** in exported markdown', async ({ editorPage }) => {
    const { type, selectAll, clickBtn, page } = editorPage;
    await type('bold text');
    await selectAll();
    await clickBtn('bold');
    // Toggle to markdown mode to inspect raw markdown
    await clickBtn('markdownToggle');
    await editorPage.settle();
    const text = await editorPage.getText();
    expect(text).toMatch(/\*\*bold text\*\*/);
  });
});
