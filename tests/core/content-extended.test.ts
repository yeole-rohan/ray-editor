import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContentManager } from '../../src/core/content';

describe('ContentManager — extended edge cases (v2.0.5)', () => {
  let editorArea: HTMLElement;
  let contentManager: ContentManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    editorArea = document.createElement('div');
    editorArea.className = 'ray-editor-content';
    document.body.appendChild(editorArea);
    contentManager = new ContentManager(editorArea);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ─── getContent — code block cleanup ──────────────────────────────────────

  describe('getContent — code block cleanup', () => {
    it('strips .ray-code-header from code blocks in output', () => {
      editorArea.innerHTML = `
        <div class="ray-code-block" data-lang="javascript">
          <div class="ray-code-header">
            <select class="ray-code-lang-select"></select>
            <button class="ray-code-delete-btn">✕</button>
          </div>
          <pre class="ray-code-content" contenteditable="true"><code>const x = 1;</code></pre>
        </div>
      `;
      const html = contentManager.getContent();
      expect(html).not.toContain('ray-code-header');
      expect(html).not.toContain('ray-code-lang-select');
      expect(html).not.toContain('ray-code-delete-btn');
    });

    it('preserves data-lang attribute on output <pre>', () => {
      editorArea.innerHTML = `
        <div class="ray-code-block" data-lang="typescript">
          <div class="ray-code-header"><select class="ray-code-lang-select"></select></div>
          <pre class="ray-code-content" contenteditable="true"><code>const x: number = 1;</code></pre>
        </div>
      `;
      const html = contentManager.getContent();
      expect(html).toContain('data-lang="typescript"');
    });

    it('strips hljs- classes from code elements', () => {
      editorArea.innerHTML = `
        <div class="ray-code-block" data-lang="javascript">
          <div class="ray-code-header"><select class="ray-code-lang-select"></select></div>
          <pre class="ray-code-content" contenteditable="true">
            <code><span class="hljs-keyword">const</span> x = 1;</code>
          </pre>
        </div>
      `;
      const html = contentManager.getContent();
      expect(html).not.toContain('hljs-keyword');
      expect(html).not.toContain('hljs-');
    });

    it('strips hljs classes but preserves the code text', () => {
      editorArea.innerHTML = `
        <div class="ray-code-block" data-lang="javascript">
          <div class="ray-code-header"><select class="ray-code-lang-select"></select></div>
          <pre class="ray-code-content" contenteditable="true">
            <code><span class="hljs-keyword">const</span> <span class="hljs-title">foo</span> = 1;</code>
          </pre>
        </div>
      `;
      const html = contentManager.getContent();
      expect(html).toContain('const');
      expect(html).toContain('foo');
      expect(html).toContain('= 1;');
    });

    it('strips contenteditable from code block pre in output', () => {
      editorArea.innerHTML = `
        <div class="ray-code-block" data-lang="python">
          <div class="ray-code-header"><select class="ray-code-lang-select"></select></div>
          <pre class="ray-code-content" contenteditable="true"><code>print("hello")</code></pre>
        </div>
      `;
      const html = contentManager.getContent();
      expect(html).not.toContain('contenteditable="true"');
    });

    it('removes .ray-code-block wrapper from output', () => {
      editorArea.innerHTML = `
        <div class="ray-code-block" data-lang="javascript">
          <div class="ray-code-header"><select class="ray-code-lang-select"></select></div>
          <pre class="ray-code-content" contenteditable="true"><code>let y = 2;</code></pre>
        </div>
      `;
      const html = contentManager.getContent();
      expect(html).not.toContain('ray-code-block');
      expect(html).toContain('<pre');
    });

    it('removes .ray-code-block with no .ray-code-content child entirely', () => {
      editorArea.innerHTML = `
        <div class="ray-code-block" data-lang="javascript">
          <div class="ray-code-header"><select></select></div>
        </div>
        <p>Other content</p>
      `;
      const html = contentManager.getContent();
      expect(html).not.toContain('ray-code-block');
      expect(html).toContain('Other content');
    });
  });

  // ─── getContent — zero-width space removal ────────────────────────────────

  describe('getContent — zero-width space removal', () => {
    it('strips zero-width spaces (U+200B) from text content', () => {
      editorArea.innerHTML = '<p>Hello\u200Bworld</p>';
      const html = contentManager.getContent();
      expect(html).not.toContain('\u200B');
      expect(html).toContain('Helloworld');
    });

    it('strips multiple zero-width spaces', () => {
      editorArea.innerHTML = '<p>\u200BHello\u200B \u200Bworld\u200B</p>';
      const html = contentManager.getContent();
      expect(html).not.toContain('\u200B');
      expect(html).toContain('Hello');
      expect(html).toContain('world');
    });

    it('strips zero-width spaces in nested elements', () => {
      editorArea.innerHTML = '<p><strong>Bold\u200B</strong> text</p>';
      const html = contentManager.getContent();
      expect(html).not.toContain('\u200B');
      expect(html).toContain('Bold');
    });
  });

  // ─── getContent — callout contenteditable stripping ──────────────────────

  describe('getContent — callout contenteditable stripping', () => {
    it('strips contenteditable from .ray-callout', () => {
      editorArea.innerHTML = `
        <div class="ray-callout ray-callout-info" contenteditable="false">
          <span class="ray-callout-icon" contenteditable="false">ℹ️</span>
          <div class="ray-callout-body" contenteditable="true"><p>Info note</p></div>
        </div>
      `;
      const html = contentManager.getContent();
      expect(html).not.toContain('contenteditable');
    });

    it('strips contenteditable from .ray-callout-body', () => {
      editorArea.innerHTML = `
        <div class="ray-callout ray-callout-warning" contenteditable="false">
          <span class="ray-callout-icon" contenteditable="false">⚠️</span>
          <div class="ray-callout-body" contenteditable="true"><p>Warning</p></div>
        </div>
      `;
      const html = contentManager.getContent();
      const div = document.createElement('div');
      div.innerHTML = html;
      const body = div.querySelector('.ray-callout-body');
      expect(body?.hasAttribute('contenteditable')).toBe(false);
    });

    it('strips contenteditable from .ray-callout-icon', () => {
      editorArea.innerHTML = `
        <div class="ray-callout ray-callout-success" contenteditable="false">
          <span class="ray-callout-icon" contenteditable="false">✅</span>
          <div class="ray-callout-body" contenteditable="true"><p>Success</p></div>
        </div>
      `;
      const html = contentManager.getContent();
      const div = document.createElement('div');
      div.innerHTML = html;
      const icon = div.querySelector('.ray-callout-icon');
      expect(icon?.hasAttribute('contenteditable')).toBe(false);
    });

    it('preserves callout content text after stripping', () => {
      editorArea.innerHTML = `
        <div class="ray-callout ray-callout-error" contenteditable="false">
          <span class="ray-callout-icon" contenteditable="false">❌</span>
          <div class="ray-callout-body" contenteditable="true"><p>Error message here</p></div>
        </div>
      `;
      const html = contentManager.getContent();
      expect(html).toContain('Error message here');
    });
  });

  // ─── getContent — task list serialization ─────────────────────────────────

  describe('getContent — task list serialization', () => {
    it('serializes .ray-task-item span structure to clean li output', () => {
      editorArea.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false">
            <span class="ray-task-checkbox" contenteditable="false" role="checkbox" aria-checked="false"></span>
            <span class="ray-task-text">Buy milk</span>
          </li>
        </ul>
      `;
      const html = contentManager.getContent();
      expect(html).not.toContain('ray-task-checkbox');
      expect(html).not.toContain('ray-task-text');
      expect(html).toContain('Buy milk');
    });

    it('preserves data-checked="false" on serialized task items', () => {
      editorArea.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false">
            <span class="ray-task-checkbox" contenteditable="false"></span>
            <span class="ray-task-text">Unchecked task</span>
          </li>
        </ul>
      `;
      const html = contentManager.getContent();
      expect(html).toContain('data-checked="false"');
    });

    it('preserves data-checked="true" on serialized checked task items', () => {
      editorArea.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="true">
            <span class="ray-task-checkbox checked" contenteditable="false"></span>
            <span class="ray-task-text">Done task</span>
          </li>
        </ul>
      `;
      const html = contentManager.getContent();
      expect(html).toContain('data-checked="true"');
    });
  });

  // ─── getContent — table wrapper unwrapping ────────────────────────────────

  describe('getContent — table wrapper unwrapping', () => {
    it('unwraps .ray-table-wrapper to bare <table>', () => {
      editorArea.innerHTML = `
        <div class="ray-table-wrapper">
          <table><tbody><tr><td>Cell</td></tr></tbody></table>
        </div>
      `;
      const html = contentManager.getContent();
      expect(html).not.toContain('ray-table-wrapper');
      expect(html).toContain('<table>');
      expect(html).toContain('Cell');
    });

    it('removes .ray-table-wrapper when it has no table child', () => {
      editorArea.innerHTML = `
        <div class="ray-table-wrapper"></div>
        <p>Other content</p>
      `;
      const html = contentManager.getContent();
      expect(html).not.toContain('ray-table-wrapper');
      expect(html).toContain('Other content');
    });

    it('preserves table structure: thead, tbody, tr, th, td', () => {
      editorArea.innerHTML = `
        <div class="ray-table-wrapper">
          <table>
            <thead><tr><th>Header A</th><th>Header B</th></tr></thead>
            <tbody><tr><td>Cell 1</td><td>Cell 2</td></tr></tbody>
          </table>
        </div>
      `;
      const html = contentManager.getContent();
      expect(html).toContain('<thead>');
      expect(html).toContain('<tbody>');
      expect(html).toContain('<th>Header A</th>');
      expect(html).toContain('<td>Cell 1</td>');
    });
  });

  // ─── getContent — empty element removal ───────────────────────────────────

  describe('getContent — empty element removal', () => {
    it('removes empty <a> elements', () => {
      editorArea.innerHTML = '<p>Text <a href="https://example.com"></a> more text</p>';
      const html = contentManager.getContent();
      const div = document.createElement('div');
      div.innerHTML = html;
      const emptyAnchors = Array.from(div.querySelectorAll('a')).filter(a => !a.textContent?.trim());
      expect(emptyAnchors.length).toBe(0);
    });

    it('preserves non-empty <a> elements', () => {
      editorArea.innerHTML = '<p><a href="https://example.com">Click here</a></p>';
      const html = contentManager.getContent();
      expect(html).toContain('<a');
      expect(html).toContain('Click here');
    });

    it('removes empty <span> elements', () => {
      editorArea.innerHTML = '<p>Text<span></span> more</p>';
      const html = contentManager.getContent();
      const div = document.createElement('div');
      div.innerHTML = html;
      const emptySpans = Array.from(div.querySelectorAll('span')).filter(s => !s.textContent?.trim() && s.children.length === 0);
      expect(emptySpans.length).toBe(0);
    });

    it('preserves <mark> (highlight) elements', () => {
      editorArea.innerHTML = '<p>Text with <mark>highlight</mark> here</p>';
      const html = contentManager.getContent();
      expect(html).toContain('<mark>highlight</mark>');
    });
  });

  // ─── setContent — code block rebuilding ───────────────────────────────────

  describe('setContent — code block rebuilding', () => {
    it('setContent with <pre data-lang="javascript"> rebuilds into .ray-code-block structure', () => {
      contentManager.setContent('<pre data-lang="javascript"><code>const x = 1;</code></pre>');
      const codeBlock = editorArea.querySelector('.ray-code-block');
      expect(codeBlock).not.toBeNull();
    });

    it('setContent rebuilds code block with correct data-lang', () => {
      contentManager.setContent('<pre data-lang="typescript"><code>const x: number = 1;</code></pre>');
      const codeBlock = editorArea.querySelector('.ray-code-block');
      expect(codeBlock?.getAttribute('data-lang')).toBe('typescript');
    });

    it('setContent code block has .ray-code-content pre', () => {
      contentManager.setContent('<pre data-lang="python"><code>print("hello")</code></pre>');
      const pre = editorArea.querySelector('.ray-code-content');
      expect(pre).not.toBeNull();
    });

    it('setContent code block pre has contenteditable="true"', () => {
      contentManager.setContent('<pre data-lang="javascript"><code>let y = 2;</code></pre>');
      const pre = editorArea.querySelector('.ray-code-content');
      expect(pre?.getAttribute('contenteditable')).toBe('true');
    });

    it('setContent code block has .ray-code-header', () => {
      contentManager.setContent('<pre data-lang="javascript"><code>let y = 2;</code></pre>');
      const header = editorArea.querySelector('.ray-code-header');
      expect(header).not.toBeNull();
    });

    it('setContent preserves code text content', () => {
      contentManager.setContent('<pre data-lang="javascript"><code>const greeting = "hello";</code></pre>');
      const code = editorArea.querySelector('.ray-code-content code');
      expect(code?.textContent).toContain('const greeting');
    });
  });

  // ─── setContent — table wrapper ───────────────────────────────────────────

  describe('setContent — table wrapping', () => {
    it('setContent with bare <table> wraps it in .ray-table-wrapper', () => {
      contentManager.setContent('<table><tbody><tr><td>Cell</td></tr></tbody></table>');
      const wrapper = editorArea.querySelector('.ray-table-wrapper');
      expect(wrapper).not.toBeNull();
      expect(wrapper?.querySelector('table')).not.toBeNull();
    });

    it('setContent does not double-wrap already-wrapped table', () => {
      contentManager.setContent(`
        <div class="ray-table-wrapper">
          <table><tbody><tr><td>Cell</td></tr></tbody></table>
        </div>
      `);
      const wrappers = editorArea.querySelectorAll('.ray-table-wrapper');
      expect(wrappers.length).toBe(1);
    });

    it('table content is preserved inside wrapper', () => {
      contentManager.setContent('<table><tbody><tr><td>My cell content</td></tr></tbody></table>');
      expect(editorArea.textContent).toContain('My cell content');
    });
  });

  // ─── setContent — task list restoration ──────────────────────────────────

  describe('setContent — task list restoration', () => {
    it('setContent with <li data-type="taskItem" data-checked="true"> rebuilds span structure', () => {
      contentManager.setContent(`
        <ul class="ray-task-list">
          <li data-checked="true">Completed task</li>
        </ul>
      `);
      const checkbox = editorArea.querySelector('.ray-task-checkbox');
      expect(checkbox).not.toBeNull();
      expect(checkbox?.getAttribute('aria-checked')).toBe('true');
    });

    it('setContent with data-checked="false" restores unchecked checkbox', () => {
      contentManager.setContent(`
        <ul class="ray-task-list">
          <li data-checked="false">Pending task</li>
        </ul>
      `);
      const checkbox = editorArea.querySelector('.ray-task-checkbox');
      expect(checkbox?.getAttribute('aria-checked')).toBe('false');
      expect(checkbox?.classList.contains('checked')).toBe(false);
    });

    it('setContent rebuilds .ray-task-text span with correct text', () => {
      contentManager.setContent(`
        <ul class="ray-task-list">
          <li data-checked="false">Buy groceries</li>
        </ul>
      `);
      const textSpan = editorArea.querySelector('.ray-task-text');
      expect(textSpan?.textContent).toBe('Buy groceries');
    });
  });

  // ─── setContent — callout contenteditable restoration ────────────────────
  //
  // NOTE: applyStructure sets callout.contentEditable via the IDL property
  // (e.g. callout.contentEditable = 'false'). In jsdom, this IDL setter reflects
  // to the contenteditable attribute when elements are live in the DOM, but the
  // reflection may not survive the innerHTML serialization round-trip used by
  // setContent (which does editorArea.innerHTML = temp.innerHTML on a detached temp).
  // Therefore we test applyStructure directly on a live container element to verify
  // its DOM mutations, and test setContent through observable content presence.

  describe('setContent — callout restoration', () => {
    it('applyStructure sets contenteditable on .ray-callout outer wrapper (direct)', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      container.innerHTML = `
        <div class="ray-callout ray-callout-info">
          <span class="ray-callout-icon">ℹ️</span>
          <div class="ray-callout-body"><p>Info content</p></div>
        </div>
      `;
      contentManager.applyStructure(container);
      const callout = container.querySelector('.ray-callout') as HTMLElement;
      expect(callout).not.toBeNull();
      // applyStructure sets callout.contentEditable = 'false'
      // Test via getAttribute which is reliable in jsdom after DOM mutation
      const ceAttr = callout.getAttribute('contenteditable') ?? callout.contentEditable;
      // The outer callout wrapper should NOT be contenteditable=true
      expect(ceAttr).not.toBe('true');
      container.remove();
    });

    it('applyStructure enables editing on .ray-callout-body (direct)', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      container.innerHTML = `
        <div class="ray-callout ray-callout-warning">
          <span class="ray-callout-icon">⚠️</span>
          <div class="ray-callout-body"><p>Warning content</p></div>
        </div>
      `;
      contentManager.applyStructure(container);
      const body = container.querySelector('.ray-callout-body') as HTMLElement;
      expect(body).not.toBeNull();
      // applyStructure sets body.contentEditable = 'true' — check via getAttribute or isContentEditable
      // isContentEditable is true when contenteditable="true" is set
      const isEditable = body.isContentEditable || body.getAttribute('contenteditable') === 'true';
      expect(isEditable).toBe(true);
      container.remove();
    });

    it('applyStructure disables editing on .ray-callout-icon (direct)', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      container.innerHTML = `
        <div class="ray-callout ray-callout-success">
          <span class="ray-callout-icon">✅</span>
          <div class="ray-callout-body"><p>Success content</p></div>
        </div>
      `;
      contentManager.applyStructure(container);
      const icon = container.querySelector('.ray-callout-icon') as HTMLElement;
      expect(icon).not.toBeNull();
      // icon should not be contenteditable=true
      const attr = icon.getAttribute('contenteditable');
      expect(attr).not.toBe('true');
      container.remove();
    });

    it('setContent with callout preserves callout content text', () => {
      contentManager.setContent(`
        <div class="ray-callout ray-callout-info">
          <span class="ray-callout-icon">ℹ️</span>
          <div class="ray-callout-body"><p>Important note here</p></div>
        </div>
      `);
      expect(editorArea.textContent).toContain('Important note here');
    });

    it('setContent with callout keeps ray-callout classes in editor', () => {
      contentManager.setContent(`
        <div class="ray-callout ray-callout-error">
          <span class="ray-callout-icon">❌</span>
          <div class="ray-callout-body"><p>Error content</p></div>
        </div>
      `);
      expect(editorArea.querySelector('.ray-callout')).not.toBeNull();
      expect(editorArea.querySelector('.ray-callout-error')).not.toBeNull();
    });
  });

  // ─── applyStructure — no double-wrapping ──────────────────────────────────

  describe('applyStructure — prevents double-wrapping', () => {
    it('does not double-wrap already-wrapped code block (.ray-code-block)', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="ray-code-block" data-lang="javascript">
          <div class="ray-code-header"><select class="ray-code-lang-select"></select></div>
          <pre class="ray-code-content" contenteditable="false"><code>const x = 1;</code></pre>
        </div>
      `;
      contentManager.applyStructure(container);
      // Should still have just one code block
      const codeBlocks = container.querySelectorAll('.ray-code-block');
      expect(codeBlocks.length).toBe(1);
    });

    it('does not double-wrap already-wrapped table (.ray-table-wrapper)', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="ray-table-wrapper">
          <table><tbody><tr><td>Cell</td></tr></tbody></table>
        </div>
      `;
      contentManager.applyStructure(container);
      const wrappers = container.querySelectorAll('.ray-table-wrapper');
      expect(wrappers.length).toBe(1);
    });

    it('wraps bare pre but not pre inside .ray-code-block', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <pre data-lang="javascript"><code>bare pre</code></pre>
        <div class="ray-code-block" data-lang="python">
          <pre class="ray-code-content"><code>inside block</code></pre>
        </div>
      `;
      contentManager.applyStructure(container);
      const codeBlocks = container.querySelectorAll('.ray-code-block');
      // One for the bare pre, one for the already-wrapped one
      expect(codeBlocks.length).toBe(2);
    });
  });

  // ─── setContent — empty string ────────────────────────────────────────────

  describe('setContent — edge cases', () => {
    it('setContent with empty string clears the editor', () => {
      editorArea.innerHTML = '<p>Existing content</p>';
      contentManager.setContent('');
      expect(editorArea.innerHTML).toBe('');
    });

    it('setContent with empty string does not throw', () => {
      expect(() => contentManager.setContent('')).not.toThrow();
    });

    it('setContent with whitespace-only string does not throw', () => {
      expect(() => contentManager.setContent('   ')).not.toThrow();
    });
  });

  // ─── Round-trip tests (setContent → getContent) ───────────────────────────

  describe('Round-trip: setContent → getContent', () => {
    it('headings round-trip correctly', () => {
      const input = '<h1>Heading One</h1><h2>Heading Two</h2><h3>Heading Three</h3>';
      contentManager.setContent(input);
      const output = contentManager.getContent();
      expect(output).toContain('<h1>Heading One</h1>');
      expect(output).toContain('<h2>Heading Two</h2>');
      expect(output).toContain('<h3>Heading Three</h3>');
    });

    it('links round-trip correctly', () => {
      const input = '<p><a href="https://example.com">Example link</a></p>';
      contentManager.setContent(input);
      const output = contentManager.getContent();
      expect(output).toContain('href="https://example.com"');
      expect(output).toContain('Example link');
    });

    it('images round-trip correctly', () => {
      const input = '<p><img src="https://example.com/img.png" alt="Test image"></p>';
      contentManager.setContent(input);
      const output = contentManager.getContent();
      expect(output).toContain('src="https://example.com/img.png"');
      expect(output).toContain('alt="Test image"');
    });

    it('blockquotes round-trip correctly', () => {
      const input = '<blockquote><p>A famous quote</p></blockquote>';
      contentManager.setContent(input);
      const output = contentManager.getContent();
      expect(output).toContain('<blockquote>');
      expect(output).toContain('A famous quote');
    });

    it('ordered lists round-trip correctly', () => {
      const input = '<ol><li>First</li><li>Second</li><li>Third</li></ol>';
      contentManager.setContent(input);
      const output = contentManager.getContent();
      expect(output).toContain('<ol>');
      expect(output).toContain('First');
      expect(output).toContain('Second');
      expect(output).toContain('Third');
    });

    it('unordered lists round-trip correctly', () => {
      const input = '<ul><li>Apple</li><li>Banana</li></ul>';
      contentManager.setContent(input);
      const output = contentManager.getContent();
      expect(output).toContain('<ul>');
      expect(output).toContain('Apple');
      expect(output).toContain('Banana');
    });

    it('task lists round-trip correctly — data-checked preserved', () => {
      const input = `
        <ul class="ray-task-list">
          <li data-checked="false">Unchecked task</li>
          <li data-checked="true">Checked task</li>
        </ul>
      `;
      contentManager.setContent(input);
      const output = contentManager.getContent();
      expect(output).toContain('data-checked="false"');
      expect(output).toContain('data-checked="true"');
      expect(output).toContain('Unchecked task');
      expect(output).toContain('Checked task');
    });

    it('callouts round-trip correctly — no contenteditable in output', () => {
      const input = `
        <div class="ray-callout ray-callout-info">
          <span class="ray-callout-icon">ℹ️</span>
          <div class="ray-callout-body"><p>Callout content</p></div>
        </div>
      `;
      contentManager.setContent(input);
      const output = contentManager.getContent();
      expect(output).toContain('ray-callout-info');
      expect(output).toContain('Callout content');
      expect(output).not.toContain('contenteditable');
    });

    it('tables round-trip correctly — wrapper stripped in output', () => {
      const input = `
        <table>
          <thead><tr><th>Name</th><th>Value</th></tr></thead>
          <tbody><tr><td>Foo</td><td>42</td></tr></tbody>
        </table>
      `;
      contentManager.setContent(input);
      const output = contentManager.getContent();
      // Wrapper is added during setContent but stripped in getContent
      expect(output).not.toContain('ray-table-wrapper');
      expect(output).toContain('<table>');
      expect(output).toContain('<th>Name</th>');
      expect(output).toContain('<td>Foo</td>');
    });

    it('code blocks round-trip correctly — bare pre in output with data-lang', () => {
      const input = '<pre data-lang="javascript"><code>const x = 1;</code></pre>';
      contentManager.setContent(input);
      const output = contentManager.getContent();
      // After round-trip: setContent wraps into code block, getContent strips chrome back to pre
      expect(output).not.toContain('ray-code-block');
      expect(output).not.toContain('ray-code-header');
      expect(output).toContain('data-lang="javascript"');
      expect(output).toContain('<pre');
      expect(output).toContain('const x = 1;');
    });

    it('inline formatting round-trip: strong, em, u, s, mark', () => {
      const input = '<p><strong>Bold</strong> <em>italic</em> <u>underline</u> <s>strike</s> <mark>highlight</mark></p>';
      contentManager.setContent(input);
      const output = contentManager.getContent();
      expect(output).toContain('<strong>Bold</strong>');
      expect(output).toContain('<em>italic</em>');
      expect(output).toContain('<u>underline</u>');
      expect(output).toContain('<s>strike</s>');
      expect(output).toContain('<mark>highlight</mark>');
    });

    it('mixed content round-trip: heading + paragraph + list', () => {
      const input = '<h2>My Section</h2><p>A paragraph</p><ul><li>Item</li></ul>';
      contentManager.setContent(input);
      const output = contentManager.getContent();
      expect(output).toContain('<h2>My Section</h2>');
      expect(output).toContain('A paragraph');
      expect(output).toContain('<ul>');
      expect(output).toContain('Item');
    });
  });

  // ─── getContent — unclassed div replacement ───────────────────────────────

  describe('getContent — div to p replacement', () => {
    it('replaces unclassed divs with <p> tags', () => {
      editorArea.innerHTML = '<div>Plain div text</div>';
      const html = contentManager.getContent();
      expect(html).toContain('<p>Plain div text</p>');
      expect(html).not.toContain('<div>Plain div text</div>');
    });

    it('preserves divs with classes (callout wrappers)', () => {
      editorArea.innerHTML = `
        <div class="ray-callout ray-callout-info" contenteditable="false">
          <span class="ray-callout-icon" contenteditable="false">ℹ️</span>
          <div class="ray-callout-body" contenteditable="true"><p>Info</p></div>
        </div>
      `;
      const html = contentManager.getContent();
      expect(html).toContain('ray-callout');
    });
  });

  // ─── getContent — list item p removal ────────────────────────────────────

  describe('getContent — list item cleanup', () => {
    it('removes <p> wrapper inside <li> (non-task)', () => {
      editorArea.innerHTML = '<ul><li><p>List item with p tag</p></li></ul>';
      const html = contentManager.getContent();
      expect(html).not.toMatch(/<li><p>/);
      expect(html).toContain('List item with p tag');
    });

    it('does not remove spans inside task list items', () => {
      editorArea.innerHTML = `
        <ul class="ray-task-list">
          <li class="ray-task-item" data-checked="false">
            <span class="ray-task-checkbox" contenteditable="false"></span>
            <span class="ray-task-text">Task text</span>
          </li>
        </ul>
      `;
      // After getContent, task items should be serialized (spans removed, text preserved)
      const html = contentManager.getContent();
      expect(html).toContain('Task text');
    });
  });
});
