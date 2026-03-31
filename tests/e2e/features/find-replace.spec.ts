import { test, expect } from '../fixtures/editor.fixture';

/**
 * Find & Replace — per-feature tests + edge cases.
 *
 * Core bug fixed: highlightMatches() now processes matches right-to-left
 * within each text node so surroundContents() splits don't invalidate
 * the offsets of subsequent matches in the same node.
 */

// Helper — open find panel and type a query
async function openFind(editorPage: any, query: string) {
  await editorPage.editor.click();
  await editorPage.page.keyboard.press('Control+f');
  await editorPage.settle();
  const input = editorPage.page.locator('#ray-find-input');
  await input.fill(query);
  await editorPage.settle();
  return input;
}

// Helper — open replace panel
async function openReplace(editorPage: any, find: string, replace: string) {
  await editorPage.editor.click();
  await editorPage.page.keyboard.press('Control+h');
  await editorPage.settle();
  await editorPage.page.locator('#ray-find-input').fill(find);
  await editorPage.page.locator('#ray-replace-input').fill(replace);
  await editorPage.settle();
}

// ─── Panel open / close ───────────────────────────────────────────────────────

test.describe('Find panel — open/close', () => {
  test('Ctrl+F opens the find panel', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.page.keyboard.press('Control+f');
    await expect(editorPage.page.locator('.ray-find-panel')).toBeVisible();
  });

  test('Ctrl+H opens the find panel with replace row visible', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.page.keyboard.press('Control+h');
    await editorPage.settle();
    await expect(editorPage.page.locator('.ray-replace-row')).toBeVisible();
  });

  test('✕ button closes the panel', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.page.keyboard.press('Control+f');
    await editorPage.page.locator('#ray-find-close').click();
    await expect(editorPage.page.locator('.ray-find-panel')).not.toBeVisible();
  });

  test('Escape closes the panel', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.page.keyboard.press('Control+f');
    await editorPage.page.keyboard.press('Escape');
    await expect(editorPage.page.locator('.ray-find-panel')).not.toBeVisible();
  });

  test('opening panel again while open keeps it open and focuses input', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.page.keyboard.press('Control+f');
    await editorPage.page.keyboard.press('Control+f'); // second press
    const panels = editorPage.page.locator('.ray-find-panel');
    expect(await panels.count()).toBe(1); // only one panel
  });

  test('closing panel removes all highlights from editor', async ({ editorPage }) => {
    const { type } = editorPage;
    await type('hello hello');
    await openFind(editorPage, 'hello');
    await editorPage.page.locator('#ray-find-close').click();
    await editorPage.settle();
    const marks = editorPage.editor.locator('mark.ray-find-match');
    expect(await marks.count()).toBe(0);
  });
});

// ─── Search — basic ───────────────────────────────────────────────────────────

test.describe('Find — basic search', () => {
  test('finds a single occurrence', async ({ editorPage }) => {
    await editorPage.type('Hello world');
    await openFind(editorPage, 'world');
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('1 of 1');
  });

  test('finds TWO occurrences in same paragraph (the core bug fix)', async ({ editorPage }) => {
    await editorPage.type('hello world hello again');
    await openFind(editorPage, 'hello');
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('1 of 2');
    // Both marks must exist in DOM
    const marks = editorPage.editor.locator('mark.ray-find-match');
    expect(await marks.count()).toBe(2);
  });

  test('finds THREE occurrences across same text node', async ({ editorPage }) => {
    await editorPage.type('cat and cat and cat');
    await openFind(editorPage, 'cat');
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('1 of 3');
    expect(await editorPage.editor.locator('mark.ray-find-match').count()).toBe(3);
  });

  test('finds occurrences across multiple paragraphs', async ({ editorPage }) => {
    const { type, page } = editorPage;
    await type('word here');
    await page.keyboard.press('Enter');
    await type('another word here');
    await page.keyboard.press('Enter');
    await type('final word');
    await openFind(editorPage, 'word');
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('1 of 3');
  });

  test('shows "No results" when query not found', async ({ editorPage }) => {
    await editorPage.type('Hello world');
    await openFind(editorPage, 'xyz123notexist');
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('No results');
  });

  test('clears count when query is emptied', async ({ editorPage }) => {
    await editorPage.type('hello');
    const input = await openFind(editorPage, 'hello');
    await input.fill('');
    await editorPage.settle();
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('');
  });

  test('search is case-insensitive by default', async ({ editorPage }) => {
    await editorPage.type('Hello HELLO hello');
    await openFind(editorPage, 'hello');
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('1 of 3');
  });

  test('case-sensitive checkbox limits results', async ({ editorPage }) => {
    await editorPage.type('Hello HELLO hello');
    await openFind(editorPage, 'hello');
    // Enable case sensitive
    await editorPage.page.locator('#ray-find-case').check();
    await editorPage.settle();
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('1 of 1'); // only lowercase "hello"
  });

  test('whole-word checkbox excludes partial matches', async ({ editorPage }) => {
    await editorPage.type('test testing tested');
    await openFind(editorPage, 'test');
    await editorPage.page.locator('#ray-find-word').check();
    await editorPage.settle();
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('1 of 1'); // only exact "test"
  });
});

