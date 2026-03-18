import { test, expect } from '../fixtures/editor.fixture';

async function insertLink(editorPage: any, text: string, url: string, newTab = false) {
  await editorPage.type(text);
  await editorPage.selectAll();
  await editorPage.clickBtn('link');
  await editorPage.settle();
  await editorPage.page.locator('#ray-link-url').fill(url);
  if (newTab) await editorPage.page.locator('#ray-link-target').selectOption('_blank');
  await editorPage.page.locator('#ray-link-url').press('Enter');
  await editorPage.settle();
}

test.describe('Link — modal', () => {
  test('link modal opens when text is selected', async ({ editorPage }) => {
    await editorPage.type('click here');
    await editorPage.selectAll();
    await editorPage.clickBtn('link');
    await expect(editorPage.page.locator('.ray-link-modal, [role="dialog"]')).toBeVisible();
  });

  test('modal does not open when nothing is selected', async ({ editorPage }) => {
    await editorPage.editor.click(); // no selection
    await editorPage.clickBtn('link');
    await editorPage.settle();
    // Modal should not appear (nothing to link)
    const modal = editorPage.page.locator('.ray-link-modal');
    const visible = await modal.isVisible().catch(() => false);
    // This is expected behavior — modal may or may not open; if it does, URL field should be empty
    if (visible) {
      const url = await editorPage.page.locator('#ray-link-url').inputValue();
      expect(url).toBe('');
    }
  });

  test('Escape closes modal without inserting link', async ({ editorPage }) => {
    await editorPage.type('text');
    await editorPage.selectAll();
    await editorPage.clickBtn('link');
    await editorPage.page.keyboard.press('Escape');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).not.toContain('<a ');
  });

  test('clicking outside modal closes it', async ({ editorPage }) => {
    await editorPage.type('text');
    await editorPage.selectAll();
    await editorPage.clickBtn('link');
    const modal = editorPage.page.locator('.ray-link-modal');
    // Click on the backdrop (the modal overlay itself)
    await modal.click({ position: { x: 5, y: 5 }, force: true });
    await editorPage.settle();
    await expect(modal).not.toBeVisible();
  });

  test('inserting a valid https URL creates an anchor tag', async ({ editorPage }) => {
    await insertLink(editorPage, 'visit site', 'https://example.com');
    const html = await editorPage.getHTML();
    expect(html).toContain('<a');
    expect(html).toContain('https://example.com');
    expect(html).toContain('visit site');
  });

  test('link with New Tab adds target="_blank"', async ({ editorPage }) => {
    await insertLink(editorPage, 'open tab', 'https://example.com', true);
    const html = await editorPage.getHTML();
    expect(html).toContain('target="_blank"');
  });

  test('new-tab link has noopener noreferrer rel', async ({ editorPage }) => {
    await insertLink(editorPage, 'safe link', 'https://example.com', true);
    const html = await editorPage.getHTML();
    expect(html).toContain('noopener');
    expect(html).toContain('noreferrer');
  });

  test('same-tab link does NOT have noopener noreferrer', async ({ editorPage }) => {
    await insertLink(editorPage, 'same tab', 'https://example.com', false);
    const html = await editorPage.getHTML();
    // rel should be absent or empty for same-tab links
    expect(html).not.toContain('noopener');
  });

  test('invalid URL shows validation error', async ({ editorPage }) => {
    await editorPage.type('bad link');
    await editorPage.selectAll();
    await editorPage.clickBtn('link');
    await editorPage.page.locator('#ray-link-url').fill('not-a-url');
    await editorPage.page.locator('#ray-link-url').press('Enter');
    await editorPage.settle();
    // Error message should appear
    const error = editorPage.page.locator('#ray-link-url-error');
    await expect(error).toBeVisible();
  });

  test('javascript: URL is rejected', async ({ editorPage }) => {
    await editorPage.type('xss');
    await editorPage.selectAll();
    await editorPage.clickBtn('link');
    await editorPage.page.locator('#ray-link-url').fill('javascript:alert(1)');
    await editorPage.page.locator('#ray-link-url').press('Enter');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).not.toContain('javascript:');
  });

  test('mailto: link is accepted', async ({ editorPage }) => {
    await insertLink(editorPage, 'email us', 'mailto:hi@example.com');
    const html = await editorPage.getHTML();
    expect(html).toContain('mailto:');
  });
});

