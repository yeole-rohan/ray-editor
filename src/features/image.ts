import type { ImageUploadOptions } from '../types/options';
import { sanitizeUrl } from '../core/sanitize';

/**
 * Image upload, resize handle, and edit modal.
 */
export class ImageFeature {
  private editorArea: HTMLElement;
  private imageUploadUrl: string;
  private maxImageSize: number;

  constructor(editorArea: HTMLElement, opts: ImageUploadOptions) {
    this.editorArea = editorArea;
    this.imageUploadUrl = opts.imageUploadUrl;
    this.maxImageSize = opts.imageMaxSize ?? 20 * 1024 * 1024; // 20MB default
  }

  triggerUpload(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    input.addEventListener('change', () => {
      const image = input.files?.[0];
      if (!image) return;

      if (!image.type.startsWith('image/')) {
        this.showError('Only image files are allowed.');
        return;
      }
      if (image.size > this.maxImageSize) {
        this.showError(
          `Image size must be under ${this.maxImageSize / (1024 * 1024)}MB.`
        );
        return;
      }
      this.handleUpload(image);
    });

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  private handleUpload(image: File): void {
    const formData = new FormData();
    formData.append('file', image);

    const placeholder = this.insertUploadPlaceholder(image.name);

    fetch(this.imageUploadUrl, { method: 'POST', body: formData })
      .then(res => {
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!data.url) throw new Error('No URL returned from server.');
        this.replacePlaceholderWithImage(placeholder, data.url, image.name);
      })
      .catch(err => {
        console.error('Image upload failed:', err);
        this.showUploadError(placeholder, image.name);
      });
  }

  private insertUploadPlaceholder(filename: string): HTMLElement {
    const range = window.getSelection()?.getRangeAt(0);

    const placeholder = document.createElement('div');
    placeholder.className = 'upload-placeholder';
    placeholder.textContent = `Uploading ${filename}…`;
    placeholder.contentEditable = 'false';

    const spacer = document.createElement('p');
    spacer.innerHTML = '<br>';

    const frag = document.createDocumentFragment();
    frag.appendChild(placeholder);
    frag.appendChild(spacer);

    if (range) {
      range.deleteContents();
      range.insertNode(frag);
    } else {
      this.editorArea.appendChild(frag);
    }

    const newRange = document.createRange();
    newRange.setStart(spacer, 0);
    newRange.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(newRange);

    return placeholder;
  }

  private replacePlaceholderWithImage(
    placeholder: HTMLElement,
    imageUrl: string,
    imageName: string
  ): void {
    const img = new Image();
    // Validate the server-returned URL before assigning to img.src.
    img.src = sanitizeUrl(imageUrl) || '';
    img.alt = imageName;
    img.title = imageName;

    img.onload = () => {
      const { wrapper } = this.makeImageResizable(img);
      const spacer = document.createElement('p');
      spacer.innerHTML = '<br>';

      const frag = document.createDocumentFragment();
      frag.appendChild(wrapper);
      frag.appendChild(spacer);

      placeholder.replaceWith(frag);

      const newRange = document.createRange();
      newRange.setStart(spacer, 0);
      newRange.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(newRange);
    };
  }

  private showUploadError(placeholder: HTMLElement, imageName: string): void {
    // Use textContent so imageName is treated as plain text,
    // not parsed as HTML (avoids XSS via crafted filenames).
    placeholder.textContent = `❌ Failed to upload "${imageName}"`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    Object.assign(removeBtn.style, {
      marginLeft: '10px',
      background: 'transparent',
      border: 'none',
      color: '#d00',
      cursor: 'pointer',
    });
    removeBtn.onclick = () => placeholder.remove();
    placeholder.appendChild(removeBtn);
  }

