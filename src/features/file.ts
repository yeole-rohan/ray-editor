import type { FileUploadOptions } from '../types/options';
import { sanitizeUrl } from '../core/sanitize';

/**
 * File upload feature — inserts media previews or download links.
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
        const safeUrl = sanitizeUrl(data.url) || '#';
        const figure = this.buildFileFigure(file.name, file.type, safeUrl);
        this.replacePlaceholderWithFigure(placeholder, figure);
      })
      .catch(err => {
        console.error('File upload failed:', err);
        // textContent prevents XSS via crafted filenames
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

  private replacePlaceholderWithFigure(placeholder: HTMLElement, figure: HTMLElement): void {
    placeholder.replaceWith(figure);

    const spacer = document.createElement('p');
    spacer.innerHTML = '<br>';
    figure.after(spacer);

    const range = document.createRange();
    range.setStart(spacer, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  /**
   * Builds a <figure class="ray-file-figure"> for the given file.
   * Public so content.ts restoreFromHTML and tests can reuse it.
   *
   *  image/* → <img>
   *  video/* → <video controls>
   *  audio/* → <audio controls>
   *  other   → <a> download link with extension badge
   *
   * figcaption is always appended with the filename (editable in the editor).
   */
  buildFileFigure(name: string, mimeType: string, url: string): HTMLElement {
    const figure = document.createElement('figure');
    figure.className = 'ray-file-figure';
    figure.setAttribute('contenteditable', 'false');

    if (mimeType.startsWith('image/')) {
      figure.dataset.fileType = 'image';
      const img = document.createElement('img');
      img.src = url;
      img.alt = name;
      figure.appendChild(img);

    } else if (mimeType.startsWith('video/')) {
      figure.dataset.fileType = 'video';
      const video = document.createElement('video');
      video.controls = true;
      video.src = url;
      video.textContent = 'Your browser does not support video.';
      figure.appendChild(video);

    } else if (mimeType.startsWith('audio/')) {
      figure.dataset.fileType = 'audio';
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = url;
      audio.textContent = 'Your browser does not support audio.';
      figure.appendChild(audio);

    } else {
      figure.dataset.fileType = 'other';
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = name;
      link.className = 'ray-file-link';

      const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : 'file';
      const badge = document.createElement('span');
      badge.className = 'ray-file-ext';
      badge.textContent = ext;

      const nameSpan = document.createElement('span');
      nameSpan.textContent = name;

      link.appendChild(badge);
      link.appendChild(nameSpan);
      figure.appendChild(link);
    }

    const figcaption = document.createElement('figcaption');
    figcaption.textContent = name;
    figcaption.setAttribute('contenteditable', 'true');
    figure.appendChild(figcaption);

    return figure;
  }

  /**
   * Restores editor-only attributes on .ray-file-figure elements
   * after setContent() or paste. Called from ContentManager.applyStructure().
   */
  static restoreFromHTML(container: HTMLElement): void {
    container.querySelectorAll<HTMLElement>('.ray-file-figure').forEach(figure => {
      figure.setAttribute('contenteditable', 'false');
      const caption = figure.querySelector<HTMLElement>('figcaption');
      if (caption) caption.setAttribute('contenteditable', 'true');
    });
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
