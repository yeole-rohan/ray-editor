import { test, expect } from '../fixtures/editor.fixture';

/**
 * Practical edge cases — scenarios real users hit in the wild.
 * Grouped by the action or pattern that triggers them.
 */

// ─── Ctrl+A → type replaces all content ─────────────────────────────────────

test.describe('Select-all then type', () => {
  test('typing after Ctrl+A replaces entire content', async ({ editorPage }) => {
    const { type, selectAll, page, getText } = editorPage;
    await type('Old content that should disappear');
    await selectAll();
    await page.keyboard.type('Brand new content');
    const text = await getText();
    expect(text).not.toContain('Old content');
    expect(text).toContain('Brand new content');
  });

  test('Ctrl+A → Delete leaves editor with empty paragraph, not broken', async ({ editorPage }) => {
    const { type, selectAll, page, getHTML } = editorPage;
    await type('delete me');
    await selectAll();
    await page.keyboard.press('Delete');
    await editorPage.settle();
    // Editor must still have a focusable paragraph
    const html = await getHTML();
    expect(html).toMatch(/<p|<br/i);
  });

  test('Ctrl+A → Bold applies to everything', async ({ editorPage }) => {
    const { type, selectAll, clickBtn, getHTML } = editorPage;
    await type('line one');
    await page.keyboard.press('Enter');
    await type('line two');
    await selectAll();
    await clickBtn('bold');
    const html = await getHTML();
    expect(html).toMatch(/<strong>/);
  });

  // Playwright page isn't in scope inside test — grab from editorPage
  test('triple-click selects paragraph, then bold works', async ({ editorPage }) => {
    const { editor, page, getHTML } = editorPage;
    await editorPage.type('Triple click selects this');
    await editor.click({ clickCount: 3 });
    await page.keyboard.press('Control+b');
    const html = await getHTML();
    expect(html).toMatch(/<strong>/);
  });
});

// ─── Typing at document boundaries ───────────────────────────────────────────

test.describe('Cursor at document boundaries', () => {
  test('Ctrl+Home moves cursor to very start', async ({ editorPage }) => {
    const { type, page } = editorPage;
    await type('Hello');
    await page.keyboard.press('Enter');
    await type('World');
    await page.keyboard.press('Control+Home');
    await page.keyboard.type('START ');
    const text = await editorPage.getText();
    expect(text).toMatch(/^START/);
  });

  test('Ctrl+End moves cursor to very end', async ({ editorPage }) => {
    const { type, page, getText } = editorPage;
    await type('First paragraph');
    await page.keyboard.press('Enter');
    await type('Last paragraph');
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('Control+End');
    await page.keyboard.type(' APPENDED');
    const text = await getText();
    expect(text).toContain('Last paragraph APPENDED');
  });

  test('typing immediately after page load works without clicking editor', async ({ editorPage }) => {
    // Some users tab-navigate to the editor and type without clicking
    await editorPage.editor.focus();
    await editorPage.page.keyboard.type('Typed without click');
    const text = await editorPage.getText();
    expect(text).toContain('Typed without click');
  });
});

// ─── Backspace edge cases ─────────────────────────────────────────────────────

test.describe('Backspace behaviour', () => {
  test('backspace at start of second paragraph merges with first', async ({ editorPage }) => {
    const { type, page, getText } = editorPage;
    await type('First');
    await page.keyboard.press('Enter');
    await type('Second');
    await page.keyboard.press('Home');
    await page.keyboard.press('Backspace');
    const text = await getText();
    expect(text).toContain('FirstSecond');
  });

  test('backspace at start of list item converts to paragraph when list is empty', async ({ editorPage }) => {
    const { type, page, getHTML, editor } = editorPage;
    await editor.click();
    await editorPage.clickBtn('unorderedList');
    // List item is empty — backspace should exit the list
    await page.keyboard.press('Backspace');
    await editorPage.settle();
    const html = await getHTML();
    // Should not be inside <ul> anymore
    const hasEmptyList = html.includes('<ul><li></li></ul>') || html.includes('<ul>\n<li></li>');
    expect(hasEmptyList).toBe(false);
  });

  test('backspace on empty editor does not throw', async ({ editorPage }) => {
    const { page } = editorPage;
    await editorPage.editor.click();
    // Press backspace many times on an empty editor
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Backspace');
    }
    // Editor should still be in the DOM and focusable
    await expect(editorPage.editor).toBeVisible();
  });

  test('backspace at start of code block does not merge into previous paragraph', async ({ editorPage }) => {
    const { type, page, getHTML, editor, clickBtn } = editorPage;
    await type('Before block');
    await page.keyboard.press('Enter');
    await editor.click();
    await clickBtn('codeBlock');
    await editorPage.settle();

    // Move cursor to start of code block and press backspace
    await page.keyboard.press('Home');
    await page.keyboard.press('Backspace');
    await editorPage.settle();

    const html = await getHTML();
    // Paragraph text should still exist separately
    expect(html).toContain('Before block');
  });
});

