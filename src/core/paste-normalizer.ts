/**
 * Paste normalizer — cleans HTML from Word, Google Docs, and arbitrary web pages
 * into RayEditor-compatible markup before insertion.
 *
 * Pipeline (in order):
 *  1. DOMParser sandbox — scripts never run
 *  2. Strip dangerous tags
 *  3. Remove Word/MSO namespace elements (o:p, w:*, v:*, xml)
 *  4. Unwrap Google Docs outer wrapper <b id="docs-internal-guid-...">
 *  5. Normalize tags (b→strong, i→em, strike→s, font→span)
 *  6. Filter attributes — strip class/id, keep only safe inline style props
 *  7. Semantic promotion — span[style] → strong/em/u/s/mark
 *  8. Unwrap empty/no-attr spans
 *  9. Returns clean HTML string (structure like pre→code-block handled by ContentManager)
 */

// Inline style properties that survive — everything else is stripped
const ALLOWED_STYLES = new Set([
  'color',
  'background-color',
  'font-size',
  'font-family',
  'text-align',
]);

// Strip these properties entirely (MSO noise + layout overrides)
const STRIP_STYLE_PREFIXES = ['mso-', '-mso', 'tab-', 'page-break'];
const STRIP_STYLE_EXACT = new Set([
  'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'line-height', 'orphans', 'widows', 'word-spacing', 'letter-spacing',
  'font-variant', 'font-weight', 'font-style', 'text-decoration',
]);

// HTML <font size="1-7"> → px
const FONT_SIZE_MAP: Record<string, string> = {
  '1': '10px', '2': '13px', '3': '16px', '4': '18px',
  '5': '24px', '6': '32px', '7': '48px',
};

const BLOCK_TAGS = new Set([
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'table',
  'figure', 'hr', 'section', 'article', 'main', 'header', 'footer',
]);

/**
 * Normalizes pasted or externally-sourced HTML.
 * Returns a clean HTML string ready for insertion into the editor.
 * RayEditor-specific structure (code blocks, table wrappers, task lists) is
 * applied separately by ContentManager.applyStructure().
 */
export function normalizePastedHTML(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;

  // 1. Strip dangerous tags
  stripForbidden(body);

  // 2. Remove MSO/Word namespace elements (o:p, w:*, v:*, xml, etc.)
  removeMSOElements(body);

  // 3. Unwrap Google Docs outer <b id="docs-internal-guid-..."> wrapper
  body.querySelectorAll<HTMLElement>('b[id^="docs-internal-guid"]').forEach(el => unwrap(el));

  // 4. Deep normalize — post-order so children are processed before parents
  deepNormalize(body);

  // 5. Remove spans with no surviving attributes
  collapseEmptySpans(body);

  // 6. Remove truly empty block elements
  removeEmptyBlocks(body);

  return body.innerHTML;
}

// ─── Step 1 ────────────────────────────────────────────────────────────────

function stripForbidden(root: HTMLElement): void {
  const FORBIDDEN = [
    'script', 'iframe', 'frame', 'frameset',
    'object', 'embed', 'applet',
    'form', 'button', 'select', 'option', 'textarea',
    'base', 'link', 'meta', 'style', 'xml',
  ].join(',');
  root.querySelectorAll(FORBIDDEN).forEach(el => el.remove());
}

// ─── Step 2 ────────────────────────────────────────────────────────────────

function removeMSOElements(root: HTMLElement): void {
  // DOMParser maps unknown namespace tags — their tagName contains ':' or is a known MSO tag
  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = (child as Element).tagName.toLowerCase();
        if (tag.includes(':') || tag === 'xml') {
          (child as Element).remove();
        } else {
          walk(child);
        }
      }
    }
  };
  walk(root);
}

// ─── Step 4 ────────────────────────────────────────────────────────────────