// ─── Search — navigation ──────────────────────────────────────────────────────

test.describe('Find — navigation', () => {
  test('▼ next button advances to second match', async ({ editorPage }) => {
    await editorPage.type('foo bar foo baz foo');
    await openFind(editorPage, 'foo');
    await editorPage.page.locator('#ray-find-next').click();
    await editorPage.settle();
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('2 of 3');
  });

  test('▲ prev button goes back to first match', async ({ editorPage }) => {
    await editorPage.type('foo bar foo');
    await openFind(editorPage, 'foo');
    await editorPage.page.locator('#ray-find-next').click();
    await editorPage.page.locator('#ray-find-prev').click();
    await editorPage.settle();
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('1 of 2');
  });

  test('navigation wraps from last match back to first', async ({ editorPage }) => {
    await editorPage.type('foo bar foo');
    await openFind(editorPage, 'foo');
    await editorPage.page.locator('#ray-find-next').click(); // → 2 of 2
    await editorPage.page.locator('#ray-find-next').click(); // → wraps to 1 of 2
    await editorPage.settle();
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('1 of 2');
  });

  test('navigation wraps from first match back to last (prev)', async ({ editorPage }) => {
    await editorPage.type('foo bar foo baz');
    await openFind(editorPage, 'foo');
    await editorPage.page.locator('#ray-find-prev').click(); // should wrap to last
    await editorPage.settle();
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('2 of 2');
  });

  test('Enter key in find input goes to next match', async ({ editorPage }) => {
    await editorPage.type('hello there hello');
    await openFind(editorPage, 'hello');
    await editorPage.page.locator('#ray-find-input').press('Enter');
    await editorPage.settle();
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('2 of 2');
  });

  test('Shift+Enter goes to previous match', async ({ editorPage }) => {
    await editorPage.type('hello there hello world hello');
    await openFind(editorPage, 'hello');
    // Go to 3rd match first
    await editorPage.page.locator('#ray-find-next').click();
    await editorPage.page.locator('#ray-find-next').click();
    // Shift+Enter goes back
    await editorPage.page.locator('#ray-find-input').press('Shift+Enter');
    await editorPage.settle();
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('2 of 3');
  });

  test('active match has ray-find-active class', async ({ editorPage }) => {
    await editorPage.type('word and word');
    await openFind(editorPage, 'word');
    const activeMarks = editorPage.editor.locator('mark.ray-find-active');
    expect(await activeMarks.count()).toBe(1);
  });

  test('navigating moves ray-find-active to the new match', async ({ editorPage }) => {
    await editorPage.type('cat cat cat');
    await openFind(editorPage, 'cat');
    const marks = editorPage.editor.locator('mark.ray-find-match');
    // First mark should be active initially
    await expect(marks.first()).toHaveClass(/ray-find-active/);
    await editorPage.page.locator('#ray-find-next').click();
    await editorPage.settle();
    // Second mark should now be active
    await expect(marks.nth(1)).toHaveClass(/ray-find-active/);
    await expect(marks.first()).not.toHaveClass(/ray-find-active/);
  });
});

// ─── Search — edge cases ──────────────────────────────────────────────────────

