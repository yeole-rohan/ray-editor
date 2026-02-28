import type { FileUploadOptions } from '../types/options';

/**
 * File upload feature.
 */
export class FileFeature {
  private editorArea: HTMLElement;
  private fileUploadUrl: string;
  private maxFileSize: number;

  constructor(editorArea: HTMLElement, opts: FileUploadOptions) {
    this.editorArea = editorArea;
    this.fileUploadUrl = opts.fileUploadUrl;
    this.maxFileSize = opts.fileMaxSize ?? 50 * 1024 * 1024; // 50MB default
  }

  triggerUpload(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.style.display = 'none';

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;

      if (file.type.startsWith('image/')) {
        this.showError('Use the image button for image uploads.');
        return;
      }
      if (file.size > this.maxFileSize) {
        this.showError(
          `File size must be under ${this.maxFileSize / (1024 * 1024)}MB.`
        );
        return;
      }
      this.handleUpload(file);
    });

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  private handleUpload(file: File): void {
    const formData = new FormData();
    formData.append('file', file);

    const placeholder = this.insertUploadPlaceholder(file.name);

    fetch(this.fileUploadUrl, { method: 'POST', body: formData })
      .then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!data.url) throw new Error('No file URL returned.');
        this.replacePlaceholderWithLink(placeholder, file.name, data.url);
      })
      .catch(err => {
        console.error('File upload failed:', err);
        // Use textContent so file.name is treated as plain text,
        // not parsed as HTML (avoids XSS via crafted filenames).
        placeholder.textContent = `❌ Failed to upload "${file.name}"`;
      });
  }

  private insertUploadPlaceholder(filename: string): HTMLElement {
    const placeholder = document.createElement('div');
    placeholder.className = 'upload-placeholder';
    placeholder.textContent = `Uploading ${filename}…`;
    placeholder.contentEditable = 'false';

    const spacer = document.createElement('p');
    spacer.innerHTML = '<br>';

    const range = window.getSelection()?.getRangeAt(0);
    const frag = document.createDocumentFragment();
    frag.appendChild(placeholder);
    frag.appendChild(spacer);

    if (range) {
      range.deleteContents();
      range.insertNode(frag);
    } else {
      this.editorArea.appendChild(frag);
    }

    return placeholder;
  }

  private replacePlaceholderWithLink(
    placeholder: HTMLElement,
    filename: string,
    url: string
  ): void {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = filename;
    link.textContent = `📄 ${filename}`;
    link.className = 'ray-link';

    placeholder.replaceWith(link);

    // Move cursor after link
    const spacer = document.createTextNode(' ');
    link.after(spacer);

    const range = document.createRange();
    range.setStartAfter(spacer);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  private showError(msg: string): void {
    const div = document.createElement('div');
    div.className = 'ray-editor-error-toast';
    div.textContent = msg;
    Object.assign(div.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#dc2626',
      color: 'white',
      padding: '10px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      zIndex: '99999',
    });
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 4000);
  }
}
