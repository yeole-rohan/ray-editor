import { describe, it, expect } from 'vitest';
import { markdownToHtml, htmlToMarkdown } from '../../src/features/markdown';

// ─── markdownToHtml ────────────────────────────────────────────────────────

describe('markdownToHtml', () => {
  // Headings
  it('converts H1', () => {
    expect(markdownToHtml('# Hello')).toContain('<h1>Hello</h1>');
  });

  it('converts H2', () => {
    expect(markdownToHtml('## Subtitle')).toContain('<h2>Subtitle</h2>');
  });

  it('converts H3 through H6', () => {
    for (let i = 3; i <= 6; i++) {
      expect(markdownToHtml(`${'#'.repeat(i)} Head`)).toContain(`<h${i}>Head</h${i}>`);
    }
  });

  // Paragraphs & inline
  it('converts plain text to paragraph', () => {
    expect(markdownToHtml('Hello world')).toContain('<p>');
  });

  it('converts **bold**', () => {
    expect(markdownToHtml('**bold**')).toContain('<strong>bold</strong>');
  });

  it('converts __bold__', () => {
    expect(markdownToHtml('__bold__')).toContain('<strong>bold</strong>');
  });

  it('converts *italic*', () => {
    expect(markdownToHtml('*italic*')).toContain('<em>italic</em>');
  });

  it('converts _italic_', () => {
    expect(markdownToHtml('_italic_')).toContain('<em>italic</em>');
  });

  it('converts ~~strikethrough~~', () => {
    expect(markdownToHtml('~~strike~~')).toContain('<s>strike</s>');
  });

  it('converts `inline code`', () => {
    expect(markdownToHtml('use `code` here')).toContain('<code>code</code>');
  });

  // Blockquote
  it('converts blockquote', () => {
    expect(markdownToHtml('> quoted text')).toContain('<blockquote>');
  });

  // Horizontal rule
  it('converts --- to <hr>', () => {
    expect(markdownToHtml('---')).toContain('<hr>');
  });

  it('converts *** to <hr>', () => {
    expect(markdownToHtml('***')).toContain('<hr>');
  });

  // Lists
  it('converts unordered list with -', () => {
    const html = markdownToHtml('- item one\n- item two');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>item one</li>');
    expect(html).toContain('<li>item two</li>');
  });

  it('converts ordered list', () => {
    const html = markdownToHtml('1. first\n2. second');
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>first</li>');
  });

  // Code blocks
  it('converts fenced code block', () => {
    const html = markdownToHtml('```js\nconsole.log(1);\n```');
    expect(html).toContain('data-lang="js"');
    expect(html).toContain('console.log(1);');
  });

  it('escapes HTML inside code blocks', () => {
    const html = markdownToHtml('```\n<script>bad()</script>\n```');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes HTML inside inline code', () => {
    const html = markdownToHtml('try `<b>this</b>` now');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;b&gt;');
  });

  // Tables
  it('converts markdown table', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |';
    const html = markdownToHtml(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });

  // Links
  it('converts [label](url) to <a>', () => {
    const html = markdownToHtml('[click](https://example.com)');
    // sanitizeUrl normalizes the URL (adds trailing slash for bare domain)
    expect(html).toContain('<a href="https://example.com/">click</a>');
  });

  it('blocks javascript: in link href (sanitizeUrl strips it)', () => {
    const html = markdownToHtml('[click](javascript:alert(1))');
    // sanitizeUrl returns '' for javascript: → href becomes empty string
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('href=""');
  });

  it('escapes angle brackets in link href', () => {
    const html = markdownToHtml('[x]("><script>bad()</script>)');
    expect(html).not.toContain('<script>');
  });

  // Images
  it('converts ![alt](src) to <img>', () => {
    const html = markdownToHtml('![cat](https://example.com/cat.jpg)');
    expect(html).toContain('<img');
    expect(html).toContain('src="https://example.com/cat.jpg"');
    expect(html).toContain('alt="cat"');
  });

  it('escapes double-quote in image alt text (breaks attribute boundary)', () => {
    const html = markdownToHtml('!["onerror=bad()](https://example.com/img.jpg)');
    // The " is escaped to &quot; so it cannot break out of the alt attribute
    expect(html).toContain('alt="&quot;onerror=bad()"');
  });

  it('blocks javascript: in image src (sanitizeUrl strips it)', () => {
    const html = markdownToHtml('![x](javascript:alert(1))');
    // sanitizeUrl returns '' → src becomes empty string
    expect(html).toContain('src=""');
    expect(html).not.toContain('src="javascript:');
  });

  it('escapes HTML tag injection in image src', () => {
    const html = markdownToHtml('![x](" onerror="bad()")');
    // The " is passed to sanitizeUrl which treats it as a relative URL and
    // the escapeHtml call ensures it cannot break the attribute context
    expect(html).not.toContain('onerror="bad()"');
  });
});

