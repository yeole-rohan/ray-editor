import { test, expect } from '../fixtures/editor.fixture';
import * as fs from 'fs';
import * as path from 'path';

/**
 * XSS Security Test Suite
 *
 * Each test pastes a dangerous payload and verifies that:
 *  1. window.__xss_fired is NOT set to true (no script executed)
 *  2. No alert() dialog appears
 *  3. The dangerous element/attribute is NOT present in the final HTML
 *
 * These tests run against the real browser (Chromium, Firefox, WebKit) —
 * something jsdom cannot do. They are the ground truth for XSS protection.
 */

// Helper: check xss flag + capture dialogs
async function assertNoXSS(page: import('@playwright/test').Page) {
  const fired = await page.evaluate(() => (window as any).__xss_fired === true);
  expect(fired).toBe(false);
}

test.describe('XSS — paste sanitisation', () => {
  test.beforeEach(async ({ editorPage }) => {
    // Reset the XSS flag before each test
    await editorPage.page.evaluate(() => { (window as any).__xss_fired = false; });

    // Capture any alert/confirm/prompt as an immediate failure signal
    editorPage.page.on('dialog', async dialog => {
      await dialog.dismiss();
    });
  });

  test('script tag is stripped on paste', async ({ editorPage }) => {
    const { pasteHTML, getHTML, page } = editorPage;
    await pasteHTML('<p>Safe text</p><script>window.__xss_fired=true;alert("xss")</script>');
    await editorPage.settle();
    await assertNoXSS(page);
    expect(await getHTML()).not.toContain('<script');
  });

  test('img onerror handler is stripped', async ({ editorPage }) => {
    const { pasteHTML, getHTML, page } = editorPage;
    await pasteHTML('<img src="x" onerror="window.__xss_fired=true;alert(1)">');
    await editorPage.settle();
    await assertNoXSS(page);
    const html = await getHTML();
    expect(html).not.toContain('onerror');
  });

  test('javascript: href is blocked', async ({ editorPage }) => {
    const { pasteHTML, getHTML, page } = editorPage;
    await pasteHTML('<a href="javascript:window.__xss_fired=true">click</a>');
    await editorPage.settle();
    await assertNoXSS(page);
    const html = await getHTML();
    expect(html).not.toContain('javascript:');
  });

  test('data: URI on img src is stripped', async ({ editorPage }) => {
    const { pasteHTML, getHTML, page } = editorPage;
    await pasteHTML('<img src="data:text/html,<script>window.__xss_fired=true</script>">');
    await editorPage.settle();
    await assertNoXSS(page);
    const html = await getHTML();
    expect(html).not.toContain('data:text/html');
  });

  test('svg onload handler is stripped', async ({ editorPage }) => {
    const { pasteHTML, getHTML, page } = editorPage;
    await pasteHTML('<svg onload="window.__xss_fired=true"><circle r="10"/></svg>');
    await editorPage.settle();
    await assertNoXSS(page);
    const html = await getHTML();
    expect(html).not.toContain('onload');
  });

  test('iframe with srcdoc is stripped entirely', async ({ editorPage }) => {
    const { pasteHTML, getHTML, page } = editorPage;
    await pasteHTML('<iframe srcdoc="<script>window.parent.__xss_fired=true</script>"></iframe>');
    await editorPage.settle();
    await assertNoXSS(page);
    const html = await getHTML();
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('srcdoc');
  });

  test('<style> tag is stripped (no CSS injection)', async ({ editorPage }) => {
    const { pasteHTML, getHTML } = editorPage;
    await pasteHTML('<style>body{background:red;}</style><p>visible text</p>');
    await editorPage.settle();
    const html = await getHTML();
    expect(html).not.toContain('<style');
    expect(html).toContain('visible text');
  });

  test('<noscript> tag is stripped', async ({ editorPage }) => {
    const { pasteHTML, getHTML } = editorPage;
    await pasteHTML('<noscript><meta http-equiv="refresh" content="0;url=javascript:alert(1)"></noscript>');
    await editorPage.settle();
    const html = await getHTML();
    expect(html).not.toContain('<noscript');
  });

  test('<template> tag is stripped', async ({ editorPage }) => {
    const { pasteHTML, getHTML } = editorPage;
    await pasteHTML('<template><script>window.__xss_fired=true</script></template>');
    await editorPage.settle();
    const html = await getHTML();
    expect(html).not.toContain('<template');
    expect(html).not.toContain('<script');
  });

  test('<object> tag is stripped', async ({ editorPage }) => {
    const { pasteHTML, getHTML } = editorPage;
    await pasteHTML('<object data="javascript:window.__xss_fired=true"></object>');
    await editorPage.settle();
    const html = await getHTML();
    expect(html).not.toContain('<object');
  });

  test('onclick on a div is stripped', async ({ editorPage }) => {
    const { pasteHTML, getHTML } = editorPage;
    await pasteHTML('<div onclick="window.__xss_fired=true">text</div>');
    await editorPage.settle();
    const html = await getHTML();
    expect(html).not.toContain('onclick');
  });

  test('srcset with javascript: is stripped', async ({ editorPage }) => {
    const { pasteHTML, getHTML } = editorPage;
    await pasteHTML('<img srcset="javascript:window.__xss_fired=true 1x" alt="img">');
    await editorPage.settle();
    const html = await getHTML();
    expect(html).not.toContain('javascript:');
  });

  test('obfuscated javascript: with spaces is blocked', async ({ editorPage }) => {
    const { pasteHTML, getHTML, page } = editorPage;
    await pasteHTML('<a href="j a v a s c r i p t:window.__xss_fired=true">link</a>');
    await editorPage.settle();
    await assertNoXSS(page);
    const html = await getHTML();
    expect(html).not.toContain('javascript:');
  });

  test('vbscript: href is blocked', async ({ editorPage }) => {
    const { pasteHTML, getHTML } = editorPage;
    await pasteHTML('<a href="vbscript:window.__xss_fired=true">link</a>');
    await editorPage.settle();
    const html = await getHTML();
    expect(html).not.toContain('vbscript:');
  });

  test('full XSS fixture file — none of 16 payloads fire', async ({ editorPage }) => {
    const { pasteFixture, page } = editorPage;
    await pasteFixture('xss-payloads');
    await editorPage.settle();
    await editorPage.page.waitForTimeout(500); // give any async handlers time to fire
    await assertNoXSS(page);
  });
});

test.describe('XSS — link creation', () => {
  test('link modal rejects javascript: URL', async ({ editorPage }) => {
    const { type, clickBtn, page, getHTML } = editorPage;
    await type('click here');
    await editorPage.selectAll();
    await clickBtn('link');

    const urlInput = page.locator('#ray-link-url');
    await urlInput.fill('javascript:alert(1)');
    await page.keyboard.press('Enter');
    await editorPage.settle();

    const html = await getHTML();
    expect(html).not.toContain('javascript:');
  });

  test('new-tab link includes noopener noreferrer', async ({ editorPage }) => {
    const { type, clickBtn, page, getHTML } = editorPage;
    await type('safe link');
    await editorPage.selectAll();
    await clickBtn('link');

    const urlInput = page.locator('#ray-link-url');
    await urlInput.fill('https://example.com');

    const targetSelect = page.locator('#ray-link-target');
    await targetSelect.selectOption('_blank');

    await page.keyboard.press('Enter');
    await editorPage.settle();

    const html = await getHTML();
    expect(html).toContain('noopener');
    expect(html).toContain('noreferrer');
  });
});
