# ✍️ ray-editor — A Rich WYSIWYG Content Editor

A lightweight, customizable rich-text content editor built with **pure JavaScript** — designed for a smooth writing experience with support for emoji, code formatting, uploads, and intuitive tooltips.

---

## 🚀 Why Use This Editor?

Unlike many online editors with bloat, trackers, or complex dependencies, `ray-editor` is:

- **Private & Local** – No external trackers or analytics.
- **Framework-Free** – Works in vanilla JavaScript, no React/Vue needed.
- **Customizable** – Fine-grained control over toolbar options and behavior.
- **Emoji-Ready** – Beautiful categorized emoji picker with smart cursor positioning.
- **Developer Friendly** – Simple API, modular code, and ready-to-use CDN links.

---

## ✨ Features

- 🧠 Auto-generating UI from config (`codeBlock` → "Code Block")
- 🎨 Syntax-highlighted code blocks + inline `code` styling
- 😊 Categorized emoji picker positioned precisely at the cursor
- 📁 Image & File upload with callback support
- ⚡ No bundler or build step — just include and go

---

## 📦 Quick Start (CDN)

Include the following in your HTML:

```html
<!-- CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/yeole-rohan/ray-content-editor@latest/ray-editor.css">

<!-- JS -->
<script src="https://cdn.jsdelivr.net/gh/yeole-rohan/ray-content-editor@latest/ray-editor.js"></script>
```

Sure! Here’s an updated version of the **“Then initialize the editor”** section in your README, now titled **🔧 How to Use**, with step-by-step instructions to make setup easier for new users:

---

### 🔧 How to Use

Once you’ve included the CSS and JS files via CDN, follow these steps to integrate the editor into your page:

#### 1. Add an Editable Container

Create a `div` with a unique ID where the editor will be initialized.

```html
<div id="content" contenteditable="true"></div>
```

> 💡 You can style this `div` using CSS for width, height, and borders as needed.

#### 2. Initialize the Editor

Use the `initEditor` function from the script and configure your desired tools.

```html
<script type="module">
  import { initEditor } from 'https://cdn.jsdelivr.net/gh/yeole-rohan/ray-content-editor@latest/ray-editor.js';

  document.addEventListener('DOMContentLoaded', () => {
    initEditor('content', {
      bold: true,
      italic: true,
      underline: true,
      strikethrough: true,
      redo: true,
      undo: true,
      headings: true,
      link: true,
      lowercase: true,
      uppercase: true,
      superscript: true,
      subscript: true,
      orderedList: true,
      unorderedList: true,
      toggleCase: true,
      codeBlock: true,
      codeInline: true,
      emoji: true,
      imageUpload: {
        imageUploadUrl: '/img-upload-path/', // Required
      },
      fileUpload: {
        fileUploadUrl: '/file-upload-path/', // Required
      }
    });
  });
</script>
```

#### 3. Customize Your Configuration

Each toolbar button can be toggled on/off. For example:

* Set `emoji: false` to hide the emoji picker
* Omit `fileUpload` if you don’t need upload functionality

You can also extend the configuration with custom actions or integrations.

---