  makeImageResizable(img: HTMLImageElement): { wrapper: HTMLElement } {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.maxWidth = '100%';
    wrapper.contentEditable = 'false';

    Object.assign(img.style, {
      maxWidth: '100%',
      display: 'block',
      cursor: 'pointer',
      borderRadius: '4px',
      transition: 'box-shadow 0.2s ease',
    });

    wrapper.appendChild(img);

    // Resize handle
    const handle = document.createElement('div');
    Object.assign(handle.style, {
      position: 'absolute',
      width: '12px',
      height: '12px',
      right: '0',
      bottom: '0',
      cursor: 'se-resize',
      background: 'hsl(220, 100%, 60%)',
      border: '1px solid white',
      borderRadius: '2px',
      opacity: '0',
      transition: 'opacity 0.2s ease',
    });
    wrapper.appendChild(handle);

    // Remove button
    const closeBtn = document.createElement('div');
    closeBtn.innerHTML = '×';
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '0',
      right: '0',
      width: '24px',
      height: '24px',
      fontSize: '18px',
      background: 'rgba(0,0,0,0.7)',
      color: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer',
      borderRadius: '0 0 0 6px',
      opacity: '0',
      transition: 'opacity 0.2s ease',
    });
    closeBtn.title = 'Remove Image';
    closeBtn.addEventListener('click', e => {
      e.stopPropagation();
      wrapper.remove();
    });
    wrapper.appendChild(closeBtn);

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.textContent = '✎ Edit';
    Object.assign(editBtn.style, {
      position: 'absolute',
      bottom: '0',
      left: '0',
      background: 'rgba(255,255,255,0.9)',
      fontSize: '12px',
      padding: '2px 6px',
      borderRadius: '4px 4px 0 0',
      border: '1px solid #aaa',
      cursor: 'pointer',
      opacity: '0',
      transition: 'opacity 0.2s ease',
    });
    editBtn.addEventListener('click', e => {
      e.stopPropagation();
      this.openImageEditor(img, wrapper);
    });
    wrapper.appendChild(editBtn);

    // BUG FIX #3: resize mousedown listener is correctly placed OUTSIDE editBtn click handler
    let startX: number, startY: number, startWidth: number, startHeight: number;
    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      startWidth = img.offsetWidth;
      startHeight = img.offsetHeight;

      const onMouseMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const ratio = startHeight / startWidth;
        const newWidth = Math.max(50, startWidth + dx);
        img.style.width = `${newWidth}px`;
        img.style.height = `${newWidth * ratio}px`;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Hover show/hide controls
    wrapper.addEventListener('mouseenter', () => {
      handle.style.opacity = '1';
      closeBtn.style.opacity = '1';
      editBtn.style.opacity = '1';
    });
    wrapper.addEventListener('mouseleave', () => {
      handle.style.opacity = '0';
      closeBtn.style.opacity = '0';
      editBtn.style.opacity = '0';
    });

    return { wrapper };
  }

  private openImageEditor(originalImg: HTMLImageElement, _wrapper: HTMLElement): void {
    const editorModal = document.createElement('div');
    editorModal.className = 'ray-img-editor-modal';
    Object.assign(editorModal.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'white',
      padding: '1.5em',
      boxShadow: '0 0 20px rgba(0,0,0,0.3)',
      zIndex: '9999',
      maxWidth: '90vw',
      maxHeight: '90vh',
      overflow: 'auto',
      borderRadius: '8px',
    });

    const altVal = this.escapeHtml(originalImg.alt || '');
    const titleVal = this.escapeHtml(originalImg.title || '');

    editorModal.innerHTML = `
      <h3 style="margin:0 0 12px;">Edit Image</h3>
      <canvas id="ray-crop-canvas" style="max-width:100%;border:1px dashed #ccc;margin-bottom:12px;display:block;"></canvas>
      <label style="display:block;margin-bottom:6px;">Alt text<br><input type="text" id="ray-alt-input" value="${altVal}" style="width:100%;padding:6px;box-sizing:border-box;border:1px solid #ccc;border-radius:4px;" /></label>
      <label style="display:block;margin-bottom:12px;">Title<br><input type="text" id="ray-title-input" value="${titleVal}" style="width:100%;padding:6px;box-sizing:border-box;border:1px solid #ccc;border-radius:4px;" /></label>
      <div style="display:flex;gap:8px;">
        <button id="ray-img-save" style="padding:8px 16px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;">✅ Save</button>
        <button id="ray-img-cancel" style="padding:8px 16px;background:#eee;border:none;border-radius:4px;cursor:pointer;">Cancel</button>
      </div>
    `;

    document.body.appendChild(editorModal);

    const canvas = editorModal.querySelector<HTMLCanvasElement>('#ray-crop-canvas')!;
    const ctx = canvas.getContext('2d')!;
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.src = originalImg.src;
    tempImg.onload = () => {
      canvas.width = tempImg.width;
      canvas.height = tempImg.height;
      ctx.drawImage(tempImg, 0, 0);
    };

    editorModal.querySelector('#ray-img-cancel')!.addEventListener('click', () => {
      editorModal.remove();
    });

    editorModal.querySelector('#ray-img-save')!.addEventListener('click', () => {
      const alt = (editorModal.querySelector<HTMLInputElement>('#ray-alt-input')!).value;
      const title = (editorModal.querySelector<HTMLInputElement>('#ray-title-input')!).value;
      originalImg.alt = alt;
      originalImg.title = title;
      editorModal.remove();
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
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    });
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 4000);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
