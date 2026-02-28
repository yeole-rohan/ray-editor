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