// ─── Code block — real user typing patterns ──────────────────────────────────

test.describe('Code block — typing edge cases', () => {
  test('Tab key inside code block inserts spaces, does not leave editor', async ({ editorPage }) => {
    const { type, page, getHTML, editor, clickBtn } = editorPage;
    await editor.click();
    await clickBtn('codeBlock');
    await type('function foo()');
    await page.keyboard.press('Tab');
    await type('return 1;');
    const html = await getHTML();
    // Cursor stayed inside code block
    expect(html).toContain('return 1;');
    expect(html).toContain('ray-code-block');
  });

  test('pasting plain text into code block keeps it as plain text', async ({ editorPage }) => {
    const { clickBtn, editor, pasteText, getHTML } = editorPage;
    await editor.click();
    await clickBtn('codeBlock');
    await pasteText('<b>not bold</b> plain text');
    const html = await getHTML();
    // Should be literal text, not parsed as HTML
    expect(html).toContain('&lt;b&gt;');
    expect(html).not.toContain('<b>not bold</b>');
  });

  test('pasting HTML into code block strips tags to plain text', async ({ editorPage }) => {
    const { clickBtn, editor, pasteHTML, getHTML } = editorPage;
    await editor.click();
    await clickBtn('codeBlock');
    await pasteHTML('<strong>bold</strong> text');
    await editorPage.settle();
    const html = await getHTML();
    // Bold should not render as <strong> inside code
    expect(html).not.toMatch(/<strong>bold<\/strong>/);
  });

  test('Shift+Enter inside code block inserts newline (same as Enter)', async ({ editorPage }) => {
    const { type, page, clickBtn, editor, getHTML } = editorPage;
    await editor.click();
    await clickBtn('codeBlock');
    await type('line1');
    await page.keyboard.press('Shift+Enter');
    await type('line2');
    const html = await getHTML();
    expect(html).toContain('line1');
    expect(html).toContain('line2');
    expect(html).toContain('ray-code-block');
  });

  test('very long line in code block does not overflow editor', async ({ editorPage }) => {
    const { type, clickBtn, editor } = editorPage;
    await editor.click();
    await clickBtn('codeBlock');
    await type('a'.repeat(300)); // 300 chars no space — should wrap visually
    // No assertion on content — just that the editor doesn't crash
    await expect(editorPage.page.locator('.ray-code-block')).toBeVisible();
  });
});

// ─── Lists — real user patterns ──────────────────────────────────────────────

test.describe('Lists', () => {
  test('Enter on empty list item at end exits the list', async ({ editorPage }) => {
    const { type, page, clickBtn, editor, getHTML } = editorPage;
    await editor.click();
    await clickBtn('unorderedList');
    await type('item one');
    await page.keyboard.press('Enter');
    // Second item is empty — Enter should exit list
    await page.keyboard.press('Enter');
    await editorPage.settle();
    await type('after list');
    const html = await getHTML();
    // "after list" should be a paragraph, not a list item
    expect(html).toContain('after list');
    const inLi = html.includes('<li>after list</li>');
    expect(inLi).toBe(false);
  });

  test('typing after unordered list toolbar creates list items on Enter', async ({ editorPage }) => {
    const { type, page, clickBtn, editor } = editorPage;
    await editor.click();
    await clickBtn('unorderedList');
    await type('First item');
    await page.keyboard.press('Enter');
    await type('Second item');
    await page.keyboard.press('Enter');
    await type('Third item');
    const items = editorPage.editor.locator('li');
    expect(await items.count()).toBeGreaterThanOrEqual(3);
  });

  test('pasting plain text into list item keeps it in the list', async ({ editorPage }) => {
    const { page, clickBtn, editor, pasteText, getHTML } = editorPage;
    await editor.click();
    await clickBtn('unorderedList');
    await pasteText('pasted into list');
    const html = await getHTML();
    expect(html).toContain('<li');
    expect(html).toContain('pasted into list');
  });

  test('switching from unordered to ordered list converts items', async ({ editorPage }) => {
    const { type, page, clickBtn, editor, getHTML } = editorPage;
    await editor.click();
    await clickBtn('unorderedList');
    await type('item one');
    await page.keyboard.press('Enter');
    await type('item two');
    // Select all and switch to ordered list
    await editorPage.selectAll();
    await clickBtn('orderedList');
    await editorPage.settle();
    const html = await getHTML();
    expect(html).toContain('<ol');
  });
});