// ─── htmlToMarkdown ────────────────────────────────────────────────────────

describe('htmlToMarkdown', () => {
  it('converts <h1> to # heading', () => {
    expect(htmlToMarkdown('<h1>Title</h1>')).toContain('# Title');
  });

  it('converts <h2> to ## heading', () => {
    expect(htmlToMarkdown('<h2>Sub</h2>')).toContain('## Sub');
  });

  it('converts <strong> to **bold**', () => {
    expect(htmlToMarkdown('<p><strong>bold</strong></p>')).toContain('**bold**');
  });

  it('converts <em> to *italic*', () => {
    expect(htmlToMarkdown('<p><em>italic</em></p>')).toContain('*italic*');
  });

  it('converts <s> to ~~strikethrough~~', () => {
    expect(htmlToMarkdown('<p><s>strike</s></p>')).toContain('~~strike~~');
  });

  it('converts <code> to backtick inline code', () => {
    expect(htmlToMarkdown('<p><code>fn()</code></p>')).toContain('`fn()`');
  });

  it('converts <ul><li> to - list items', () => {
    const md = htmlToMarkdown('<ul><li>one</li><li>two</li></ul>');
    expect(md).toContain('- one');
    expect(md).toContain('- two');
  });

  it('converts <ol><li> to numbered list', () => {
    const md = htmlToMarkdown('<ol><li>first</li><li>second</li></ol>');
    expect(md).toContain('1. first');
    expect(md).toContain('2. second');
  });

  it('converts <blockquote> to > prefix', () => {
    expect(htmlToMarkdown('<blockquote><p>quoted</p></blockquote>')).toContain('> quoted');
  });

  it('converts <hr> to ---', () => {
    expect(htmlToMarkdown('<hr>')).toContain('---');
  });

  it('converts <pre data-lang="js"> to fenced code block', () => {
    const md = htmlToMarkdown('<pre data-lang="js"><code>const x = 1;</code></pre>');
    expect(md).toContain('```js');
    expect(md).toContain('const x = 1;');
  });

  it('converts <a> to [label](href)', () => {
    const md = htmlToMarkdown('<p><a href="https://example.com">link</a></p>');
    expect(md).toContain('[link](https://example.com)');
  });

  it('converts <img> to ![alt](src)', () => {
    const md = htmlToMarkdown('<img src="https://example.com/img.png" alt="cat">');
    expect(md).toContain('![cat](https://example.com/img.png)');
  });

  it('outputs <mark> inner text (no special markdown syntax)', () => {
    // htmlToMarkdown treats <mark> as unknown tag → falls through to default (inner text)
    const md = htmlToMarkdown('<p><mark>important</mark></p>');
    expect(md).toContain('important');
  });

  it('returns empty string for empty input', () => {
    expect(htmlToMarkdown('').trim()).toBe('');
  });

  it('skips empty paragraphs', () => {
    const md = htmlToMarkdown('<p></p><p>text</p>');
    expect(md.trim()).toBe('text');
  });
});
