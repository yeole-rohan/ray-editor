import { test as base, expect, type Page, type Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EditorPage {
  page: Page;
  editor: Locator;
  toolbar: Locator;
  /** Click editor and type text (simulates real keystrokes) */
  type(text: string): Promise<void>;
  /** Click a toolbar button by its data-key attribute */
  clickBtn(key: string): Promise<void>;
  /** Return the raw innerHTML of the editor content area */
  getHTML(): Promise<string>;
  /** Return trimmed plain text content */
  getText(): Promise<string>;
  /** Clear all editor content */
  clear(): Promise<void>;
  /** Simulate paste of HTML string into the editor */
  pasteHTML(html: string): Promise<void>;
  /** Simulate paste of plain text into the editor */
  pasteText(text: string): Promise<void>;
  /** Load a paste fixture file by name (e.g. 'word-2019', 'google-docs') */
  pasteFixture(name: string): Promise<void>;
  /** Select all editor content (Ctrl+A / Cmd+A) */
  selectAll(): Promise<void>;
  /** Wait for editor to settle after DOM mutations */
  settle(): Promise<void>;
}

// ─── Shared fixture ──────────────────────────────────────────────────────────

export const test = base.extend<{ editorPage: EditorPage }>({
  editorPage: async ({ page }, use) => {
    await page.goto('/tests/e2e/test-app.html');

    // Wait for editor to fully mount (toolbar + content area present)
    await page.waitForSelector('.ray-editor-content[contenteditable="true"]');
    await page.waitForSelector('.ray-editor-toolbar');

    // Clear pre-loaded initial content so each test starts with a blank editor
    await page.evaluate(() => {
      const ed = (window as any).editor;
      if (ed?.setContent) ed.setContent('<p><br></p>');
    });
    await page.waitForTimeout(80);

    const editor  = page.locator('.ray-editor-content').first();
    const toolbar = page.locator('.ray-editor-toolbar').first();

    const editorPage: EditorPage = {
      page,
      editor,
      toolbar,

      async type(text: string) {
        await editor.click();
        await page.keyboard.type(text);
      },

      async clickBtn(key: string) {
        // Toolbar buttons use class ray-btn-{key} (e.g. .ray-btn-bold)
        const btn = toolbar.locator(`.ray-btn-${key}`).first();
        await btn.click();
      },

      async getHTML() {
        return editor.evaluate(el => el.innerHTML);
      },

      async getText() {
        return editor.evaluate(el => (el.textContent ?? '').trim());
      },

      async clear() {
        await page.evaluate(() => {
          const ed = (window as any).editor;
          if (ed?.setContent) ed.setContent('<p><br></p>');
        });
        await editorPage.settle();
      },

      async pasteHTML(html: string) {
        await editor.click();
        await page.evaluate((htmlStr: string) => {
          const dt = new DataTransfer();
          dt.setData('text/html', htmlStr);
          dt.setData('text/plain', '');
          const el = document.querySelector('.ray-editor-content')!;
          el.dispatchEvent(
            new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
          );
        }, html);
        await editorPage.settle();
      },

      async pasteText(text: string) {
        // Do NOT click the editor here — that would reset the cursor position.
        // The caller is responsible for positioning the cursor before calling pasteText.
        // Use execCommand('insertText') which goes through the editor's beforeinput handler.
        await page.evaluate((t: string) => {
          const el = document.querySelector('.ray-editor-content') as HTMLElement;
          el.focus();
          document.execCommand('insertText', false, t);
        }, text);
        await editorPage.settle();
      },

      async pasteFixture(name: string) {
        const fixturePath = path.join(
          __dirname, '..', 'paste-html', `${name}.html`
        );
        const html = fs.readFileSync(fixturePath, 'utf-8');
        await editorPage.pasteHTML(html);
      },

      async selectAll() {
        await editor.click();
        await page.keyboard.press('Control+a');
      },

      async settle() {
        // Allow microtasks + setTimeout(0) paste handlers to complete
        await page.waitForTimeout(200);
      },
    };

    await use(editorPage);
  },
});

export { expect };