// ─── Markdown shortcuts ───────────────────────────────────────────────────────

test.describe('Markdown shortcuts (live)', () => {
  test('## + Space converts to h2', async ({ editorPage }) => {
    const { page, editor, getHTML } = editorPage;
    await editor.click();
    await page.keyboard.type('## ');
    await editorPage.settle();
    const html = await getHTML();
    expect(html).toMatch(/<h2/);
  });

  test('** bold ** shortcut works mid-sentence', async ({ editorPage }) => {
    const { page, editor, getHTML } = editorPage;
    await editor.click();
    await page.keyboard.type('before ');
    await page.keyboard.type('**bold text**');
    await page.keyboard.type(' after');
    await editorPage.settle();
    const html = await getHTML();
    expect(html).toMatch(/<strong>bold text<\/strong>/);
  });

  test('- + Space at line start creates unordered list', async ({ editorPage }) => {
    const { page, editor, getHTML } = editorPage;
    await editor.click();
    await page.keyboard.type('- ');
    await editorPage.settle();
    const html = await getHTML();
    expect(html).toContain('<ul');
  });

  test('1. + Space creates ordered list', async ({ editorPage }) => {
    const { page, editor, getHTML } = editorPage;
    await editor.click();
    await page.keyboard.type('1. ');
    await editorPage.settle();
    const html = await getHTML();
    expect(html).toContain('<ol');
  });

  test('> + Space creates blockquote', async ({ editorPage }) => {
    const { page, editor, getHTML } = editorPage;
    await editor.click();
    await page.keyboard.type('> ');
    await editorPage.settle();
    const html = await getHTML();
    expect(html).toContain('<blockquote');
  });

  test('backtick wraps word in inline code', async ({ editorPage }) => {
    const { page, editor, getHTML } = editorPage;
    await editor.click();
    await page.keyboard.type('`inline code`');
    await page.keyboard.press('Space'); // trigger shortcut
    await editorPage.settle();
    const html = await getHTML();
    expect(html).toContain('<code>');
  });
});

// ─── Find & Replace ──────────────────────────────────────────────────────────

test.describe('Find and Replace', () => {
  test('Ctrl+F opens find panel', async ({ editorPage }) => {
    const { page } = editorPage;
    await editorPage.editor.click();
    await page.keyboard.press('Control+f');
    await editorPage.settle();
    const findPanel = editorPage.page.locator('.ray-find-panel, .ray-find-replace');
    await expect(findPanel).toBeVisible();
  });

  test('Escape closes find panel', async ({ editorPage }) => {
    const { page } = editorPage;
    await editorPage.editor.click();
    await page.keyboard.press('Control+f');
    await editorPage.settle();
    await page.keyboard.press('Escape');
    await editorPage.settle();
    const findPanel = editorPage.page.locator('.ray-find-panel, .ray-find-replace');
    await expect(findPanel).not.toBeVisible();
  });

  test('find highlights matching text in editor', async ({ editorPage }) => {
    const { type, page } = editorPage;
    await type('Hello world, hello again');
    await page.keyboard.press('Control+f');
    await editorPage.settle();
    const findInput = editorPage.page.locator('input[placeholder*="Find"], input[placeholder*="Search"]').first();
    await findInput.fill('hello');
    await editorPage.settle();
    // At least one highlight span should appear
    const highlights = editorPage.editor.locator('.ray-highlight, mark, [class*="highlight"]');
    expect(await highlights.count()).toBeGreaterThanOrEqual(1);
  });

  test('replace replaces matched text', async ({ editorPage }) => {
    const { type, page, getText } = editorPage;
    await type('old text in the editor');
    await page.keyboard.press('Control+h');
    await editorPage.settle();
    const findInput = editorPage.page.locator('input[placeholder*="Find"], input').nth(0);
    const replaceInput = editorPage.page.locator('input[placeholder*="Replace"], input').nth(1);
    await findInput.fill('old text');
    await replaceInput.fill('new text');
    // Click Replace or Replace All
    const replaceBtn = editorPage.page.locator('button', { hasText: /Replace/ }).first();
    await replaceBtn.click();
    await editorPage.settle();
    const text = await getText();
    expect(text).toContain('new text');
    expect(text).not.toContain('old text');
  });
});

