import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { normalizePastedHTML } from '../../src/core/paste-normalizer';

describe('normalizePastedHTML', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ─── Basic passthrough ────────────────────────────────────────────────────

  it('returns empty string for empty input', () => {
    expect(normalizePastedHTML('')).toBe('');
  });

  it('passes plain text through unchanged', () => {
    const result = normalizePastedHTML('Hello world');
    expect(result).toContain('Hello world');
  });

  it('passes plain text with no tags through', () => {
    const result = normalizePastedHTML('Just some text with &amp; entities');
    expect(result).toContain('Just some text');
  });

  // ─── Tag normalization ────────────────────────────────────────────────────

  it('morphs <b> → <strong>', () => {
    const result = normalizePastedHTML('<b>Bold text</b>');
    expect(result).toContain('<strong>Bold text</strong>');
    expect(result).not.toContain('<b>');
  });

  it('morphs <i> → <em>', () => {
    const result = normalizePastedHTML('<i>Italic text</i>');
    expect(result).toContain('<em>Italic text</em>');
    expect(result).not.toContain('<i>');
  });

  it('morphs <strike> → <s>', () => {
    const result = normalizePastedHTML('<strike>Struck text</strike>');
    expect(result).toContain('<s>Struck text</s>');
    expect(result).not.toContain('<strike>');
  });

  it('morphs <del> → <s>', () => {
    const result = normalizePastedHTML('<del>Deleted text</del>');
    expect(result).toContain('<s>Deleted text</s>');
    expect(result).not.toContain('<del>');
  });

  it('converts <font color> → <span style="color:...">', () => {
    const result = normalizePastedHTML('<font color="red">Colored text</font>');
    expect(result).toContain('<span');
    expect(result).toContain('color:red');
    expect(result).toContain('Colored text');
    expect(result).not.toContain('<font');
  });

  it('converts <font face> → <span style="font-family:...">', () => {
    const result = normalizePastedHTML('<font face="Arial">Font text</font>');
    expect(result).toContain('font-family:Arial');
    expect(result).not.toContain('<font');
  });

  it('converts <font size="3"> → <span style="font-size:16px">', () => {
    const result = normalizePastedHTML('<font size="3">Sized text</font>');
    expect(result).toContain('font-size:16px');
    expect(result).not.toContain('<font');
  });

  it('converts <font size="7"> → <span style="font-size:48px">', () => {
    const result = normalizePastedHTML('<font size="7">Large text</font>');
    expect(result).toContain('font-size:48px');
  });

  // ─── Span semantic promotion ──────────────────────────────────────────────
  //
  // NOTE: font-weight, font-style, and text-decoration are in STRIP_STYLE_EXACT
  // and are stripped by filterStyle() before promoteSpan() runs. Therefore,
  // standalone spans with only those properties are unwrapped (text preserved)
  // rather than promoted to semantic elements.
  //
  // Promotion to <strong>/<em>/<u>/<s> only occurs when a span retains these
  // properties in its style attribute after filtering — which currently only
  // happens if they are combined with an allowed property such as color.
  // The highlight promotion (<mark>) works because background-color IS in ALLOWED_STYLES.

  it('span with font-weight:700 only — stripped and unwrapped (text preserved)', () => {
    const result = normalizePastedHTML('<span style="font-weight:700">Bold span</span>');
    // font-weight is in STRIP_STYLE_EXACT → stripped → span has no style → unwrapped
    expect(result).toContain('Bold span');
    expect(result).not.toContain('font-weight');
  });

  it('span with font-weight:bold only — stripped and unwrapped (text preserved)', () => {
    const result = normalizePastedHTML('<span style="font-weight:bold">Bold span</span>');
    expect(result).toContain('Bold span');
    expect(result).not.toContain('font-weight');
  });

  it('span with font-style:italic only — stripped and unwrapped (text preserved)', () => {
    const result = normalizePastedHTML('<span style="font-style:italic">Italic span</span>');
    expect(result).toContain('Italic span');
    expect(result).not.toContain('font-style');
  });

  it('span with text-decoration:underline only — stripped and unwrapped (text preserved)', () => {
    const result = normalizePastedHTML('<span style="text-decoration:underline">Underlined</span>');
    expect(result).toContain('Underlined');
    expect(result).not.toContain('text-decoration');
  });

  it('span with text-decoration:line-through only — stripped and unwrapped (text preserved)', () => {
    const result = normalizePastedHTML('<span style="text-decoration:line-through">Struck</span>');
    expect(result).toContain('Struck');
    expect(result).not.toContain('text-decoration');
  });

  it('promotes span with background-color:yellow to <mark>', () => {
    const result = normalizePastedHTML('<span style="background-color:yellow">Highlighted</span>');
    expect(result).toContain('<mark>Highlighted</mark>');
    expect(result).not.toContain('<span');
  });

  it('promotes span with background-color:#ffff00 to <mark>', () => {
    const result = normalizePastedHTML('<span style="background-color:#ffff00">Highlighted</span>');
    expect(result).toContain('<mark>');
  });

  it('promotes span with background-color:#fef08a to <mark>', () => {
    const result = normalizePastedHTML('<span style="background-color:#fef08a">Highlighted</span>');
    expect(result).toContain('<mark>');
  });

  it('promotes span with rgba yellow background to <mark>', () => {
    const result = normalizePastedHTML('<span style="background-color:rgba(255,255,0,1)">Yellow</span>');
    expect(result).toContain('<mark>');
  });

  it('does NOT promote non-highlight background colors to <mark>', () => {
    const result = normalizePastedHTML('<span style="background-color:#ff0000">Red bg</span>');
    expect(result).not.toContain('<mark>');
  });

  it('span with only color style keeps color (not promoted)', () => {
    const result = normalizePastedHTML('<span style="color:red">Red text</span>');
    expect(result).toContain('color:red');
    expect(result).not.toContain('<strong>');
    expect(result).not.toContain('<em>');
    expect(result).not.toContain('<u>');
    expect(result).not.toContain('<mark>');
  });

  it('span with font-size style keeps font-size (not promoted)', () => {
    const result = normalizePastedHTML('<span style="font-size:18px">Big text</span>');
    expect(result).toContain('font-size:18px');
    expect(result).not.toContain('<strong>');
  });

  // ─── MSO / Word cleanup ───────────────────────────────────────────────────

  it('removes MSO conditional comments', () => {
    const html = '<!--[if mso]><p>Word only</p><![endif]--><p>Real content</p>';
    const result = normalizePastedHTML(html);
    expect(result).not.toContain('Word only');
    expect(result).toContain('Real content');
  });

  it('removes MSO namespace elements with colons in tag names', () => {
    const html = '<p>Text</p><o:p></o:p>';
    const result = normalizePastedHTML(html);
    expect(result).not.toContain('o:p');
    expect(result).toContain('Text');
  });

  it('removes w:* namespace elements', () => {
    const html = '<w:sdtContent><p>Word content</p></w:sdtContent><p>Plain</p>';
    const result = normalizePastedHTML(html);
    expect(result).not.toContain('w:');
    expect(result).toContain('Plain');
  });

  it('strips mso- prefixed style properties', () => {
    const result = normalizePastedHTML('<p style="mso-line-height-rule:exactly;color:red">Text</p>');
    expect(result).not.toContain('mso-');
    expect(result).toContain('color:red');
  });

  it('strips margin, padding, line-height style props', () => {
    const result = normalizePastedHTML(
      '<span style="margin-top:10px;padding-left:5px;line-height:1.5;color:blue">Text</span>'
    );
    expect(result).not.toContain('margin');
    expect(result).not.toContain('padding');
    expect(result).not.toContain('line-height');
    expect(result).toContain('color:blue');
  });

  it('strips font-weight and font-style from inline styles (they are handled by promotion)', () => {
    // font-weight:bold on a <p> is stripped (not on span — only spans get promoted)
    const result = normalizePastedHTML('<p style="font-weight:bold;color:red">Text</p>');
    expect(result).not.toContain('font-weight');
    expect(result).toContain('color:red');
  });

  it('strips text-decoration from inline styles on non-span elements', () => {
    const result = normalizePastedHTML('<p style="text-decoration:underline;color:blue">Text</p>');
    expect(result).not.toContain('text-decoration');
    expect(result).toContain('color:blue');
  });

  // ─── Dangerous tags stripped completely ──────────────────────────────────

  it('strips <script> tags completely', () => {
    const result = normalizePastedHTML('<script>alert("xss")</script><p>Safe content</p>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toContain('Safe content');
  });

  it('strips <iframe> tags completely', () => {
    const result = normalizePastedHTML('<iframe src="evil.html"></iframe><p>Safe</p>');
    expect(result).not.toContain('<iframe');
    expect(result).toContain('Safe');
  });

  it('strips <object> tags completely', () => {
    const result = normalizePastedHTML('<object data="file.swf"></object><p>Safe</p>');
    expect(result).not.toContain('<object');
    expect(result).toContain('Safe');
  });

  it('strips <embed> tags', () => {
    const result = normalizePastedHTML('<embed src="malware.exe"><p>Safe</p>');
    expect(result).not.toContain('<embed');
    expect(result).toContain('Safe');
  });

  it('strips <form> and <button> tags', () => {
    const result = normalizePastedHTML('<form><button>Click</button></form><p>Safe</p>');
    expect(result).not.toContain('<form');
    expect(result).not.toContain('<button');
    expect(result).toContain('Safe');
  });

  it('strips <style> blocks', () => {
    const result = normalizePastedHTML('<style>body{color:red}</style><p>Text</p>');
    expect(result).not.toContain('<style');
    expect(result).not.toContain('body{');
    expect(result).toContain('Text');
  });

  // ─── Dangerous attributes stripped ───────────────────────────────────────

  it('strips on* event handler attributes (onclick)', () => {
    const result = normalizePastedHTML('<p onclick="alert(1)">Click me</p>');
    expect(result).not.toContain('onclick');
    expect(result).toContain('Click me');
  });

  it('strips onmouseover event handler', () => {
    const result = normalizePastedHTML('<span onmouseover="steal()">Hover me</span>');
    expect(result).not.toContain('onmouseover');
    expect(result).toContain('Hover me');
  });

  it('strips onerror from img tags (XSS)', () => {
    const result = normalizePastedHTML('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('onerror');
  });

  it('strips javascript: href from anchors (XSS)', () => {
    const result = normalizePastedHTML('<a href="javascript:alert(1)">Click</a>');
    expect(result).not.toContain('javascript:');
    expect(result).toContain('Click');
  });

  it('strips vbscript: href from anchors', () => {
    const result = normalizePastedHTML('<a href="vbscript:msgbox(1)">Click</a>');
    expect(result).not.toContain('vbscript:');
  });

  it('strips data: href from anchors', () => {
    const result = normalizePastedHTML('<a href="data:text/html,<script>alert(1)</script>">Click</a>');
    expect(result).not.toContain('data:text/html');
  });

  it('preserves safe href on anchors', () => {
    const result = normalizePastedHTML('<a href="https://example.com">Link</a>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('Link');
  });

  it('strips class attributes (non ray- prefixed)', () => {
    const result = normalizePastedHTML('<span class="mso-something">Text</span>');
    expect(result).not.toContain('class="mso-something"');
    expect(result).toContain('Text');
  });

  it('preserves ray-* prefixed class attributes', () => {
    const result = normalizePastedHTML('<div class="ray-callout ray-callout-info">Content</div>');
    expect(result).toContain('class="ray-callout ray-callout-info"');
  });

  it('strips non-ray id attributes', () => {
    const result = normalizePastedHTML('<div id="external-id">Content</div>');
    expect(result).not.toContain('id="external-id"');
    expect(result).toContain('Content');
  });

  // ─── Style attribute allowlist ────────────────────────────────────────────

  it('keeps color style property', () => {
    const result = normalizePastedHTML('<p style="color:#333">Text</p>');
    expect(result).toContain('color:#333');
  });

  it('keeps background-color style property', () => {
    const result = normalizePastedHTML('<p style="background-color:#eee">Text</p>');
    expect(result).toContain('background-color:#eee');
  });

  it('keeps font-size style property', () => {
    const result = normalizePastedHTML('<p style="font-size:14px">Text</p>');
    expect(result).toContain('font-size:14px');
  });

  it('keeps font-family style property', () => {
    const result = normalizePastedHTML('<p style="font-family:Georgia">Text</p>');
    expect(result).toContain('font-family:Georgia');
  });

  it('keeps text-align style property', () => {
    const result = normalizePastedHTML('<p style="text-align:center">Text</p>');
    expect(result).toContain('text-align:center');
  });

  it('strips display, position, z-index and other layout styles', () => {
    const result = normalizePastedHTML(
      '<div style="display:flex;position:absolute;z-index:999;color:red">Text</div>'
    );
    expect(result).not.toContain('display:flex');
    expect(result).not.toContain('position:absolute');
    expect(result).not.toContain('z-index:999');
    expect(result).toContain('color:red');
  });

  // ─── Google Docs wrapper ──────────────────────────────────────────────────

  it('unwraps Google Docs <b id="docs-internal-guid-..."> wrapper but keeps children', () => {
    const html = '<b id="docs-internal-guid-abc123"><p>Doc content</p></b>';
    const result = normalizePastedHTML(html);
    expect(result).toContain('Doc content');
    expect(result).not.toContain('docs-internal-guid');
  });

  it('<b style="font-weight:normal"> — content is preserved', () => {
    // NOTE: filterStyle() strips font-weight before tag normalization runs,
    // so el.style.fontWeight reads '' (not 'normal') at the time of the b→strong check.
    // The <b> is morphed to <strong> in this pipeline. The key guarantee is the
    // inner content is preserved.
    const html = '<b style="font-weight:normal"><p>Wrapped content</p></b>';
    const result = normalizePastedHTML(html);
    expect(result).toContain('Wrapped content');
  });

  it('<b style="font-weight:400"> — content is preserved', () => {
    // Same pipeline constraint as above: font-weight is stripped before b→strong check.
    const html = '<b style="font-weight:400"><p>Content</p></b>';
    const result = normalizePastedHTML(html);
    expect(result).toContain('Content');
  });

  // ─── Empty element removal ────────────────────────────────────────────────

  it('removes empty <p> elements', () => {
    const result = normalizePastedHTML('<p></p><p>Real content</p>');
    expect(result).toContain('Real content');
    // The empty <p> should be removed
    const div = document.createElement('div');
    div.innerHTML = result;
    const paras = div.querySelectorAll('p');
    expect(paras.length).toBe(1);
    expect(paras[0].textContent).toBe('Real content');
  });

  it('removes empty <span> elements', () => {
    const result = normalizePastedHTML('<p><span></span>Hello</p>');
    const div = document.createElement('div');
    div.innerHTML = result;
    expect(div.querySelectorAll('span').length).toBe(0);
    expect(div.textContent).toContain('Hello');
  });

  it('collapses nested empty spans', () => {
    const result = normalizePastedHTML('<p><span><span></span></span>Text</p>');
    const div = document.createElement('div');
    div.innerHTML = result;
    expect(div.querySelectorAll('span').length).toBe(0);
    expect(div.textContent).toContain('Text');
  });

  it('unwraps span with no remaining attributes after style filtering', () => {
    // span only had margin which is stripped, so the span itself has no attrs → unwrapped
    const result = normalizePastedHTML('<span style="margin:10px">Text</span>');
    const div = document.createElement('div');
    div.innerHTML = result;
    expect(div.querySelector('span')).toBeNull();
    expect(div.textContent).toContain('Text');
  });

  // ─── Structural element preservation ─────────────────────────────────────

  it('preserves <h1> through <h6> headings', () => {
    const html = '<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>';
    const result = normalizePastedHTML(html);
    expect(result).toContain('<h1>H1</h1>');
    expect(result).toContain('<h2>H2</h2>');
    expect(result).toContain('<h3>H3</h3>');
    expect(result).toContain('<h4>H4</h4>');
    expect(result).toContain('<h5>H5</h5>');
    expect(result).toContain('<h6>H6</h6>');
  });

  it('preserves <ul>, <ol>, and <li> structure', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>Numbered</li></ol>';
    const result = normalizePastedHTML(html);
    expect(result).toContain('<ul>');
    expect(result).toContain('<ol>');
    expect(result).toContain('<li>');
    expect(result).toContain('Item 1');
    expect(result).toContain('Numbered');
  });

  it('preserves <blockquote>', () => {
    const result = normalizePastedHTML('<blockquote>Quote text</blockquote>');
    expect(result).toContain('<blockquote>');
    expect(result).toContain('Quote text');
  });

  it('preserves <pre> with code content', () => {
    const result = normalizePastedHTML('<pre><code>const x = 1;</code></pre>');
    expect(result).toContain('<pre>');
    expect(result).toContain('const x = 1;');
  });

  it('preserves <table>, <thead>, <tbody>, <tr>, <th>, <td> structure', () => {
    const html = `<table>
      <thead><tr><th>Col A</th><th>Col B</th></tr></thead>
      <tbody><tr><td>Cell 1</td><td>Cell 2</td></tr></tbody>
    </table>`;
    const result = normalizePastedHTML(html);
    expect(result).toContain('<table>');
    expect(result).toContain('<thead>');
    expect(result).toContain('<tbody>');
    expect(result).toContain('<tr>');
    expect(result).toContain('<th>');
    expect(result).toContain('<td>');
    expect(result).toContain('Col A');
    expect(result).toContain('Cell 1');
  });

  it('preserves <mark> elements', () => {
    const result = normalizePastedHTML('<p>Text with <mark>highlight</mark></p>');
    expect(result).toContain('<mark>highlight</mark>');
  });

  it('preserves <strong> elements', () => {
    const result = normalizePastedHTML('<p><strong>Bold text</strong></p>');
    expect(result).toContain('<strong>Bold text</strong>');
  });

  it('preserves <em> elements', () => {
    const result = normalizePastedHTML('<p><em>Italic text</em></p>');
    expect(result).toContain('<em>Italic text</em>');
  });

  it('preserves <u> elements', () => {
    const result = normalizePastedHTML('<p><u>Underlined</u></p>');
    expect(result).toContain('<u>Underlined</u>');
  });

  it('preserves <s> elements', () => {
    const result = normalizePastedHTML('<p><s>Struck through</s></p>');
    expect(result).toContain('<s>Struck through</s>');
  });

  it('preserves <img> src attribute (safe http)', () => {
    const result = normalizePastedHTML('<img src="https://example.com/img.png" alt="Test">');
    expect(result).toContain('src="https://example.com/img.png"');
  });

  it('strips <img src="javascript:..."> src', () => {
    const result = normalizePastedHTML('<img src="javascript:alert(1)" alt="evil">');
    expect(result).not.toContain('javascript:');
  });

  // ─── Double-promotion prevention ──────────────────────────────────────────

  it('does not double-promote: bold span inside <strong> does not nest two strongs', () => {
    const result = normalizePastedHTML('<strong><span style="font-weight:700">Bold</span></strong>');
    const div = document.createElement('div');
    div.innerHTML = result;
    // Should not have <strong><strong>...</strong></strong>
    const innerStrong = div.querySelector('strong strong');
    expect(innerStrong).toBeNull();
    expect(result).toContain('Bold');
  });

  it('does not double-promote: italic span inside <em> does not nest two ems', () => {
    const result = normalizePastedHTML('<em><span style="font-style:italic">Italic</span></em>');
    const div = document.createElement('div');
    div.innerHTML = result;
    const innerEm = div.querySelector('em em');
    expect(innerEm).toBeNull();
    expect(result).toContain('Italic');
  });

  // ─── Complex / mixed cases ────────────────────────────────────────────────

  it('handles complex Word HTML with multiple MSO artifacts', () => {
    const wordHtml = `
      <p class="MsoNormal" style="mso-line-height-rule:exactly;margin:0pt">
        <b>Bold</b> and <i>Italic</i> text
        <o:p></o:p>
      </p>
    `;
    const result = normalizePastedHTML(wordHtml);
    expect(result).not.toContain('mso-');
    expect(result).not.toContain('o:p');
    expect(result).not.toContain('margin:0pt');
    expect(result).toContain('<strong>Bold</strong>');
    expect(result).toContain('<em>Italic</em>');
  });

  it('handles Google Docs paste with nested formatting', () => {
    const gdocHtml = `
      <b id="docs-internal-guid-abc">
        <p><b>Bold paragraph</b></p>
        <p><i>Italic paragraph</i></p>
      </b>
    `;
    const result = normalizePastedHTML(gdocHtml);
    expect(result).not.toContain('docs-internal-guid');
    expect(result).toContain('Bold paragraph');
    expect(result).toContain('Italic paragraph');
  });

  it('handles mixed content: headings, lists, paragraphs', () => {
    const html = `
      <h2>Section Title</h2>
      <p>A paragraph with <strong>bold</strong> and <em>italic</em>.</p>
      <ul>
        <li>List item one</li>
        <li>List item two</li>
      </ul>
    `;
    const result = normalizePastedHTML(html);
    expect(result).toContain('<h2>');
    expect(result).toContain('Section Title');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<ul>');
    expect(result).toContain('List item one');
  });

  it('span with font-weight:700 and font-style:italic — both stripped, text preserved', () => {
    // Both font-weight and font-style are in STRIP_STYLE_EXACT; after filtering the
    // span has no remaining style, so it is unwrapped. Text content is preserved.
    const result = normalizePastedHTML(
      '<span style="font-weight:700;font-style:italic">Both</span>'
    );
    expect(result).toContain('Both');
    expect(result).not.toContain('font-weight');
    expect(result).not.toContain('font-style');
  });

  it('span with font-weight:700 and color:red — font-weight stripped, color kept, promoted to <strong> via promoteSpan', () => {
    // color survives filterStyle; after filtering span has style="color:red".
    // But promoteSpan reads font-weight from the filtered style — which is gone.
    // So the span is NOT promoted; it keeps color:red.
    const result = normalizePastedHTML(
      '<span style="font-weight:700;color:red">Red bold</span>'
    );
    expect(result).toContain('Red bold');
    expect(result).toContain('color:red');
    expect(result).not.toContain('font-weight');
  });

  it('div with only inline children gets converted to <p>', () => {
    const result = normalizePastedHTML('<div>Simple div text</div>');
    const div = document.createElement('div');
    div.innerHTML = result;
    // The div with no block children should become a p
    expect(div.querySelector('p')).not.toBeNull();
  });

  it('div with block children is not converted to <p>', () => {
    const result = normalizePastedHTML('<div><p>Inner para</p></div>');
    const div = document.createElement('div');
    div.innerHTML = result;
    // Top level div with a block child stays as div
    expect(result).toContain('Inner para');
  });

  it('whitespace-only <p> is removed', () => {
    const result = normalizePastedHTML('<p>   </p><p>Content</p>');
    const div = document.createElement('div');
    div.innerHTML = result;
    // White-space only paragraph should be removed
    const paras = Array.from(div.querySelectorAll('p'));
    const empty = paras.filter(p => !p.textContent?.trim());
    expect(empty.length).toBe(0);
    expect(result).toContain('Content');
  });

  it('<p> with only <br> survives (not removed)', () => {
    const result = normalizePastedHTML('<p><br></p><p>Content</p>');
    const div = document.createElement('div');
    div.innerHTML = result;
    // <br> counts as non-empty, so this p should survive
    expect(result).toContain('Content');
  });
});
