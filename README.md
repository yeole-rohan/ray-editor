# RayEditor

> Lightweight, dependency-free WYSIWYG rich text editor — free alternative to TinyMCE & CKEditor.

[![npm version](https://img.shields.io/npm/v/@rohanyeole/ray-editor.svg)](https://www.npmjs.com/package/@rohanyeole/ray-editor)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Bundle Size](https://img.shields.io/badge/bundle-~45KB-blue)](https://bundlephobia.com/package/@rohanyeole/ray-editor)

**[Live Demo & Docs](https://ray-editor.rohanyeole.com)** · **[Issues](https://github.com/yeole-rohan/ray-editor/issues)** · **[npm](https://www.npmjs.com/package/@rohanyeole/ray-editor)**

![RayEditor preview](https://github.com/user-attachments/assets/d9f38163-fdfa-4f57-9d16-1234e6d78b7c)

Zero dependencies · TypeScript · MIT · React / Vue / Angular / Svelte wrappers · ~45 KB min+gzip

---

## Install

```bash
npm install @rohanyeole/ray-editor
```

```js
import { RayEditor } from '@rohanyeole/ray-editor';
import '@rohanyeole/ray-editor/css';

const editor = new RayEditor('editor', { theme: 'light' });
```

### CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@rohanyeole/ray-editor@2/dist/ray-editor.css">
<script src="https://cdn.jsdelivr.net/npm/@rohanyeole/ray-editor@2/dist/ray-editor.umd.min.js"></script>

<div id="editor"></div>
<script>
  const editor = new RayEditor.RayEditor('editor', { theme: 'light' });
</script>
```

---

## Basic Usage

```js
const editor = new RayEditor('editor', {
  theme: 'light',            // 'light' | 'dark' | 'auto'
  wordCount: true,
  onChange: (html) => console.log(html),
  toolbar: [
    ['bold', 'italic', 'underline'],
    ['headings', 'blockquote'],
    ['link', 'imageUpload', 'table'],
    ['undo', 'redo'],
  ],
});

editor.getContent();           // → HTML string
editor.setContent('<p>Hi</p>');
editor.setTheme('dark');
editor.setReadOnly(true);
editor.destroy();
```

---

## Features

- Bold, italic, underline, strikethrough, superscript, subscript, highlight
- Headings (H1–H6), blockquote, horizontal rule
- Ordered / unordered lists, indent / outdent, text alignment
- Font size picker, font family, text color, background color
- Tables (insert, resize columns/rows, add/remove rows & cols, floating toolbar)
- Links (insert, edit, remove, hover tooltip, new-tab toggle)
- Image upload (8-direction resize handles, alt / title / caption editor)
- File upload with inline preview (image / video / audio / download link)
- Code blocks with syntax highlighting (highlight.js) + inline code
- Task lists (interactive checkboxes, keyboard navigation)
- Callout blocks (Info / Warning / Success / Error / Tip / Note / Important / Caution)
- Emoji picker (800+ emojis, search, recently used)
- Special characters picker (90+ symbols)
- Date/time insertion
- Slash commands (/) — Notion-style command palette
- Markdown mode — bidirectional rich text ↔ Markdown
- Markdown shortcuts (**, ##, >, ---, etc.)
- Find & Replace (Ctrl+F / Ctrl+H)
- Dark mode + CSS variable theming
- Fullscreen, print, show HTML source, remove format
- Plugin API + custom slash commands
- Word count bar
- Spell check toggle
- Auto-save hook
- @Mentions
- Undo/redo (100-entry history)
- Paste normalisation (Word, Google Docs, GitHub, etc.)

**[Full documentation and live demo →](https://ray-editor.rohanyeole.com)**

---

## Framework Wrappers

Dedicated packages for React, Vue 3, Angular, and Svelte are available in the
[`packages/`](packages/) directory and on npm under `@rohanyeole/ray-editor-*`.

See the [docs site](https://ray-editor.rohanyeole.com) for framework-specific examples.

---

## Contributing

```bash
git clone https://github.com/yeole-rohan/ray-editor
npm install
npm run dev    # watch build
npm test       # run tests (vitest + jsdom)
```

Open an issue before starting work on large features so we can align on the design.
See [ROADMAP.md](ROADMAP.md) for tracked bugs and planned features.

---

## Security

See [SECURITY.md](SECURITY.md) for the vulnerability reporting process, integrator
best practices, and documented design decisions (including `setContent()` trust model
and upload MIME validation).

---

## License

[MIT](LICENSE) © [Rohan Yeole](https://rohanyeole.com)
