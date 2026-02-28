import { describe, it, expect, beforeEach } from 'vitest';
import { ContentManager } from '../../src/core/content';

describe('ContentManager', () => {
  let editorArea: HTMLElement;
  let contentManager: ContentManager;

  beforeEach(() => {
    editorArea = document.createElement('div');
    editorArea.className = 'ray-editor-content';
    document.body.appendChild(editorArea);
    contentManager = new ContentManager(editorArea);
  });

  it('getContent returns innerHTML', () => {
    editorArea.innerHTML = '<p>Hello world</p>';
    expect(contentManager.getContent()).toContain('Hello world');
  });

  it('setContent updates editorArea innerHTML', () => {
    contentManager.setContent('<p>Test content</p>');
    expect(editorArea.innerHTML).toContain('Test content');
  });

  it('setContent makes code blocks editable', () => {
    contentManager.setContent(
      '<div class="ray-code-block"><pre class="ray-code-content" contenteditable="false"><code>const x = 1;</code></pre></div>'
    );
    const pre = editorArea.querySelector('.ray-code-content');
    expect(pre?.getAttribute('contenteditable')).toBe('true');
  });

  it('getContent sets code blocks to non-editable', () => {
    editorArea.innerHTML =
      '<div class="ray-code-block"><pre class="ray-code-content" contenteditable="true"><code>code</code></pre></div>';
    const html = contentManager.getContent();
    expect(html).toContain('contenteditable="false"');
  });

  it('getContent removes empty inline elements', () => {
    editorArea.innerHTML = '<p><span></span>Hello</p>';
    const html = contentManager.getContent();
    expect(html).not.toContain('<span></span>');
    expect(html).toContain('Hello');
  });

  it('getContent replaces unclassed divs with p', () => {
    editorArea.innerHTML = '<div>Text without class</div>';
    const html = contentManager.getContent();
    expect(html).toContain('<p>Text without class</p>');
    expect(html).not.toContain('<div>');
  });

  it('getContent removes p inside li', () => {
    editorArea.innerHTML = '<ul><li><p>Item</p></li></ul>';
    const html = contentManager.getContent();
    expect(html).not.toMatch(/<li><p>/);
  });

  it('setContent then getContent round-trips clean HTML', () => {
    const input = '<h1>Heading</h1><p>Paragraph with <strong>bold</strong>.</p>';
    contentManager.setContent(input);
    const output = contentManager.getContent();
    expect(output).toContain('<h1>Heading</h1>');
    expect(output).toContain('<strong>bold</strong>');
  });
});