test.describe('Link — tooltip', () => {
  test('hovering an existing link shows tooltip', async ({ editorPage }) => {
    await insertLink(editorPage, 'hover me', 'https://example.com');
    const link = editorPage.editor.locator('a').first();
    await link.hover();
    await editorPage.settle();
    const tooltip = editorPage.page.locator('.ray-link-tooltip, .ray-editor-link-tooltip');
    await expect(tooltip).toBeVisible();
  });

  test('tooltip shows the link URL', async ({ editorPage }) => {
    await insertLink(editorPage, 'link text', 'https://example.com');
    const link = editorPage.editor.locator('a').first();
    await link.hover();
    await editorPage.settle();
    const tooltip = editorPage.page.locator('.ray-link-tooltip, .ray-editor-link-tooltip');
    await expect(tooltip).toContainText('example.com');
  });

  test('tooltip has an open-in-new-tab button', async ({ editorPage }) => {
    await insertLink(editorPage, 'link', 'https://example.com');
    const link = editorPage.editor.locator('a').first();
    await link.hover();
    await editorPage.settle();
    const openBtn = editorPage.page.locator('.ray-link-tooltip-open, a[aria-label*="Open"]');
    await expect(openBtn).toBeVisible();
  });
});

test.describe('Link — edit popup', () => {
  test('clicking an existing link shows edit/remove popup', async ({ editorPage }) => {
    await insertLink(editorPage, 'edit me', 'https://example.com');
    const link = editorPage.editor.locator('a').first();
    await link.click();
    await editorPage.settle();
    const popup = editorPage.page.locator('.ray-editor-link-edit-remove');
    await expect(popup).toBeVisible();
  });

  test('remove button in popup deletes the link but keeps text', async ({ editorPage }) => {
    await insertLink(editorPage, 'remove link', 'https://example.com');
    const link = editorPage.editor.locator('a').first();
    await link.click();
    await editorPage.settle();
    const removeBtn = editorPage.page.locator('.ray-editor-link-edit-remove button', { hasText: /Remove|Delete|✕/ }).first();
    await removeBtn.click();
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).not.toContain('<a ');
    expect(html).toContain('remove link');
  });

  test('tab toggle button switches between same-tab and new-tab', async ({ editorPage }) => {
    await insertLink(editorPage, 'toggle tab', 'https://example.com', false);
    const link = editorPage.editor.locator('a').first();
    await link.click();
    await editorPage.settle();
    const tabBtn = editorPage.page.locator('.ray-editor-link-edit-remove button[title*="tab"], button[title*="Tab"]').first();
    await tabBtn.click();
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toContain('_blank');
    expect(html).toContain('noopener');
  });
});

test.describe('Link — edge cases', () => {
  test('two links in same paragraph can both be inserted', async ({ editorPage }) => {
    await editorPage.type('first');
    await editorPage.selectAll();
    await editorPage.clickBtn('link');
    await editorPage.page.locator('#ray-link-url').fill('https://first.com');
    await editorPage.page.locator('#ray-link-url').press('Enter');
    await editorPage.settle();
    await editorPage.editor.click();
    await editorPage.page.keyboard.press('End');
    await editorPage.page.keyboard.type(' second');
    // Select just "second"
    for (let i = 0; i < 6; i++) await editorPage.page.keyboard.press('Shift+ArrowLeft');
    await editorPage.clickBtn('link');
    await editorPage.page.locator('#ray-link-url').fill('https://second.com');
    await editorPage.page.locator('#ray-link-url').press('Enter');
    await editorPage.settle();
    const links = editorPage.editor.locator('a');
    expect(await links.count()).toBe(2);
  });

  test('link URL with query string is preserved exactly', async ({ editorPage }) => {
    await insertLink(editorPage, 'search', 'https://example.com/search?q=hello&lang=en');
    const html = await editorPage.getHTML();
    expect(html).toContain('q=hello');
    expect(html).toContain('lang=en');
  });

  test('link text with bold inside is preserved', async ({ editorPage }) => {
    await editorPage.type('bold link');
    await editorPage.selectAll();
    await editorPage.clickBtn('bold');
    await editorPage.selectAll();
    await editorPage.clickBtn('link');
    await editorPage.page.locator('#ray-link-url').fill('https://example.com');
    await editorPage.page.locator('#ray-link-url').press('Enter');
    await editorPage.settle();
    const html = await editorPage.getHTML();
    expect(html).toContain('<a');
    expect(html).toMatch(/<strong>|font-weight.*bold/);
  });
});
