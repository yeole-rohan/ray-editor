# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | ✅ Active support |
| 1.x     | ⚠️ Security fixes only |
| < 1.0   | ❌ No longer supported |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use GitHub's private vulnerability reporting instead:

1. Go to the **Security** tab of this repository
2. Click **"Report a vulnerability"**
3. Fill in the details and submit

Alternatively, email **rohan.yeole@rohanyeole.com** with:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

### What to expect

| Timeline | Action |
|----------|--------|
| **48 hours** | Acknowledgement of your report |
| **7 days** | Initial assessment and severity rating |
| **30 days** | Target for a patch release (critical issues prioritised) |
| **90 days** | Public disclosure (coordinated with reporter) |

We follow [responsible disclosure](https://en.wikipedia.org/wiki/Responsible_disclosure).
Credit will be given in the release notes unless you prefer to remain anonymous.

## Scope

Issues in scope:
- Cross-site scripting (XSS) through editor content parsing or output
- Prototype pollution in the editor instance or plugin API
- Arbitrary code execution via plugin API or event system
- Content injection through paste / image / file upload handling
- Dependency vulnerabilities with a direct exploit path

Out of scope:
- Vulnerabilities in the end-user's own application logic
- Self-XSS (user attacking themselves in their own browser)
- Issues that require physical access to the device
- Social engineering

## Security Best Practices for Integrators

- **Sanitize output** before inserting `editor.getContent()` into the DOM server-side
  (RayEditor is a client-side authoring tool, not an HTML sanitizer)
- **Validate uploads server-side** — never trust `imageUploadUrl` / `fileUploadUrl` responses alone
- **Content Security Policy**: add a `Content-Security-Policy` header in your app;
  RayEditor does not require `unsafe-eval`
- **Keep dependencies updated** — Dependabot PRs are reviewed and merged promptly

---

## Known Design Decisions (not vulnerabilities)

### `setContent(html)` trusts the caller

`editor.setContent(html)` is a **trusted developer API**. It accepts arbitrary HTML and
sets it directly as the editor's content without sanitization. This is intentional —
sanitizing would break legitimate CMS use cases where implementers need to restore rich
content including inline styles, custom attributes, and complex HTML structures.

**If your source HTML is untrusted** (e.g. loaded from user-submitted content, a database
row that accepts arbitrary input, or a third-party API), you **must sanitize it before
calling `setContent()`**. Recommended libraries:

```js
import DOMPurify from 'dompurify';
editor.setContent(DOMPurify.sanitize(untrustedHtml));
```

Calling `editor.getContent()` after `setContent()` with untrusted HTML does **not** make
the content safe — the editor does not strip event attributes on load.

This is the same model used by TinyMCE, CKEditor, and Quill.

---

### Client-side MIME type check on image upload

When a user selects an image via the toolbar's image upload button, RayEditor checks
`file.type.startsWith('image/')` client-side before sending the file to your endpoint.
This check prevents honest mistakes (e.g. selecting a PDF by accident) but is **not a
security control** — a malicious user can spoof the MIME type trivially.

**Always validate file type and content server-side** at your `imageUploadUrl` endpoint.
Recommended approach:

1. Check the file's magic bytes (not just extension or MIME header)
2. Reject unexpected content types with a `400` or `422` response
3. Store uploaded files outside the web root or behind a CDN with `Content-Disposition: attachment`
4. Never execute uploaded files server-side

The same applies to `fileUploadUrl` — RayEditor performs no MIME validation for general
file uploads (any file type is allowed through the file upload button by design).