function deepNormalize(root: HTMLElement): void {
  // Collect all elements post-order (deepest first) — avoids live-list mutation issues
  const all: Element[] = [];
  const collect = (node: Element) => {
    Array.from(node.children).forEach(collect);
    if (node !== root) all.push(node);
  };
  collect(root);

  for (const el of all) {
    if (!el.isConnected) continue; // already removed by a parent

    const tag = el.tagName.toLowerCase();

    // ── Dangerous attribute strip ──────────────────────────────────────────
    Array.from(el.attributes).forEach(attr => {
      const name = attr.name.toLowerCase();
      const val = attr.value.replace(/[\s\u0000-\u001F]/g, '').toLowerCase();
      if (
        name.startsWith('on') ||
        (name === 'href' && /^(javascript|vbscript|data):/.test(val)) ||
        (name === 'src' && /^(javascript|data):/.test(val))
      ) {
        el.removeAttribute(attr.name);
      }
    });

    // ── Remove class / id (keep ray-* prefixed) ────────────────────────────
    const cls = el.getAttribute('class') ?? '';
    if (cls && !cls.trim().startsWith('ray-')) el.removeAttribute('class');

    const id = el.getAttribute('id') ?? '';
    if (id && !id.startsWith('ray-')) el.removeAttribute('id');

    // ── Filter inline styles ───────────────────────────────────────────────
    const rawStyle = el.getAttribute('style');
    if (rawStyle) {
      const filtered = filterStyle(rawStyle);
      if (filtered) el.setAttribute('style', filtered);
      else el.removeAttribute('style');
    }

    // ── Tag normalization ──────────────────────────────────────────────────
    if (tag === 'b') {
      // Google Docs uses <b style="font-weight:normal"> as wrapper — unwrap those
      const fw = (el as HTMLElement).style?.fontWeight;
      if (fw === 'normal' || fw === '400') {
        unwrap(el);
      } else {
        morphTag(el, 'strong');
      }
    } else if (tag === 'i') {
      morphTag(el, 'em');
    } else if (tag === 'strike' || tag === 'del') {
      morphTag(el, 's');
    } else if (tag === 'font') {
      const span = fontToSpan(el as HTMLElement);
      el.parentNode?.replaceChild(span, el);
    } else if (tag === 'div') {
      // Divs with only inline children → paragraph
      const hasBlock = Array.from(el.children).some(c => BLOCK_TAGS.has(c.tagName.toLowerCase()));
      if (!hasBlock) morphTag(el, 'p');
    }
  }

  // ── Semantic span promotion (separate pass after tag normalization) ────────
  // querySelectorAll on updated root — spans that survived normalization
  root.querySelectorAll<HTMLElement>('span[style]').forEach(span => {
    if (!span.isConnected) return;
    promoteSpan(span);
  });
}

// ─── Style filter ─────────────────────────────────────────────────────────

function filterStyle(style: string): string {
  const out: string[] = [];
  for (const decl of style.split(';')) {
    const colon = decl.indexOf(':');
    if (colon < 0) continue;
    const prop = decl.slice(0, colon).trim().toLowerCase();
    const val = decl.slice(colon + 1).trim();
    if (!prop || !val) continue;
    if (STRIP_STYLE_EXACT.has(prop)) continue;
    if (STRIP_STYLE_PREFIXES.some(p => prop.startsWith(p))) continue;
    if (ALLOWED_STYLES.has(prop)) out.push(`${prop}:${val}`);
  }
  return out.join(';');
}

// ─── Semantic span promotion ──────────────────────────────────────────────