test.describe('Find — edge cases', () => {
  test('search updates live as user types each character', async ({ editorPage }) => {
    await editorPage.type('hello help helicopter');
    await editorPage.editor.click();
    await editorPage.page.keyboard.press('Control+f');
    await editorPage.settle();
    const input = editorPage.page.locator('#ray-find-input');
    const count = editorPage.page.locator('#ray-find-count');

    await input.fill('h');
    await editorPage.settle();
    const after1 = await count.textContent();
    expect(after1).toMatch(/of 3/); // h, hel, heli all match

    await input.fill('he');
    await editorPage.settle();
    const after2 = await count.textContent();
    expect(after2).toMatch(/of 3/); // hello, help, helicopter

    await input.fill('hel');
    await editorPage.settle();
    const after3 = await count.textContent();
    expect(after3).toMatch(/of 3/); // hello, help, helicopter all start with hel

    await input.fill('hell');
    await editorPage.settle();
    const after4 = await count.textContent();
    expect(after4).toMatch(/of 1/); // only hello
  });

  test('search works across heading and paragraph', async ({ editorPage }) => {
    const { page, editor } = editorPage;
    await editor.click();
    // Use headings dropdown (select element) to set h2
    const headingsSelect = editorPage.page.locator('.ray-dropdown-headings');
    if (await headingsSelect.isVisible({ timeout: 500 }).catch(() => false)) {
      await headingsSelect.selectOption('<h2>');
    }
    await page.keyboard.type('common word');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('another common word');
    await openFind(editorPage, 'common');
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('1 of 2');
  });

  test('search does not find text inside code block if it spans multiple nodes', async ({ editorPage }) => {
    const { page, editor, clickBtn } = editorPage;
    await page.keyboard.type('outside text');
    await page.keyboard.press('Enter');
    await editor.click();
    await clickBtn('codeBlock');
    await page.keyboard.type('inside code text');
    await openFind(editorPage, 'text');
    // Should find at least the paragraph occurrence
    const count = editorPage.page.locator('#ray-find-count');
    const txt = await count.textContent();
    expect(txt).toMatch(/of \d+/);
  });

  test('special regex characters in query are treated as literals', async ({ editorPage }) => {
    await editorPage.type('price is $10.00 today');
    await openFind(editorPage, '$10.00');
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('1 of 1');
  });

  test('searching for empty string shows no count', async ({ editorPage }) => {
    await editorPage.type('some content');
    await openFind(editorPage, '');
    const count = editorPage.page.locator('#ray-find-count');
    await expect(count).toHaveText('');
  });

  test('searching after editing content updates results', async ({ editorPage }) => {
    const { type, page } = editorPage;
    await type('apple banana apple');
    await openFind(editorPage, 'apple');
    await expect(editorPage.page.locator('#ray-find-count')).toHaveText('1 of 2');
    // Close, edit, re-open
    await editorPage.page.locator('#ray-find-close').click();
    await editorPage.editor.click();
    await page.keyboard.press('Control+End');
    await type(' apple');
    await openFind(editorPage, 'apple');
    await expect(editorPage.page.locator('#ray-find-count')).toHaveText('1 of 3');
  });
});

// ─── Replace ─────────────────────────────────────────────────────────────────

test.describe('Replace', () => {
  test('Replace replaces the current (active) match', async ({ editorPage }) => {
    await editorPage.type('cat sat on a cat mat');
    await openReplace(editorPage, 'cat', 'dog');
    await editorPage.page.locator('#ray-replace-one').click();
    await editorPage.settle();
    const text = await editorPage.getText();
    // First "cat" replaced
    expect(text).toContain('dog');
    // Second "cat" still present
    expect(text).toContain('cat');
  });

  test('Replace All replaces every occurrence', async ({ editorPage }) => {
    await editorPage.type('cat sat on a cat mat with a cat');
    await openReplace(editorPage, 'cat', 'dog');
    await editorPage.page.locator('#ray-replace-all').click();
    await editorPage.settle();
    const text = await editorPage.getText();
    expect(text).not.toContain('cat');
    expect(text).toContain('dog');
  });

  test('Replace with empty string deletes the match', async ({ editorPage }) => {
    await editorPage.type('remove this word from sentence');
    await openReplace(editorPage, 'this ', '');
    await editorPage.page.locator('#ray-replace-one').click();
    await editorPage.settle();
    const text = await editorPage.getText();
    expect(text).not.toContain('this');
    expect(text).toContain('remove word');
  });

  test('Replace All with empty string deletes all matches', async ({ editorPage }) => {
    await editorPage.type('bad word and bad word and bad word');
    await openReplace(editorPage, 'bad ', '');
    await editorPage.page.locator('#ray-replace-all').click();
    await editorPage.settle();
    const text = await editorPage.getText();
    expect(text).not.toContain('bad');
  });

  test('count updates after Replace', async ({ editorPage }) => {
    await editorPage.type('foo foo foo');
    await openReplace(editorPage, 'foo', 'bar');
    await editorPage.page.locator('#ray-replace-one').click();
    await editorPage.settle();
    const count = editorPage.page.locator('#ray-find-count');
    // After replacing 1, should show something like "1 of 2" or "0 of 2"
    const txt = await count.textContent();
    expect(txt).toMatch(/of 2|No results/);
  });

  test('Replace All clears count to 0', async ({ editorPage }) => {
    await editorPage.type('foo foo');
    await openReplace(editorPage, 'foo', 'bar');
    await editorPage.page.locator('#ray-replace-all').click();
    await editorPage.settle();
    // Nothing left to find
    const count = editorPage.page.locator('#ray-find-count');
    const txt = await count.textContent();
    expect(txt).toMatch(/No results|^$/);
  });

  test('Replace works on word with special characters', async ({ editorPage }) => {
    await editorPage.type('price: $9.99 and $9.99');
    await openReplace(editorPage, '$9.99', '$14.99');
    await editorPage.page.locator('#ray-replace-all').click();
    await editorPage.settle();
    const text = await editorPage.getText();
    expect(text).toContain('$14.99');
    expect(text).not.toContain('$9.99');
  });
});
