# ✨ RayEditor — Lightweight Rich Text Editor

**RayEditor** is a modern, customizable, and lightweight WYSIWYG content editor built with pure JavaScript. It offers a seamless writing experience with support for rich text formatting, code blocks, media uploads, and more. Perfect for blogs, CMS platforms, documentation tools, and any web application requiring rich content editing.

---

## 🖼️ Preview
![image](https://github.com/user-attachments/assets/d9f38163-fdfa-4f57-9d16-1234e6d78b7c)

---

[Check out Live Preview](https://rohanyeole.com/ray-editor/)

## 🚀 Features

### ✍️ Text Formatting

* **Bold, Italic, Underline, Strikethrough**
  Standard rich text styling options.
* **Uppercase, Lowercase, Toggle Case**
  Easily transform selected text casing.
* **Subscript & Superscript**
  Great for scientific and mathematical content.

### 🧱 Headings & Lists

* **Headings**
  Supports H1 to H6.
* **Ordered & Unordered Lists**
  Create structured content effortlessly.

### 🔄 Undo/Redo

* Quickly revert or reapply actions as needed.

### 🔤 Case Transformations

* Change casing for selected text using one click.

### 💻 Code Support

* **Inline Code**
  Highlight code snippets inline.
* **Code Blocks**
  Insert multi-line formatted code blocks.

### 🎨 Color Customization

* **Text Color**
  Pick a color for text.
* **Background Color**
  Highlight text with background color.

### 🖼️ Image Upload

* Upload and insert images.
* Configurable upload URL and file size limits.
* Resize, drag, and remove images easily.

### 📄 File Upload

* Upload and attach documents or media files.
* Size limits and upload endpoints are customizable.

### 💬 Mentions

* When enabled, type the configured tag, @ by default, and any alphanumeric character (and underscores _ ) to create a tag that can then be used by your own code to make interactible. 
* Or configure the `mentionElement: "a"` option and the `mentionUrl:""` to have the mention link to a specific page.

### 🙌 Automatic Stylesheet Insertion

* Optionally configure RayEditor to insert the stylesheet into the DOM so you don't have to manage it manually.

### ➖ Toolbar Types

* Multiple types of toolbars. Current options: "`default`" | "`inline`"
* Inline toolbars are hidden until the editor area is focused and will hide again once focus is completely lost from the editor and the toolbar.

### Toolbar Overflow Mode (1-Line Toolbar Mode)

* Automatically calculates the width of the toolbar area and tries to shrink the total buttons to fit on a single line. Useful when using the inline toolbar style so the toolbar is smaller overall.
* Options: `overflowMenu:` `true` | `false`


---

### ⌗ Tables

* Add Row: Add a new row below the selected row.
* Delete Row: Remove the selected row.
* Add Column: Add a new column to the right of the selected cell.
* Delete Column: Remove the selected column.
* Remove Table: Delete the entire table.

---

## 🛠️ Setup Guide

### 1. Include RayEditor via CDN

```html
<!-- RayEditor CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/yeole-rohan/ray-editor@main/ray-editor.css">

<!-- RayEditor JS -->
<script src='https://cdn.jsdelivr.net/gh/yeole-rohan/ray-editor@main/ray-editor.js'></script>
```

### 2. Add an Editor Container

```html
<div id="content"></div>
```

### 3. Initialize RayEditor

```javascript
document.addEventListener('DOMContentLoaded', () => {
   const editor = new RayEditor('content', {
      bold: true,
      italic: true,
      underline: true,
      strikethrough: true,
      redo: true,
      undo: true,
      headings: true,
      lowercase: true,
      uppercase: true,
      superscript: true,
      subscript: true,
      orderedList: true,
      unorderedList: true,
      toggleCase: true,
      codeBlock: true,
      codeInline: true,
      imageUpload: {
         imageUploadUrl: '/upload-blog-file/',
         imageMaxSize: 20 * 1024 * 1024 // 20MB
      },
      fileUpload: {
         fileUploadUrl: '/upload-file/',
         fileMaxSize: 20 * 1024 * 1024 // 20MB
      },
      textColor: true,
      backgroundColor: true,
      link: true,
      table: true,
      textAlignment:true,
      mentions: {
        enableMentions: false,
        mentionElement: "span",
        mentionUrl:"",
        mentionTag:""
      },
      initStyles: false,
      stylesheetUrl: "",
      hideWatermark: false,
      toolbarType: "default",
      overflowMenu: false
   });
});
```

## ```'/upload-file/'``` should return json with the following

```
{
  "url":"path of uploaded file or image"
}
```
E.g 

```
{
  "url" : "https://rohanyeole.com/static/file/somename.png"
}
```

---

## 📦 Configuration Options

* **Toolbar Buttons**: Toggle each tool individually via boolean flags.
* **imageUpload**:

  * `imageUploadUrl`: Upload endpoint for images.
  * `imageMaxSize`: Max file size in bytes.
* **fileUpload**:

  * `fileUploadUrl`: Upload endpoint for files.
  * `fileMaxSize`: Max file size in bytes.

* **Mentions**: Replace tags such as "@username" with an HTML element.

  * `enableMentions`: Default: false - Enables the mention functionality.
  
  * `mentionUrl`: The relative or absolute path you want to link to. The tagged value will be appended to the end of the url defined. Ex. `mentionUrl:"/user/" = "/user/{username}"

  * `mentionElement`: Default: span - The element that will replace any text beginning with the defined `mentionTag`. 
    * `Options`: a | span

  * `mentionTag`: Define the tag that is required to activate the mention. Can be one or more characters.
    * Default: "@"

* **Custom Stylesheets & Automatic Stylesheet Insertion**

  * `initStyles`: Default: false - Whether or not to automatically insert the stylesheet into the HTML DOM.
    * Options true | false

  * `stylesheetUrl`: Default: "" - If `initStyles:true` then will insert this url (relative or absolute path) into the DOM to load custom stylesheets.
  * If left unset, defaults to the "main" branch CDN url.

* **Toolbar Options**

  * `toolbarType`: Default: "default" - Change the style of the toolbar. Inline toolbars are hidden by default and will display when the editor area is focused.
  
    * Options: default | inline

---

## ✅ Benefits

* Lightweight and dependency-free.
* Highly customizable.
* Extendable and framework-agnostic.
* Easy to integrate and use.

---

## 🔗 Resources

* **GitHub**: [yeole-rohan/ray-editor](https://github.com/yeole-rohan/ray-editor)
* **CDN**: [jsDelivr - rayeditor](https://www.jsdelivr.com/package/npm/rayeditor)

---
