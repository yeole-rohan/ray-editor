# @ray-editor/angular

Angular wrapper for [RayEditor](https://github.com/yeole-rohan/ray-editor) — lightweight, dependency-free WYSIWYG editor.

## Install

```bash
npm install ray-editor @ray-editor/angular
```

## Usage

### Standalone component (Angular 15+)

```typescript
import { Component } from '@angular/core';
import { RayEditorAngularComponent } from '@ray-editor/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RayEditorAngularComponent],
  template: `
    <ray-editor
      [(ngModel)]="content"
      [options]="editorOptions"
    ></ray-editor>
    <pre>{{ content }}</pre>
  `,
})
export class AppComponent {
  content = '<p>Hello world</p>';
  editorOptions = {
    theme: 'light' as const,
    wordCount: true,
    toolbar: [
      ['bold', 'italic', 'underline'],
      ['headings', 'blockquote'],
      ['link', 'imageUpload'],
    ],
  };
}
```

### Reactive Forms

```typescript
import { FormBuilder } from '@angular/forms';

@Component({
  template: `
    <form [formGroup]="form">
      <ray-editor formControlName="body" [options]="editorOptions"></ray-editor>
    </form>
  `,
})
export class FormComponent {
  form = this.fb.group({ body: [''] });
  constructor(private fb: FormBuilder) {}
}
```
