# @ray-editor/react

React wrapper for [RayEditor](https://github.com/yeole-rohan/ray-editor) — lightweight, dependency-free WYSIWYG editor.

## Install

```bash
npm install ray-editor @ray-editor/react
```

## Usage

```tsx
import { RayEditorComponent } from '@ray-editor/react';
import 'ray-editor/css';

function App() {
  const [html, setHtml] = React.useState('');

  return (
    <RayEditorComponent
      value={html}
      onChange={setHtml}
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
  );
}
```

## Accessing the Editor Instance

```tsx
import { useRef } from 'react';
import { RayEditorComponent, RayEditorRef } from '@ray-editor/react';

function App() {
  const editorRef = useRef<RayEditorRef>(null);

  const handleGetContent = () => {
    const html = editorRef.current?.getContent();
    console.log(html);
  };

  return (
    <>
      <RayEditorComponent ref={editorRef} />
      <button onClick={handleGetContent}>Get Content</button>
    </>
  );
}
```
