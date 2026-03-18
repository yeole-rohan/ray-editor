import { test, expect } from '../fixtures/editor.fixture';

test.describe('Code blocks', () => {
  test('toolbar inserts a code block', async ({ editorPage }) => {
    const { clickBtn, getHTML, editor } = editorPage;
    await editor.click();
    await clickBtn('codeBlock');
    const html = await getHTML();
    expect(html).toContain('ray-code-block');
    expect(html).toContain('<pre');
  });

  test('empty code block places cursor inside <pre>', async ({ editorPage }) => {
    const { clickBtn, editor, page } = editorPage;
    await editor.click();
    await clickBtn('codeBlock');
    await editorPage.settle();

    const cursorInPre = await page.evaluate(() => {
      const sel = window.getSelection();
      const node = sel?.anchorNode;
      return !!(
        node?.parentElement?.closest('pre') ||
        (node as Element)?.closest?.('pre')
      );
    });
    expect(cursorInPre).toBe(true);
  });

  test('typing in code block produces plain text, not markup', async ({ editorPage }) => {
    const { clickBtn, getHTML, editor, page } = editorPage;
    await editor.click();
    await clickBtn('codeBlock');
    await editorPage.editor.locator('.ray-code-content').first().click();
    await page.keyboard.type('function foo() { return 42; }');
    const html = await getHTML();
    expect(html).not.toContain('<strong>');
    expect(html).not.toContain('<em>');
    expect(html).toContain('function foo()');
  });

  test('Enter in code block inserts newline, not new paragraph', async ({ editorPage }) => {
    const { clickBtn, page, getHTML, editor } = editorPage;
    await editor.click();
    await clickBtn('codeBlock');
    await editorPage.editor.locator('.ray-code-content').first().click();
    await page.keyboard.type('line one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('line two');
    const html = await getHTML();
    // Should be inside one code block, not split into two
    const codeBlocks = (html.match(/ray-code-block/g) ?? []).length;
    expect(codeBlocks).toBe(1);
    expect(html).toContain('line one');
    expect(html).toContain('line two');
  });

  test('double Enter on empty line exits code block into paragraph', async ({ editorPage }) => {
    const { clickBtn, page, getHTML, editor } = editorPage;
    await editor.click();
    await clickBtn('codeBlock');
    // Click the <pre contenteditable> directly so keyboard events target it, not the outer div
    const pre = editorPage.editor.locator('.ray-code-content').first();
    await pre.click();
    await page.keyboard.type('some code');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter'); // second empty Enter = exit
    await page.keyboard.type('after block');
    const html = await getHTML();
    expect(html).toContain('some code');
    expect(html).toContain('after block');
    // "after block" should be in a <p> that is a direct sibling of the code block
    const afterParagraph = editorPage.editor.locator('.ray-code-block + p');
    await expect(afterParagraph).toBeVisible();
  });

  test('first Enter in empty code block does NOT exit', async ({ editorPage }) => {
    const { clickBtn, page, getHTML, editor } = editorPage;
    await editor.click();
    await clickBtn('codeBlock');
    // Press Enter once in brand-new empty block
    await page.keyboard.press('Enter');
    await editorPage.settle();
    const html = await getHTML();
    // Should still be inside the code block
    expect(html).toContain('ray-code-block');
  });

  test('language select changes data-lang attribute', async ({ editorPage }) => {
    const { clickBtn, getHTML, editor, page } = editorPage;
    await editor.click();
    await clickBtn('codeBlock');
    await editorPage.settle();

    const langSelect = editorPage.page.locator('.ray-code-lang-select').first();
    await langSelect.selectOption('python');
    await editorPage.settle();

    const html = await getHTML();
    expect(html).toContain('data-lang="python"');
  });

  test('delete button removes code block and creates paragraph', async ({ editorPage }) => {
    const { clickBtn, getHTML, editor, page } = editorPage;
    await editor.click();
    await clickBtn('codeBlock');
    await editorPage.settle();

    const deleteBtn = editorPage.page.locator('.ray-code-delete-btn').first();
    await deleteBtn.click();
    await editorPage.settle();

    const html = await getHTML();
    expect(html).not.toContain('ray-code-block');
    expect(html).toContain('<p');
  });

  test('pasting code block from another source renders as code block', async ({ editorPage }) => {
    const { pasteFixture, getHTML } = editorPage;
    await pasteFixture('vscode');
    await editorPage.settle();
    const html = await getHTML();
    // VS Code paste should produce clean code content (not coloured spans)
    expect(html).toContain('RayEditor');
    // No raw hljs colour spans should survive paste normalisation
    expect(html).not.toContain('color: #569cd6');
  });
});

// ─── Exact DOM structure ─────────────────────────────────────────────────────

test.describe('Code block — exact structure', () => {
  test('code block wrapper has class ray-code-block', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('codeBlock');
    const block = editorPage.editor.locator('.ray-code-block').first();
    await expect(block).toBeVisible();
  });

  test('code block contains a <pre> with a <code> child', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('codeBlock');
    const pre = editorPage.editor.locator('.ray-code-block pre').first();
    await expect(pre).toBeVisible();
    const code = pre.locator('code').first();
    await expect(code).toBeVisible();
  });

  test('code block has a language select dropdown', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('codeBlock');
    const select = editorPage.page.locator('.ray-code-lang-select').first();
    await expect(select).toBeVisible();
  });

  test('language dropdown includes common languages', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('codeBlock');
    const select = editorPage.page.locator('.ray-code-lang-select').first();
    const options = await select.locator('option').allTextContents();
    // Common languages should be present
    const joined = options.join(',').toLowerCase();
    expect(joined).toContain('javascript');
    expect(joined).toContain('python');
  });

  test('code block has a delete/remove button', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('codeBlock');
    const deleteBtn = editorPage.page.locator('.ray-code-delete-btn').first();
    await expect(deleteBtn).toBeVisible();
  });

  test('typed text is inside <code>, not in a sibling node', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('codeBlock');
    await editorPage.editor.locator('.ray-code-content').first().click();
    await editorPage.page.keyboard.type('const x = 1;');
    const code = editorPage.editor.locator('.ray-code-block code').first();
    const text = await code.textContent();
    expect(text).toContain('const x = 1;');
  });

  test('Shift+Enter in code block inserts newline, not exit', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('codeBlock');
    await editorPage.editor.locator('.ray-code-content').first().click();
    await editorPage.page.keyboard.type('first');
    await editorPage.page.keyboard.press('Shift+Enter');
    await editorPage.page.keyboard.type('second');
    const html = await editorPage.getHTML();
    // Still in one code block
    expect((html.match(/ray-code-block/g) ?? []).length).toBe(1);
    expect(html).toContain('first');
    expect(html).toContain('second');
  });

  test('data-lang attribute updates when language select changes', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('codeBlock');
    await editorPage.settle();
    // Change to three different languages to confirm the attribute follows
    for (const lang of ['python', 'typescript', 'css']) {
      await editorPage.page.locator('.ray-code-lang-select').first().selectOption(lang);
      await editorPage.settle();
      const html = await editorPage.getHTML();
      expect(html).toContain(`data-lang="${lang}"`);
    }
  });

  test('undo after inserting code block removes it', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('codeBlock');
    await editorPage.settle();
    await editorPage.page.keyboard.press('Control+z');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).not.toContain('ray-code-block');
  });

  test('two code blocks can coexist in the same document', async ({ editorPage }) => {
    await editorPage.editor.click();
    await editorPage.clickBtn('codeBlock');
    await editorPage.editor.locator('.ray-code-content').first().click();
    await editorPage.page.keyboard.type('block one');
    // Exit code block with double-Enter
    await editorPage.page.keyboard.press('Enter');
    await editorPage.page.keyboard.press('Enter');
    await editorPage.clickBtn('codeBlock');
    await editorPage.page.keyboard.type('block two');
    const html = await editorPage.getHTML();
    expect((html.match(/ray-code-block/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
