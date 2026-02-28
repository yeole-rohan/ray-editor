# @ray-editor/vue

Vue 3 wrapper for [RayEditor](https://github.com/yeole-rohan/ray-editor) — lightweight, dependency-free WYSIWYG editor.

## Install

```bash
npm install ray-editor @ray-editor/vue
```

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { RayEditorVue } from '@ray-editor/vue';
import 'ray-editor/css';

const content = ref('<p>Hello world</p>');
</script>

<template>
  <RayEditorVue
    v-model="content"
    :options="{
      theme: 'light',
      wordCount: true,
      toolbar: [
        ['bold', 'italic', 'underline'],
        ['headings', 'blockquote'],
        ['link', 'imageUpload'],
      ],
    }"
  />
  <pre>{{ content }}</pre>
</template>
```

## Accessing the Editor Instance

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { RayEditorVue } from '@ray-editor/vue';

const editorRef = ref();

function getContent() {
  console.log(editorRef.value?.getContent());
}
</script>

<template>
  <RayEditorVue ref="editorRef" />
  <button @click="getContent">Get Content</button>
</template>
```
