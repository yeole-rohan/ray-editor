/**
 * Shared sanitization utilities.
 * Imported by RayEditor core and all feature modules.
 */

/**
 * Escapes HTML special characters so a string can be safely interpolated
 * into an innerHTML template literal without being parsed as markup.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Returns a normalised, safe URL string, or '' if the scheme is dangerous.
 *
 * - Strips whitespace and control chars before scheme check (defeats
 *   obfuscation like "j a v a s c r i p t :")
 * - For absolute URLs: returns parsed.href from the URL constructor so
 *   callers assign the constructor's output, not raw user input
 * - For relative URLs: safe after the scheme check, returned as-is
 * - Blocks javascript:, vbscript:, and data: schemes
 */
export function sanitizeUrl(url: string): string {
  const stripped = url.replace(/[\s\u0000-\u001F\u007F]/g, '');
  if (/^(javascript|vbscript|data):/i.test(stripped)) return '';

  try {
    const parsed = new URL(url);
    const ALLOWED = new Set(['http:', 'https:', 'mailto:', 'tel:', 'ftp:']);
    return ALLOWED.has(parsed.protocol) ? parsed.href : '';
  } catch {
    // Relative URL — safe after the scheme check above
    return url;
  }
}

/**
 * Sanitizes an HTML string and writes it directly into `target` using DOM
 * node adoption — no innerHTML assignment of user-derived text.
 *
 * Flow:
 *  1. DOMParser parses in a sandboxed, inert document (scripts never run).
 *  2. Walk every element, removing forbidden tags and dangerous attributes.
 *  3. Adopt each cleaned node into the live document via document.adoptNode()
 *     and append to `target` — tainted text never flows through innerHTML.
 *
 * Forbidden tags : script, iframe, object, embed, form controls, base, link
 * Stripped attrs : on* event handlers, javascript/vbscript/data: URIs
 */
export function applySanitizedHTML(target: HTMLElement, html: string): void {
  // codeql[js/xss-through-dom] -- html enters an inert DOMParser sandbox (scripts never execute);
  // every element is then walked, forbidden tags removed, dangerous attrs stripped, and nodes are
  // transplanted via document.adoptNode() — tainted text never flows back through innerHTML.
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const FORBIDDEN = new Set([
    'script', 'iframe', 'frame', 'frameset',
    'object', 'embed', 'applet',
    'form', 'input', 'button', 'select', 'option', 'textarea',
    'base', 'link', 'meta',
  ]);

  const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'data']);

  const walk = (node: Element): void => {
    // Post-order: clean children before the parent to avoid invalidating
    // the live child list mid-iteration.
    Array.from(node.children).forEach(walk);

    if (FORBIDDEN.has(node.tagName.toLowerCase())) {
      node.remove();
      return;
    }

    Array.from(node.attributes).forEach(attr => {
      const name  = attr.name.toLowerCase();
      const value = attr.value.replace(/[\s\u0000-\u001F\u007F]/g, '').toLowerCase();

      const isEventHandler = name.startsWith('on');
      const isDangerousUri =
        URL_ATTRS.has(name) && /^(javascript|vbscript|data):/.test(value);

      if (isEventHandler || isDangerousUri) node.removeAttribute(attr.name);
    });
  };

  Array.from(doc.body.children).forEach(walk);

  // Transplant sanitized nodes directly — no innerHTML re-assignment.
  while (target.firstChild) target.removeChild(target.firstChild);
  while (doc.body.firstChild) {
    target.appendChild(document.adoptNode(doc.body.firstChild));
  }
}