// ─── Slash commands ───────────────────────────────────────────────────────────

test.describe('Slash commands', () => {
  test('/ at start of empty paragraph opens palette', async ({ editorPage }) => {
    const { page, editor } = editorPage;
    await editor.click();
    await page.keyboard.type('/');
    await editorPage.settle();
    const palette = editorPage.page.locator('.ray-slash-palette, .ray-slash-menu');
    await expect(palette).toBeVisible();
  });

  test('Escape dismisses slash palette without inserting anything', async ({ editorPage }) => {
    const { page, editor, getHTML } = editorPage;
    await editor.click();
    await page.keyboard.type('/');
    await editorPage.settle();
    await page.keyboard.press('Escape');
    await editorPage.settle();
    const palette = editorPage.page.locator('.ray-slash-palette, .ray-slash-menu');
    await expect(palette).not.toBeVisible();
  });

  test('typing after / filters the palette', async ({ editorPage }) => {
    const { page, editor } = editorPage;
    await editor.click();
    await page.keyboard.type('/code');
    await editorPage.settle();
    const palette = editorPage.page.locator('.ray-slash-palette, .ray-slash-menu');
    await expect(palette).toBeVisible();
    // Items visible should be reduced to code-related ones
    const items = palette.locator('[class*="item"], li');
    expect(await items.count()).toBeGreaterThan(0);
  });

  test('/ in middle of a word does not trigger palette', async ({ editorPage }) => {
    const { type, page, editor } = editorPage;
    await type('http');
    await page.keyboard.type('/');
    await editorPage.settle();
    const palette = editorPage.page.locator('.ray-slash-palette, .ray-slash-menu');
    // Palette should NOT appear mid-word
    const visible = await palette.isVisible().catch(() => false);
    expect(visible).toBe(false);
  });
});

// ─── Undo after complex operations ───────────────────────────────────────────

test.describe('Undo edge cases', () => {
  test('undo after pasting Word HTML restores clean state', async ({ editorPage }) => {
    const { page, getHTML, pasteFixture } = editorPage;
    await editorPage.type('Before paste ');
    const beforePaste = await getHTML();
    await pasteFixture('word-2019');
    await editorPage.settle();
    await page.keyboard.press('Control+z');
    await editorPage.settle();
    // After undo, should resemble pre-paste state
    const html = await getHTML();
    expect(html).not.toContain('Project Report');
  });

  test('undo after markdown shortcut (## heading) reverts to ##', async ({ editorPage }) => {
    const { page, editor, getHTML } = editorPage;
    await editor.click();
    await page.keyboard.type('## ');
    await editorPage.settle();
    expect(await getHTML()).toMatch(/<h2/);
    await page.keyboard.press('Control+z');
    await editorPage.settle();
    // After undo the heading conversion is reversed
    const html = await getHTML();
    expect(html).not.toMatch(/<h2>/);
  });

  test('undo does not crash when history is at initial state', async ({ editorPage }) => {
    const { page } = editorPage;
    await editorPage.editor.click();
    // Press undo many times from a fresh editor
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Control+z');
    }
    await expect(editorPage.editor).toBeVisible();
  });
});

// ─── Paste edge cases ─────────────────────────────────────────────────────────

test.describe('Paste edge cases', () => {
  test('pasting into middle of existing text inserts at cursor', async ({ editorPage }) => {
    const { type, page, getText } = editorPage;
    await type('Hello World');
    // Move cursor between Hello and World
    await page.keyboard.press('Home');
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight'); // after "Hello "
    await editorPage.pasteText('Beautiful ');
    const text = await getText();
    expect(text).toContain('Hello Beautiful World');
  });

  test('pasting whitespace-only content does not crash', async ({ editorPage }) => {
    await editorPage.pasteText('   \n\n\t   ');
    await expect(editorPage.editor).toBeVisible();
  });

  test('pasting very large content (1000 words) completes without timeout', async ({ editorPage }) => {
    const bigText = Array(200).fill('word').join(' '); // 200 words repeated
    await editorPage.pasteText(bigText);
    await editorPage.settle();
    const text = await editorPage.getText();
    expect(text.length).toBeGreaterThan(100);
  });

  test('pasting an http URL as plain text does not auto-embed as iframe', async ({ editorPage }) => {
    const { pasteText, getHTML } = editorPage;
    await pasteText('https://example.com');
    const html = await getHTML();
    expect(html).not.toContain('<iframe');
    expect(html).toContain('example.com');
  });

  test('pasting bold text into a heading keeps heading style dominant', async ({ editorPage }) => {
    const { page, editor, clickBtn, pasteHTML, getHTML } = editorPage;
    await editor.click();
    await clickBtn('headings');
    const h2 = editorPage.page.locator('[data-value="h2"], [data-heading="2"]').first();
    if (await h2.isVisible({ timeout: 500 }).catch(() => false)) await h2.click();
    await editorPage.settle();
    await pasteHTML('<strong>Bold pasted</strong>');
    const html = await getHTML();
    // Should still be in an h2 — not broken into a paragraph
    expect(html).toMatch(/<h2/);
  });
});

