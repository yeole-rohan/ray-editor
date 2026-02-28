# @ray-editor/svelte

Svelte wrapper for [RayEditor](https://github.com/yeole-rohan/ray-editor) — lightweight, dependency-free WYSIWYG editor.

## Install

```bash
npm install ray-editor @ray-editor/svelte
```

## Usage

```svelte
<script lang="ts">
  import RayEditor from '@ray-editor/svelte/src/RayEditor.svelte';
  import 'ray-editor/css';

  let content = '<p>Hello world</p>';
</script>

<RayEditor
  bind:value={content}
  options={{
    theme: 'light',
    wordCount: true,
    toolbar: [
      ['bold', 'italic', 'underline'],
      ['headings', 'blockquote'],
      ['link', 'imageUpload'],
    ],
  }}
/>

<pre>{content}</pre>
```