function promoteSpan(span: HTMLElement): void {
  // Read computed-like values from inline style string
  const styleStr = span.getAttribute('style') ?? '';
  const props = parseStyleProps(styleStr);

  const fw = props['font-weight'] ?? '';
  const fs = props['font-style'] ?? '';
  const td = props['text-decoration'] ?? '';
  const bg = props['background-color'] ?? '';

  // font-weight:bold/700 → <strong>
  if (fw === '700' || fw === 'bold') {
    delete props['font-weight'];
    const strong = document.createElement('strong');
    strong.innerHTML = span.innerHTML;
    const rem = serializeProps(props);
    if (rem) strong.setAttribute('style', rem);
    span.parentNode?.replaceChild(strong, span);
    return;
  }

  // font-style:italic → <em>
  if (fs === 'italic') {
    delete props['font-style'];
    const em = document.createElement('em');
    em.innerHTML = span.innerHTML;
    const rem = serializeProps(props);
    if (rem) em.setAttribute('style', rem);
    span.parentNode?.replaceChild(em, span);
    return;
  }

  // text-decoration:underline (not line-through) → <u>
  if (td.includes('underline') && !td.includes('line-through')) {
    delete props['text-decoration'];
    const u = document.createElement('u');
    u.innerHTML = span.innerHTML;
    const rem = serializeProps(props);
    if (rem) u.setAttribute('style', rem);
    span.parentNode?.replaceChild(u, span);
    return;
  }

  // text-decoration:line-through (not underline) → <s>
  if (td.includes('line-through') && !td.includes('underline')) {
    delete props['text-decoration'];
    const s = document.createElement('s');
    s.innerHTML = span.innerHTML;
    const rem = serializeProps(props);
    if (rem) s.setAttribute('style', rem);
    span.parentNode?.replaceChild(s, span);
    return;
  }

  // background-color that looks like a highlight → <mark>
  if (bg && isHighlightColor(bg)) {
    delete props['background-color'];
    const mark = document.createElement('mark');
    mark.innerHTML = span.innerHTML;
    const rem = serializeProps(props);
    if (rem) mark.setAttribute('style', rem);
    span.parentNode?.replaceChild(mark, span);
    return;
  }

  // If no allowed style props remain, unwrap the span entirely
  const remaining = serializeProps(props);
  if (!remaining) unwrap(span);
}

function parseStyleProps(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of style.split(';')) {
    const colon = decl.indexOf(':');
    if (colon < 0) continue;
    const p = decl.slice(0, colon).trim().toLowerCase();
    const v = decl.slice(colon + 1).trim();
    if (p && v) out[p] = v;
  }
  return out;
}

function serializeProps(props: Record<string, string>): string {
  return Object.entries(props)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}

function isHighlightColor(color: string): boolean {
  const c = color.toLowerCase().replace(/\s/g, '');
  if (['yellow', '#ffff00', '#fef08a', '#fffd38', '#ffff4d', '#fff176'].includes(c)) return true;
  const m = c.match(/rgba?\((\d+),(\d+),(\d+)/);
  if (m) {
    const r = +m[1], g = +m[2], b = +m[3];
    if (r > 200 && g > 200 && b < 80) return true; // yellow family
  }
  return false;
}

// ─── Step 5/6 ─────────────────────────────────────────────────────────────

function collapseEmptySpans(root: HTMLElement): void {
  // Unwrap spans with no attributes left
  root.querySelectorAll<HTMLElement>('span').forEach(span => {
    if (!span.isConnected) return;
    const hasStyle = !!span.getAttribute('style');
    const hasCls = !!span.getAttribute('class');
    if (!hasStyle && !hasCls) unwrap(span);
  });
}

function removeEmptyBlocks(root: HTMLElement): void {
  root.querySelectorAll('p, li').forEach(el => {
    if (!el.textContent?.trim() && !el.querySelector('img, br, input')) {
      el.remove();
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function unwrap(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

/** Replace element in-place with a new tag, copying innerHTML and attributes */
function morphTag(el: Element, newTag: string): void {
  const replacement = document.createElement(newTag);
  replacement.innerHTML = el.innerHTML;
  // Copy surviving attributes (class/id already stripped above, style already filtered)
  Array.from(el.attributes).forEach(a => replacement.setAttribute(a.name, a.value));
  el.parentNode?.replaceChild(replacement, el);
}

/** Convert <font> element → <span style="..."> */
function fontToSpan(font: HTMLElement): HTMLElement {
  const span = document.createElement('span');
  span.innerHTML = font.innerHTML;
  const styles: string[] = [];
  const color = font.getAttribute('color');
  if (color) styles.push(`color:${color}`);
  const face = font.getAttribute('face');
  if (face) styles.push(`font-family:${face}`);
  const size = font.getAttribute('size');
  if (size && FONT_SIZE_MAP[size]) styles.push(`font-size:${FONT_SIZE_MAP[size]}`);
  if (styles.length) span.setAttribute('style', styles.join(';'));
  return span;
}