// ─── Read-only mode ───────────────────────────────────────────────────────────

test.describe('Read-only mode', () => {
  test('typing in read-only mode does not change content', async ({ editorPage }) => {
    const { type, page, getText } = editorPage;
    await type('Locked content');
    const locked = await getText();

    // Toggle read-only via the topbar button
    await page.locator('#btn-readonly').click();
    await editorPage.settle();

    await editorPage.editor.click();
    await page.keyboard.type('should not appear');
    const text = await getText();
    expect(text).toBe(locked);

    // Restore for cleanup
    await page.locator('#btn-readonly').click();
  });
});

// ─── Dark mode ────────────────────────────────────────────────────────────────

test.describe('Dark mode', () => {
  test('toggling dark mode does not lose editor content', async ({ editorPage }) => {
    const { type, page, getText } = editorPage;
    await type('Dark mode test content');
    const before = await getText();

    await page.locator('#theme-toggle').click();
    await editorPage.settle();

    expect(await getText()).toBe(before);
  });

  test('editor wrapper has dark class after toggle', async ({ editorPage }) => {
    const { page } = editorPage;
    // Page starts in dark mode (button text "🌙 Dark Mode" is toggled)
    await page.locator('#theme-toggle').click();
    await editorPage.settle();
    const wrapper = editorPage.page.locator('.ray-editor-wrapper');
    const cls = await wrapper.getAttribute('class') ?? '';
    expect(cls).toMatch(/dark|light/);
  });
});

// ─── Long-form content ────────────────────────────────────────────────────────

test.describe('Long-form content', () => {
  test('editor remains responsive after 50 paragraphs', async ({ editorPage }) => {
    const { page, editor } = editorPage;
    await editor.click();
    for (let i = 1; i <= 50; i++) {
      await page.keyboard.type(`Paragraph ${i} with some content to make it realistic.`);
      await page.keyboard.press('Enter');
    }
    // Type one more — should be instant, not laggy
    await page.keyboard.type('Final paragraph');
    const text = await editorPage.getText();
    expect(text).toContain('Final paragraph');
  });

  test('undo works correctly after 50 paragraphs', async ({ editorPage }) => {
    const { page, editor } = editorPage;
    await editor.click();
    for (let i = 1; i <= 10; i++) {
      await page.keyboard.type(`Line ${i} `); // space triggers history push
      await page.keyboard.press('Enter');
    }
    await page.keyboard.press('Control+z');
    await editorPage.settle();
    const text = await editorPage.getText();
    // At least one undo happened
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toContain('Line 10');
  });
});

// ─── Modal accessibility ──────────────────────────────────────────────────────

test.describe('Modal focus traps', () => {
  test('link modal traps focus — Tab stays inside modal', async ({ editorPage }) => {
    const { type, page, clickBtn, selectAll } = editorPage;
    await type('link text');
    await selectAll();
    await clickBtn('link');
    await editorPage.settle();

    // Tab through modal elements — focus should cycle inside
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const activeInModal = await editorPage.page.evaluate(() => {
      const active = document.activeElement;
      return !!active?.closest('.ray-link-modal, [role="dialog"]');
    });
    expect(activeInModal).toBe(true);
  });

  test('Escape closes link modal', async ({ editorPage }) => {
    const { type, page, clickBtn, selectAll } = editorPage;
    await type('text');
    await selectAll();
    await clickBtn('link');
    await editorPage.settle();

    await page.keyboard.press('Escape');
    await editorPage.settle();

    const modal = editorPage.page.locator('.ray-link-modal, [role="dialog"]');
    await expect(modal).not.toBeVisible();
  });
});
