import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeUrl, applySanitizedHTML } from '../../src/core/sanitize';

// ─── escapeHtml ────────────────────────────────────────────────────────────

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes greater-than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('escapes all dangerous chars in one string', () => {
    expect(escapeHtml('<a href="x&y">it\'s</a>')).toBe(
      '&lt;a href=&quot;x&amp;y&quot;&gt;it&#39;s&lt;/a&gt;'
    );
  });

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('Hello world')).toBe('Hello world');
  });

  it('escapes XSS payload with event handler', () => {
    const result = escapeHtml('<img onerror=alert(1)>');
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
  });
});

// ─── sanitizeUrl ──────────────────────────────────────────────────────────

describe('sanitizeUrl', () => {
  // Safe schemes
  it('allows http:', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
  });

  it('allows https:', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
  });

  it('allows mailto:', () => {
    expect(sanitizeUrl('mailto:user@example.com')).toBe('mailto:user@example.com');
  });

  it('allows tel:', () => {
    expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
  });

  it('allows ftp:', () => {
    expect(sanitizeUrl('ftp://files.example.com')).toBe('ftp://files.example.com/');
  });

  it('allows relative paths', () => {
    expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
  });

  it('allows relative URL without leading slash', () => {
    expect(sanitizeUrl('page.html')).toBe('page.html');
  });

  it('allows hash-only anchor', () => {
    expect(sanitizeUrl('#section')).toBe('#section');
  });

  // Blocked schemes
  it('blocks javascript: scheme', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
  });

  it('blocks javascript: case-insensitive', () => {
    expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
  });

  it('blocks javascript: with spaces (obfuscation)', () => {
    expect(sanitizeUrl('java script:alert(1)')).toBe('');
  });

  it('blocks javascript: with null bytes', () => {
    expect(sanitizeUrl('java\x00script:alert(1)')).toBe('');
  });

  it('blocks javascript: with tab chars', () => {
    expect(sanitizeUrl('java\tscript:alert(1)')).toBe('');
  });

  it('blocks javascript: with newline chars', () => {
    expect(sanitizeUrl('java\nscript:alert(1)')).toBe('');
  });

  it('blocks vbscript:', () => {
    expect(sanitizeUrl('vbscript:MsgBox(1)')).toBe('');
  });

  it('blocks vbscript: case-insensitive', () => {
    expect(sanitizeUrl('VBScript:MsgBox(1)')).toBe('');
  });

  it('blocks data: URI', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('blocks data: with base64', () => {
    expect(sanitizeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe('');
  });

  it('blocks data: case-insensitive', () => {
    expect(sanitizeUrl('DATA:text/html,<h1>hi</h1>')).toBe('');
  });

  it('blocks file: scheme (not in ALLOWED set)', () => {
    expect(sanitizeUrl('file:///etc/passwd')).toBe('');
  });

  it('blocks unknown scheme', () => {
    expect(sanitizeUrl('evil://payload')).toBe('');
  });

  it('returns parsed.href for valid URL (normalizes trailing slash)', () => {
    const result = sanitizeUrl('https://example.com');
    expect(result).toBe('https://example.com/');
  });
});

// ─── applySanitizedHTML ────────────────────────────────────────────────────

describe('applySanitizedHTML', () => {
  function apply(html: string): HTMLElement {
    const div = document.createElement('div');
    applySanitizedHTML(div, html);
    return div;
  }

  // Content preservation
  it('inserts safe paragraph content', () => {
    const el = apply('<p>Hello world</p>');
    expect(el.querySelector('p')?.textContent).toBe('Hello world');
  });

  it('inserts bold text', () => {
    const el = apply('<p><strong>bold</strong></p>');
    expect(el.querySelector('strong')).not.toBeNull();
  });

  it('clears existing content before inserting', () => {
    const div = document.createElement('div');
    div.innerHTML = '<p>old</p>';
    applySanitizedHTML(div, '<p>new</p>');
    expect(div.textContent).toBe('new');
  });

  // Forbidden tag removal
  it('removes <script> tags entirely', () => {
    const el = apply('<p>text</p><script>alert(1)</script>');
    expect(el.querySelector('script')).toBeNull();
    expect(el.textContent).toBe('text');
  });

  it('removes nested <script> tags', () => {
    const el = apply('<div><p><script>x()</script></p></div>');
    expect(el.querySelector('script')).toBeNull();
  });

  it('removes <iframe>', () => {
    const el = apply('<p>a</p><iframe src="//evil.com"></iframe>');
    expect(el.querySelector('iframe')).toBeNull();
  });

  it('removes <object>', () => {
    const el = apply('<object data="file.swf"></object>');
    expect(el.querySelector('object')).toBeNull();
  });

  it('removes <embed>', () => {
    const el = apply('<embed src="file.swf">');
    expect(el.querySelector('embed')).toBeNull();
  });

  it('removes <form>', () => {
    const el = apply('<form action="/submit"><input type="text"></form>');
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('input')).toBeNull();
  });

  it('removes <style> tags', () => {
    const el = apply('<style>body{display:none}</style><p>text</p>');
    expect(el.querySelector('style')).toBeNull();
    expect(el.querySelector('p')?.textContent).toBe('text');
  });

  it('removes <noscript>', () => {
    const el = apply('<noscript><img src=x onerror=alert(1)></noscript>');
    expect(el.querySelector('noscript')).toBeNull();
  });

  it('removes <template>', () => {
    const el = apply('<template><script>bad()</script></template>');
    expect(el.querySelector('template')).toBeNull();
  });

  it('removes <base>', () => {
    const el = apply('<base href="//evil.com/"><p>text</p>');
    expect(el.querySelector('base')).toBeNull();
  });

  it('removes <link>', () => {
    const el = apply('<link rel="stylesheet" href="//evil.com/x.css"><p>ok</p>');
    expect(el.querySelector('link')).toBeNull();
  });

  // Event handler stripping
  it('strips onclick attribute', () => {
    const el = apply('<p onclick="alert(1)">text</p>');
    expect(el.querySelector('p')?.getAttribute('onclick')).toBeNull();
  });

  it('strips onerror attribute', () => {
    const el = apply('<img src="x" onerror="alert(1)">');
    expect(el.querySelector('img')?.getAttribute('onerror')).toBeNull();
  });

  it('strips onmouseover attribute', () => {
    const el = apply('<a href="/" onmouseover="steal()">link</a>');
    expect(el.querySelector('a')?.getAttribute('onmouseover')).toBeNull();
  });

  it('strips all on* attributes (onload)', () => {
    const el = apply('<body onload="bad()"><p>text</p></body>');
    expect(el.innerHTML).not.toContain('onload');
  });

  // Dangerous URI stripping
  it('strips javascript: href on <a>', () => {
    const el = apply('<a href="javascript:alert(1)">click</a>');
    expect(el.querySelector('a')?.getAttribute('href')).toBeNull();
  });

  it('strips data: src on <img>', () => {
    const el = apply('<img src="data:text/html,<h1>hi</h1>">');
    expect(el.querySelector('img')?.getAttribute('src')).toBeNull();
  });

  it('preserves safe href', () => {
    const el = apply('<a href="https://example.com">link</a>');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
  });

  it('preserves safe img src', () => {
    const el = apply('<img src="https://example.com/img.png" alt="x">');
    expect(el.querySelector('img')?.getAttribute('src')).toBe('https://example.com/img.png');
  });

  it('preserves style attribute on span', () => {
    const el = apply('<span style="color:red">text</span>');
    expect(el.querySelector('span')?.getAttribute('style')).toBe('color:red');
  });
});
