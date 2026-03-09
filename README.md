# RayEditor

> Lightweight, dependency-free WYSIWYG rich text editor — free alternative to TinyMCE & CKEditor.

[![npm version](https://img.shields.io/npm/v/@rohanyeole/ray-editor.svg)](https://www.npmjs.com/package/@rohanyeole/ray-editor)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Bundle Size](https://img.shields.io/badge/bundle-~45KB-blue)](https://bundlephobia.com/package/@rohanyeole/ray-editor)

**[Demo](https://github.com/yeole-rohan/ray-editor)** · **[Issues](https://github.com/yeole-rohan/ray-editor/issues)** · **[npm](https://www.npmjs.com/package/@rohanyeole/ray-editor)**

![RayEditor preview](https://github.com/user-attachments/assets/d9f38163-fdfa-4f57-9d16-1234e6d78b7c)

---

## Why RayEditor?

| Feature | TinyMCE Free | Quill | CKEditor 5 | **RayEditor v2** |
|---------|:-----------:|:-----:|:----------:|:----------------:|
| Open Source (MIT) | Limited | ✅ | Limited | ✅ |
| Zero dependencies | ❌ | ❌ | ❌ | ✅ |
| npm install | ✅ | ✅ | ✅ | ✅ |
| CDN `<script>` tag | ✅ | ✅ | ✅ | ✅ |
| React / Vue / Angular / Svelte | ✅ | ✅ | ✅ | ✅ |
| TypeScript types | ✅ | ✅ | ✅ | ✅ |
| Plugin API | ✅ | ✅ | ✅ | ✅ |
| Slash commands (/) | ❌ | ❌ | ❌ | ✅ |
| Dark mode | Paid | ❌ | Paid | ✅ Free |
| CSS variable theming | ❌ | ❌ | Limited | ✅ |
| Markdown shortcuts | Paid | ❌ | Paid | ✅ Free |
| Find & Replace | Paid | ❌ | Paid | ✅ Free |
| Word count | Paid | ❌ | Paid | ✅ Free |
| Fullscreen mode | Paid | ❌ | Paid | ✅ Free |
| Toolbar array config | ❌ | ❌ | ✅ | ✅ |
| Bundle size (min+gzip) | ~260KB | ~100KB | ~270KB+ | **~45KB target** |
| License cost | Freemium | Free | Freemium | **100% Free** |

---

## Quick Start (CDN)

```html
<!-- CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@rohanyeole/ray-editor@2/dist/ray-editor.css">
<!-- JS — exposes window.RayEditor -->
<script src="https://cdn.jsdelivr.net/npm/@rohanyeole/ray-editor@2/dist/ray-editor.umd.min.js"></script>

<div id="editor"></div>
<script>
  const editor = new RayEditor.RayEditor('editor', {
    theme: 'light',
    wordCount: true,
  });
</script>
```

---

## Install via npm

```bash
npm install @rohanyeole/ray-editor
```

```js
import { RayEditor } from '@rohanyeole/ray-editor';
import '@rohanyeole/ray-editor/css';

const editor = new RayEditor('editor', { theme: 'light' });
```

---

## Framework Usage

RayEditor is framework-agnostic — use it directly in any framework by mounting it in a container element.

### React

```bash
npm install @rohanyeole/ray-editor
```

```tsx
import { useEffect, useRef } from 'react';
import { RayEditor } from '@rohanyeole/ray-editor';
import '@rohanyeole/ray-editor/css';

function Editor({ onChange }: { onChange?: (html: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RayEditor | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    editorRef.current = new RayEditor(containerRef.current, {
      theme: 'light',
      wordCount: true,
      onChange,
    });
    return () => editorRef.current?.destroy();
  }, []);

  return <div ref={containerRef} />;
}
```

### Vue 3

```bash
npm install @rohanyeole/ray-editor
```

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { RayEditor } from '@rohanyeole/ray-editor';
import '@rohanyeole/ray-editor/css';

const container = ref<HTMLDivElement>();
let editor: RayEditor;

onMounted(() => {
  editor = new RayEditor(container.value!, { theme: 'light', wordCount: true });
});
onUnmounted(() => editor?.destroy());
</script>

<template>
  <div ref="container" />
</template>
```

### Angular

```bash
npm install @rohanyeole/ray-editor
```

```typescript
import { Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { RayEditor } from '@rohanyeole/ray-editor';
import '@rohanyeole/ray-editor/css';

@Component({
  selector: 'app-editor',
  template: `<div #container></div>`,
})
export class EditorComponent implements OnInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef;
  private editor!: RayEditor;

  ngOnInit() {
    this.editor = new RayEditor(this.containerRef.nativeElement, { theme: 'light' });
  }
  ngOnDestroy() { this.editor?.destroy(); }
}
```

### Svelte

```bash
npm install @rohanyeole/ray-editor
```

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { RayEditor } from '@rohanyeole/ray-editor';
  import '@rohanyeole/ray-editor/css';

  let container: HTMLDivElement;
  let editor: RayEditor;

  onMount(() => { editor = new RayEditor(container, { theme: 'light' }); });
  onDestroy(() => editor?.destroy());
</script>

<div bind:this={container} />
```

---

## Toolbar Configuration

Each sub-array is a visual group separated by a divider.

```js
const editor = new RayEditor('editor', {
  toolbar: [
    ['bold', 'italic', 'underline', 'strikethrough'],
    ['headings', 'blockquote'],
    ['orderedList', 'unorderedList', 'indent', 'outdent'],
    ['link', 'imageUpload', 'table'],
    ['undo', 'redo', 'removeFormat'],
    ['showSource', 'fullscreen'],
  ],
});
```

### All Toolbar Keys

| Key | Description |
|-----|-------------|
| `bold` | Bold |
| `italic` | Italic |
| `underline` | Underline |
| `strikethrough` | Strikethrough |
| `superscript` | Superscript (x²) |
| `subscript` | Subscript (x₂) |
| `uppercase` | Transform to uppercase |
| `lowercase` | Transform to lowercase |
| `toggleCase` | Toggle case |
| `textColor` | Text color picker |
| `backgroundColor` | Background color picker |
| `fonts` | Font family dropdown |
| `headings` | Heading dropdown (H1–H6, Blockquote, Paragraph) |
| `orderedList` | Ordered list |
| `unorderedList` | Unordered list |
| `indent` | Indent |
| `outdent` | Outdent |
| `textAlignment` | Alignment dropdown (Left/Center/Right/Justify) |
| `hr` | Horizontal rule |
| `codeBlock` | Code block |
| `codeInline` | Inline code |
| `link` | Insert / edit link |
| `imageUpload` | Upload & insert image |
| `fileUpload` | Upload & insert file link |
| `table` | Insert table (grid picker) — click inside any cell for the floating context toolbar |
| `emoji` | Emoji picker |
| `insertDateTime` | Insert current date & time |
| `undo` | Undo |
| `redo` | Redo |
| `removeFormat` | Clear all formatting |
| `showSource` | Toggle HTML source view |
| `fullscreen` | Fullscreen mode |
| `print` | Print editor content |
| `markdownToggle` | Switch Rich Text ↔ Markdown mode |
| `importMarkdown` | Import a `.md` file |
| `exportMarkdown` | Export as `.md` file |

---

## All Options

```ts
const editor = new RayEditor('editor', {
  // Toolbar
  toolbar: ToolbarGroup[],          // default: full toolbar

  // Uploads
  imageUpload: {
    imageUploadUrl: string,         // POST endpoint returning { url: string }
    imageMaxSize: number,           // bytes, default 20MB
  },
  fileUpload: {
    fileUploadUrl: string,
    fileMaxSize: number,            // bytes, default 50MB
  },

  // Mentions
  mentions: {
    enableMentions: boolean,        // default false
    mentionTag: string,             // trigger char, default '@'
    mentionElement: 'span' | 'a',  // default 'span'
    mentionUrl: string,             // base URL for <a> hrefs
  },

  // UI / Behaviour
  toolbarType: 'default' | 'inline', // inline = toolbar on focus
  overflowMenu: boolean,             // collapse overflow into '…'
  readOnly: boolean,                 // disable editing
  markdownShortcuts: boolean,        // default true
  wordCount: boolean,                // show word count bar
  findReplace: boolean,              // default true
  slashCommands: boolean,            // default true
  historySize: number,               // default 100

  // Theming
  theme: 'light' | 'dark' | 'auto',
  initStyles: boolean,               // auto-inject CSS link
  stylesheetUrl: string,             // custom CSS URL
  hideWatermark: boolean,

  // Extensibility
  plugins: RayPlugin[],
  onChange: (html: string) => void,
});
```

---

## Plugin API

```js
const MyPlugin = {
  name: 'my-plugin',

  install(editor) {
    // Add toolbar button
    editor.addButton({
      name: 'my-btn',
      icon: '★',
      tooltip: 'Insert star',
      action: () => document.execCommand('insertText', false, '⭐'),
    });

    // Register slash command
    editor.registerSlashCommand({
      name: 'Insert Date',
      icon: '📅',
      description: 'Insert today\'s date',
      action: () => document.execCommand('insertText', false, new Date().toLocaleDateString()),
    });

    // Listen to events
    editor.on('content:change', ({ html }) => {
      console.log('Changed:', html.length, 'chars');
    });

    // Cancel a command
    editor.on('command:before', (event) => {
      if (event.command === 'delete') return false; // cancel
    });
  },

  destroy() {
    // cleanup
  },
};

editor.use(MyPlugin);
// or: new RayEditor('id', { plugins: [MyPlugin] })
```

---

## Slash Commands

Type `/` at the start of an empty block → command palette appears.

Built-in: Heading 1–3, Paragraph, Bulleted List, Numbered List, Blockquote, Code Block, Table, Horizontal Rule.

```js
editor.registerSlashCommand({
  name: 'Meeting Template',
  icon: '📋',
  description: 'Insert a meeting notes template',
  action: () => {
    editor.setContent('<h2>Meeting Notes</h2><p>Date: </p>');
  },
});
```

---

## Find & Replace

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Open Find panel |
| `Ctrl+H` | Open Find & Replace |
| `Enter` / `▼` | Next match |
| `Shift+Enter` / `▲` | Previous match |
| `Escape` | Close panel |

---

## Dark Mode & CSS Variables

Dark mode is **bundled inside `ray-editor.css`** — no separate stylesheet needed. Just call `setTheme()`:

```js
editor.setTheme('dark');
editor.setTheme('light');
// or auto-detect OS preference:
new RayEditor('container', { theme: 'auto' });
```

Override any CSS variable to create a custom theme:

```css
.ray-editor-wrapper {
  --ray-bg: #ffffff;
  --ray-toolbar-bg: #f8f9fa;
  --ray-border: #e2e8f0;
  --ray-text: #1a202c;
  --ray-accent: #3b82f6;
  --ray-code-bg: #1e1e1e;
  --ray-code-text: #d4d4d4;
  /* ... see full list in src/themes/light.css */
}
```

---

## Markdown Mode

RayEditor supports full bidirectional Markdown editing — switch between rich text and raw Markdown at any time without losing content. Most editors charge for this.

### Toolbar buttons

| Key | Description |
|-----|-------------|
| `markdownToggle` | Switch between Rich Text ↔ Markdown mode |
| `importMarkdown` | Import a `.md` file — opens file picker, converts to rich text |
| `exportMarkdown` | Export current content as a `.md` file download |

```js
const editor = new RayEditor('editor', {
  toolbar: [
    ['bold', 'italic', 'headings'],
    ['markdownToggle', 'importMarkdown', 'exportMarkdown'],
  ],
});
```

### What converts

| Markdown | Rich Text |
|----------|-----------|
| `# Heading` | `<h1>` |
| `**bold**` / `__bold__` | `<strong>` |
| `*italic*` / `_italic_` | `<em>` |
| `~~strike~~` | `<s>` |
| `` `code` `` | `<code>` |
| ` ```lang ` fenced block | Code block with language selector |
| `> blockquote` | `<blockquote>` |
| `- item` / `1. item` | `<ul>` / `<ol>` |
| `[text](url)` | `<a href="url">` |
| `![alt](url)` | `<img>` |
| `---` | `<hr>` |
| Tables (`\| col \| col \|`) | `<table>` |

`getContent()` always returns HTML regardless of which mode is active.

---

## Markdown Shortcuts

| Input | Output |
|-------|--------|
| `# ` | Heading 1 |
| `## ` | Heading 2 |
| `### ` | Heading 3 |
| `> ` | Blockquote |
| `---` + Enter | Horizontal rule |
| `**text**` | **Bold** |
| `*text*` | *Italic* |
| `` `code` `` | `Inline code` |

Disable: `markdownShortcuts: false`

---

## Public API

`getContent()` returns clean, portable HTML — all editor UI chrome is stripped:
- Tables output as plain `<table>` with no CSS classes
- Code blocks output as `<pre data-lang="js"><code>…</code></pre>`
- `setContent()` accepts the same clean HTML and rebuilds the full interactive editor UI

```ts
editor.getContent(): string
editor.setContent(html: string): void

// v1 aliases (backward compat)
editor.getRayEditorContent(): string
editor.setRayEditorContent(html: string): void

editor.on(event: string, handler: Function): void
editor.off(event: string, handler: Function): void
editor.emit(event: string, data?: any): void

editor.use(plugin: RayPlugin): this
editor.addButton(config: ButtonConfig): void
editor.removeButton(name: string): void
editor.registerSlashCommand(cmd: SlashCommandConfig): void
editor.registerCommand(name: string, handler: Function): void
editor.execCommand(name: string, value?: string): void

editor.setTheme('light' | 'dark'): void
editor.setReadOnly(readOnly: boolean): void
editor.getWordCount(): { words: number; chars: number }
editor.destroy(): void

editor.editorElement: HTMLElement  // the contenteditable div
editor.toolbarElement: HTMLElement // the toolbar div
```

### Events

| Event | Data |
|-------|------|
| `content:change` | `{ html: string }` |
| `selection:change` | — |
| `focus` | — |
| `blur` | — |
| `command:before` | `{ command, value }` — return `false` to cancel |
| `command:after` | `{ command, value }` |
| `plugin:install` | `{ name }` |
| `plugin:destroy` | `{ name }` |
| `theme:change` | `{ theme }` |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+U` | Underline |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+F` | Find |
| `Ctrl+H` | Find & Replace |
| `Tab` | Indent |
| `Shift+Tab` | Outdent |
| `Escape` | Exit fullscreen / close palette |
| `/` | Slash command palette |

---

## Migration from v1

v2 is **fully backward compatible**. All v1 code works unchanged.

```js
// v1 — works in v2 unchanged
new RayEditor('container', {
  bold: true, italic: true, mentions: { enableMentions: true }
});
editor.getRayEditorContent();
editor.setRayEditorContent('<p>hello</p>');
editor.addEventListener('keyup', fn);
```

New v2 additions are purely additive.

---

## Contributing

```bash
git clone https://github.com/yeole-rohan/ray-editor
npm install
npm run dev    # watch build
npm test       # run tests
```

---

## License

[MIT](LICENSE) © [Rohan Yeole](https://rohanyeole.com)
