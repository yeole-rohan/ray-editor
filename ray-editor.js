class RayEditor {
   constructor(containerId, options = {}) {
      this.container = document.getElementById(containerId);
      this.options = options;
      this.toolbar = null;
      this.editorArea = null;
      this.imageUploadUrl = null
      this.maxImageSize = null
      this.init();
   }
   init() {
      this.#createToolbar();
      this.#createEditorArea();
      this.#bindEvents();
      this.#addWatermark()
      // Force new lines to be <p>
      document.execCommand('defaultParagraphSeparator', false, 'p');
   }
   #createToolbar() {
      this.toolbar = document.createElement('div');
      this.toolbar.className = 'ray-editor-toolbar';
      this.container.appendChild(this.toolbar);
      this.#generateToolbarButtons(buttonConfigs);
   }
   // Method to get the content from the editor
   getRayEditorContent() {
      if (!this.editorArea) {
         console.error('Editor element not found');
         return null;
      }

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.editorArea.innerHTML;

      const tagsToClean = ['p', 'a', 'span', 'b', 'i', 'u', 'strong', 'em'];
      // Helper to check if an element is inside a code block
      const isInsideCodeBlock = el => {
         return el.closest('pre, code, .ray-code-block') !== null;
      };
      // Helper function to remove <p> inside <ul>, <ol>, or <li> and keep the text content
      const removePInsideList = () => {
         const listItems = tempDiv.querySelectorAll('ul li, ol li');
         listItems.forEach(li => {
            if (isInsideCodeBlock(li)) return;
            const p = li.querySelector('p');
            if (p) {
               // Move text content of <p> to the <li> and remove the <p>
               li.innerHTML = li.innerHTML.replace(p.outerHTML, p.textContent);
            }
         });
      };

      // Call the function to handle <p> inside <ul>, <ol>, <li>
      removePInsideList();

      // Recursive cleaner: removes <br> and empty inline children, then checks text
      const isEffectivelyEmpty = el => {
         if (isInsideCodeBlock(el)) return;

         // Remove empty inline children
         tagsToClean.forEach(tag => {
            el.querySelectorAll(tag).forEach(child => {
               if (isInsideCodeBlock(child)) return;
               if (!child.textContent.trim() && child.children.length === 0) {
                  child.remove();
               }
            });
         });

         // Finally, check if this element is still empty
         return !el.textContent.trim() && el.children.length === 0;
      };

      // Walk backwards so we can safely remove elements without disrupting traversal
      const allTargets = Array.from(tempDiv.querySelectorAll(tagsToClean.join(','))).reverse();
      allTargets.forEach(el => {
         if (isInsideCodeBlock(el)) return;
         if (isEffectivelyEmpty(el)) {
            el.remove();
         }
      });
      // Select all div elements without a class and replace them with <p> tags
      const divsWithoutClass = tempDiv.querySelectorAll('div:not([class])');

      divsWithoutClass.forEach(div => {
         if (isInsideCodeBlock(div)) return;
         const p = document.createElement('p');
         p.innerHTML = div.innerHTML;  // Copy content to <p>
         div.parentNode.replaceChild(p, div);  // Replace <div> with <p>
      });
      tempDiv.querySelectorAll('.ray-code-content').forEach(pre => {
         pre.setAttribute('contenteditable', 'false');
      });

      return tempDiv.innerHTML;
   }

   setRayEditorContent(html) {
      if (!this.editorArea) {
         console.error('Editor element not found');
         return null;
      }

      // Parse string HTML into a temporary DOM
      const temp = document.createElement('div');
      temp.innerHTML = html;

      // Modify code blocks
      temp.querySelectorAll('.ray-code-content').forEach(pre => {
         pre.setAttribute('contenteditable', 'true');
         pre.setAttribute('spellcheck', 'false');
      });

      // Set the updated HTML content into the editor
      this.editorArea.innerHTML = temp.innerHTML;
      temp.remove()
   }

   #createEditorArea() {
      this.editorArea = document.createElement('div');
      this.editorArea.className = 'ray-editor-content';
      this.editorArea.contentEditable = true;
      this.editorArea.spellcheck = true;
      this.editorArea.innerHTML = '<p><br></p>';
      this.container.appendChild(this.editorArea);
   }
   #addWatermark() {

      if (!this.editorArea) return;
      const watermark = document.createElement('div');
      watermark.id = 'ray-editor-watermark';
      watermark.innerHTML = `Made with ❤️ by <a href="https://rohanyeole.com" target="_blank" rel="noopener">Rohan Yeole</a>`;
      // Insert after the editor
      this.editorArea.parentNode.insertBefore(watermark, this.editorArea.nextLastSibling);

   }
   #generateToolbarButtons(buttonConfigs) {
      // for (const key in this.options) {
      Object.keys(buttonConfigs).forEach((key) => {
         // Check if this key is enabled in userOptions
         if (!this.options[key]) return;

         if (this.options[key].imageUploadUrl && this.options[key].imageMaxSize) {
            this.imageUploadUrl = this.options[key].imageUploadUrl
            this.maxImageSize = this.options[key].imageMaxSize
         }
         if (this.options[key].fileUploadUrl && this.options[key].fileMaxSize) {
            this.fileUploadUrl = this.options[key].fileUploadUrl
            this.fileMaxSize = this.options[key].fileMaxSize
         }
         const config = buttonConfigs[key];
         if (config.dropdown && config.options) {
            this.#createDropdown(config);
         } else {
            this.#createButton(config);
         }
      });
   }
   #createDropdown(config) {
      const select = document.createElement('select');
      select.className = `ray-dropdown ray-dropdown-${config.keyname}`;
      select.title = config.keyname.charAt(0).toUpperCase() + config.keyname.slice(1);

      Object.entries(config.options).forEach(([key, opt]) => {
         const option = document.createElement('option');
         option.value = opt.value;
         option.textContent = opt.label;
         select.appendChild(option);
      });

      select.addEventListener('change', () => {
         const selected = config.options[select.selectedOptions[0].textContent.toLowerCase().replace(/\s/g, '')];

         if (selected?.cmd) {
            this.#execCommand(selected.cmd, selected.value);
         }
      });

      this.toolbar.appendChild(select);
   }
   #createButton(config) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = `ray-btn-${config.keyname}`;
      const formattedTitle = config.keyname.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      btn.title = formattedTitle;
      btn.setAttribute('data-tooltip', formattedTitle);
      btn.innerHTML = config.label;
      btn.className = `ray-btn ray-btn-${config.keyname}`;

      btn.addEventListener('click', () => {
         if (config.cmd) {
            this.#execCommand(config.cmd, config.value || null);
         } else if (config.keyname === 'uppercase') {
            this.#transformSelectedText('upper');
         } else if (config.keyname === 'lowercase') {
            this.#transformSelectedText('lower');
         } else if (config.keyname === 'toggleCase') {
            this.#toggleTextCase();
         } else if (config.keyname === 'codeBlock') {
            this.#insertCodeBlock()
         } else if (config.keyname === 'codeInline') {
            this.#insertInlineCode()
         } else if (config.keyname === 'backgroundColor') {
            this.#applyBackgroundColor()
         } else if (config.keyname === 'textColor') {
            this.#applyTextColor()
         } else if (config.keyname === 'imageUpload') {
            this.#triggerImageUpload()
         } else if (config.keyname === 'fileUpload') {
            this.#triggerFileUpload()
         } else if (config.keyname === 'link') {
            this.#openLinkModal()
         } else if (config.keyname === 'removeFormat') {
            this.#execCommand('removeFormat')
         } else if (config.keyname === 'table') {
            this.#openTableModal();
         } else if (config.keyname === 'hr') {
            this.#insertHr();
         } else if (config.keyname === 'insertDateTime') {

            const blockInsert = confirm("Insert date/time on a new line?");
            this.#insertDateTime({ block: blockInsert });
         }

      });

      this.toolbar.appendChild(btn);
   }
   #execCommand(command, value = null) {
      document.execCommand(command, false, value);
      this.editorArea.focus();
   }
   #bindEvents() {
      const events = ['keyup', 'mouseup', 'keydown', 'paste', 'click'];
      events.forEach(evt => {
         this.editorArea.addEventListener(evt, (e) => {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;

            const node = sel.anchorNode;
            const elementNode = node.nodeType === 3 ? node.parentElement : node;
            this.#updateToolbar()
            if (evt === 'keydown') {
               this.#handleCodeBlockExit(e, elementNode);
               this.#handleInlineCodeExit(e, sel, elementNode);
            }

            if (evt === 'paste') {
               this.#handleYoutubeEmbed(e);
            }
            if (evt === 'click') {
               const anchor = e.target.closest('a');
               if (anchor && this.editorArea.contains(anchor)) {
                  e.preventDefault();
                  this.#showLinkPopup(anchor);
               }
            }
            // Check if the clicked element is not a table or not inside a table
            const table = e.target.closest('table');

            // If the click is outside any table, remove highlight from all tables
            if (!table) {
               // Remove highlight from all tables
               document.querySelectorAll('table').forEach(t => {
                  t.classList.remove('ray-editor-table-highlighted');
               });
            }
         });
      });
   }
   #showLinkPopup(anchor) {
      // Remove existing popup if any
      const existingPopup = document.querySelector('.ray-editor-link-edit-remove');
      if (existingPopup) existingPopup.remove();

      // Create popup element
      const popup = document.createElement('div');
      popup.className = 'ray-editor-link-edit-remove';
      popup.innerHTML = `
        <button class="edit-link">Edit</button>
        <button class="remove-link">Remove</button>
      `;
      document.body.appendChild(popup);

      // Position the popup near the anchor
      const rect = anchor.getBoundingClientRect();
      popup.style.top = `${rect.bottom + window.scrollY}px`;
      popup.style.left = `${rect.left + window.scrollX}px`;

      // Handle edit and remove actions
      popup.querySelector('.edit-link').addEventListener('click', () => {
         this.#openLinkModal(anchor);
         popup.remove();
      });

      popup.querySelector('.remove-link').addEventListener('click', () => {
         this.#removeLink(anchor);
         popup.remove();
      });

      // Remove popup when clicking outside
      document.addEventListener('click', function onDocClick(e) {
         if (!popup.contains(e.target) && e.target !== anchor) {
            popup.remove();
            document.removeEventListener('click', onDocClick);
         }
      });
   }

   #handleCodeBlockExit(e, elementNode) {
      if (e.key !== 'Enter' || e.shiftKey) return;

      const codeContent = elementNode.closest('.ray-code-content');
      if (!codeContent) return;

      const text = codeContent.innerText.trim();

      if (text === '') {
         e.preventDefault();

         codeContent.innerHTML = '';

         const newPara = document.createElement('p');
         newPara.innerHTML = '<br>';

         const codeBlock = codeContent.closest('.ray-code-block');
         if (codeBlock) {
            codeBlock.parentNode.insertBefore(newPara, codeBlock.nextSibling);

            const range = document.createRange();
            range.selectNodeContents(newPara);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
         }
      } else {
         codeContent.dataset.lastEmptyEnter = 'true';
         setTimeout(() => delete codeContent.dataset.lastEmptyEnter, 500);
      }
   }
   #handleInlineCodeExit(e, sel, elementNode) {
      if (e.key !== 'ArrowRight') return;

      const inlineCode = elementNode.closest('code');
      if (!inlineCode || !sel.isCollapsed) return;

      const range = sel.getRangeAt(0);
      const atEnd = range.endOffset === inlineCode.textContent.length;

      if (atEnd) {
         e.preventDefault();

         const spacer = document.createTextNode('\u00A0');
         inlineCode.parentNode.insertBefore(spacer, inlineCode.nextSibling);

         const newRange = document.createRange();
         newRange.setStartAfter(spacer);
         newRange.collapse(true);

         sel.removeAllRanges();
         sel.addRange(newRange);
      }
   }
   #handleYoutubeEmbed(e) {
      const clipboard = e.clipboardData || window.clipboardData;
      const pastedText = clipboard.getData('text');

      const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
      const match = pastedText.match(ytRegex);

      if (!match) return;

      e.preventDefault();

      const videoId = match[1];
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}`;
      iframe.width = '560';
      iframe.height = '315';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.className = 'ray-youtube-embed';
      iframe.style.display = 'block';
      iframe.style.margin = '1em 0';

      // Create an editable paragraph after the iframe
      const afterPara = document.createElement('p');
      afterPara.innerHTML = '<br>';

      const frag = document.createDocumentFragment();
      frag.appendChild(iframe);
      frag.appendChild(afterPara);

      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(frag);

      // Move caret into the new paragraph
      const newRange = document.createRange();
      newRange.setStart(afterPara, 0);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
   }

   #applyTextTransformation(transformFn) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const selectedText = range.toString();

      if (!selectedText.trim()) return;

      const transformed = transformFn(selectedText);

      range.deleteContents();
      range.insertNode(document.createTextNode(transformed));

      // Reset selection to after inserted text
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
   }
   #transformSelectedText(mode) {
      this.#applyTextTransformation((text) =>
         mode === 'upper' ? text.toUpperCase() : text.toLowerCase()
      );
   }
   #toggleTextCase() {
      this.#applyTextTransformation((text) =>
         [...text].map(char =>
            char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase()
         ).join('')
      );
   }
   #insertCodeBlock() {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);

      // Create wrapper div
      const wrapper = document.createElement('div');
      wrapper.className = 'ray-code-block';

      // Create <pre><code> structure
      const pre = document.createElement('pre');
      pre.className = 'ray-code-content';
      pre.setAttribute('contenteditable', 'true');
      pre.setAttribute('spellcheck', 'false')

      const code = document.createElement('code');
      code.innerHTML = '<br>';

      // Assemble
      pre.appendChild(code);
      wrapper.appendChild(pre);

      // Insert into DOM
      range.deleteContents();
      range.insertNode(wrapper);

      // Place cursor inside <code>
      setTimeout(() => {
         const newRange = document.createRange();
         newRange.selectNodeContents(code);
         newRange.collapse(true);

         const sel = window.getSelection();
         sel.removeAllRanges();
         sel.addRange(newRange);
      }, 0);
   }

   #insertInlineCode() {
      const selection = window.getSelection();
      if (!selection.rangeCount || selection.isCollapsed) return;

      const range = selection.getRangeAt(0);
      const selectedText = range.toString();

      const parentCode = this.#getSelectedElementInTag('code');

      if (parentCode) {
         // Already in code → unwrap it
         const parent = parentCode.parentNode;
         while (parentCode.firstChild) {
            parent.insertBefore(parentCode.firstChild, parentCode);
         }
         parent.removeChild(parentCode);
      } else {
         // Wrap selection in <code>
         const code = document.createElement('code');
         code.textContent = selectedText;

         range.deleteContents();
         range.insertNode(code);

         // Reselect inserted content
         const newRange = document.createRange();
         newRange.selectNodeContents(code);
         selection.removeAllRanges();
         selection.addRange(newRange);
      }
   }
   #getSelectedElementInTag(tagName) {
      const sel = window.getSelection();
      if (!sel.rangeCount) return null;
      let node = sel.anchorNode;
      while (node && node !== document) {
         if (node.nodeType === 1 && node.tagName.toLowerCase() === tagName.toLowerCase()) {
            return node;
         }
         node = node.parentNode;
      }
      return null;
   }
   #applyTextColor() {
      const input = document.createElement("input");
      input.type = "color";
      input.value = "#000000";
      input.style.position = "absolute";
      input.style.left = "-9999px"; // keep it hidden from view
      document.body.appendChild(input);

      input.oninput = () => {
         const color = input.value;
         this.#execCommand("foreColor", color)
         input.remove(); // Clean up
      };

      input.click();
   }
   #applyBackgroundColor() {
      const input = document.createElement("input");
      input.type = "color";
      input.value = "#ffffff";
      input.style.position = "absolute";
      input.style.left = "-9999px";
      document.body.appendChild(input);

      input.oninput = () => {
         const color = input.value;
         this.#execCommand("backColor", color)
         input.remove();
      };

      input.click();
   }
   #triggerImageUpload() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.addEventListener('change', () => {
         const image = input.files[0];
         if (!image) return;

         if (!image.type.startsWith('image/')) {
            alert('Only images are allowed.');
            return;
         }
         if (!this.maxImageSize || typeof this.maxImageSize !== 'number') {
            alert('❌ Configuration error: maxImageSize must be provided in bytes as a number.');
            return;
         }
         if (image.size > this.maxImageSize) {
            alert(`Image size must be under ${this.maxImageSize / (1024 * 1024)}MB.`);
            return;
         }
         this.#handleImageUpload(image);
      });

      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
   }
   #handleImageUpload(image) {

      if (!this.imageUploadUrl) {
         console.error('Upload URL is not configured.');
         return;
      }

      const formData = new FormData();
      formData.append('file', image);

      const placeholder = this.#insertUploadPlaceholder(image.name);

      fetch(this.imageUploadUrl, {
         method: 'POST',
         body: formData
      })
         .then(res => {
            if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);
            return res.json();
         })
         .then(data => {
            const imageUrl = data.url;
            if (!imageUrl) throw new Error('No image URL returned from server.');
            this.#replacePlaceholderWithImage(placeholder, imageUrl, image.name);
         })
         .catch(err => {
            console.error('Image upload failed:', err);
            this.#showUploadErrorWithRemove(placeholder, image.name);
         });
   }
   #insertUploadPlaceholder(filename) {
      const range = window.getSelection()?.getRangeAt(0);
      if (!range) return null;

      const placeholder = document.createElement('div');
      placeholder.className = 'upload-placeholder';
      placeholder.textContent = `Uploading ${filename}...`;
      placeholder.style.margin = '1em 0';
      placeholder.style.color = '#888';
      placeholder.contentEditable = 'false';

      // New paragraph after placeholder
      const spacer = document.createElement('p');
      spacer.innerHTML = '<br>';

      const frag = document.createDocumentFragment();
      frag.appendChild(placeholder);
      frag.appendChild(spacer);

      range.deleteContents();
      range.insertNode(frag);

      // Move caret into spacer
      const newRange = document.createRange();
      newRange.setStart(spacer, 0);
      newRange.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(newRange);

      return placeholder;
   }

   #replacePlaceholderWithImage(placeholder, imageUrl, imageName) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = imageName;
      img.title = imageName;

      img.onload = () => {
         const { wrapper } = this.#makeImageResizable(img);
         wrapper.style.margin = '1em 0';

         const spacer = document.createElement('p');
         spacer.innerHTML = '<br>';

         const frag = document.createDocumentFragment();
         frag.appendChild(wrapper);
         frag.appendChild(spacer);

         // Replace placeholder with image + spacer
         placeholder.replaceWith(frag);

         // Move caret after image
         const newRange = document.createRange();
         newRange.setStart(spacer, 0);
         newRange.collapse(true);
         const sel = window.getSelection();
         sel.removeAllRanges();
         sel.addRange(newRange);
      }
   }

   #showUploadErrorWithRemove(placeholder, imageName) {
      placeholder.innerHTML = `❌ Failed to upload "${imageName}"`;

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.style.marginLeft = '10px';
      removeBtn.style.background = 'transparent';
      removeBtn.style.border = 'none';
      removeBtn.style.color = '#d00';
      removeBtn.style.cursor = 'pointer';

      removeBtn.onclick = () => placeholder.remove();
      placeholder.appendChild(removeBtn);

      const spacer = document.createElement('p');
      spacer.innerHTML = '<br>';
      placeholder.after(spacer);

      // Move caret to spacer
      const range = document.createRange();
      range.setStart(spacer, 0);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
   }

   #makeImageResizable(img) {
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';
      wrapper.style.maxWidth = '100%';
      wrapper.contentEditable = false;

      img.style.maxWidth = '100%';
      img.style.display = 'block';
      img.style.cursor = 'pointer';
      img.style.borderRadius = '4px';
      img.style.transition = 'box-shadow 0.2s ease';

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

      // Remove icon (larger)
      const closeBtn = document.createElement('div');
      closeBtn.innerHTML = '×';
      Object.assign(closeBtn.style, {
         position: 'absolute',
         top: '0',
         right: '0',
         width: '24px',
         height: '24px',
         fontSize: '18px',
         background: 'rgba(0, 0, 0, 0.7)',
         color: 'white',
         display: 'flex',
         justifyContent: 'center',
         alignItems: 'center',
         cursor: 'pointer',
         borderRadius: '0 0 0 6px',
         opacity: '0',
         transition: 'opacity 0.2s ease'
      });
      closeBtn.title = 'Remove Image';
      closeBtn.addEventListener('click', (e) => {
         e.stopPropagation();
         wrapper.remove();
      });
      wrapper.appendChild(closeBtn);

      // Edit button overlay
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
         transition: 'opacity 0.2s ease'
      });
      wrapper.appendChild(editBtn);

      editBtn.addEventListener('click', (e) => {
         e.stopPropagation();
         this.#openImageEditor(img, wrapper);
      });

      // Hover behavior
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

      // Resize logic...
      // (same as before — skipping here for brevity)

      return { wrapper };
   }

#openImageEditor(originalImg, wrapper) {
   const editor = document.createElement('div');
   editor.className = 'ray-img-editor-modal';
   editor.style.position = 'fixed';
   editor.style.top = '50%';
   editor.style.left = '50%';
   editor.style.transform = 'translate(-50%, -50%)';
   editor.style.background = 'white';
   editor.style.padding = '1em';
   editor.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
   editor.style.zIndex = '9999';
   editor.style.maxWidth = '90vw';
   editor.style.maxHeight = '90vh';
   editor.style.overflow = 'auto';

   editor.innerHTML = `
      <h3>Edit Image</h3>
      <canvas id="cropCanvas" style="max-width:100%; border:1px dashed #ccc; margin-bottom: 10px;"></canvas><br/>
      <label>Alt: <input type="text" id="altInput" value="${originalImg.alt || ''}" /></label><br/>
      <label>Title: <input type="text" id="titleInput" value="${originalImg.title || ''}" /></label><br/>
      <button id="saveBtn">✅ Save</button>
      <button id="cancelBtn">❌ Cancel</button>
   `;

   document.body.appendChild(editor);

   const canvas = editor.querySelector('#cropCanvas');
   const ctx = canvas.getContext('2d');
   const img = new Image();
   img.crossOrigin = 'anonymous'; // Required for canvas use in some cases
   img.src = originalImg.src;

   img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
   };

   editor.querySelector('#cancelBtn').onclick = () => editor.remove();

   editor.querySelector('#saveBtn').onclick = () => {
      const alt = editor.querySelector('#altInput').value;
      const title = editor.querySelector('#titleInput').value;

      // Crop image from canvas
      const newDataUrl = canvas.toDataURL('image/png');

      originalImg.src = newDataUrl;
      originalImg.alt = alt;
      originalImg.title = title;

      editor.remove();
   };

   // (Optional: Add draggable crop rectangle and ratio enforcement logic)
}

   #triggerFileUpload() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      input.style.display = 'none';

      input.addEventListener('change', () => {
         const file = input.files[0];
         if (!file) return;

         // Reject images here — we already handle those elsewhere
         if (file.type.startsWith('image/')) {
            alert('Use the image button for image uploads.');
            return;
         }

         if (!this.fileMaxSize || typeof this.fileMaxSize !== 'number') {
            alert('❌ Configuration error: fileMaxSize must be provided in bytes as a number.');
            return;
         }
         if (file.size > this.fileMaxSize) {
            alert(`File size must be under ${this.fileMaxSize / (1024 * 1024)}MB.`);
            return;
         }

         this.#handleFileUpload(file);
      });

      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
   }

   #handleFileUpload(file) {

      if (!this.fileUploadUrl) {
         console.error('No file upload URL configured.');
         return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const placeholder = this.#insertUploadPlaceholder(file.name);

      fetch(this.fileUploadUrl, {
         method: 'POST',
         body: formData
      })
         .then(res => {
            if (!res.ok) throw new Error(`Status ${res.status}`);
            return res.json();
         })
         .then(data => {
            const fileUrl = data.url;
            if (!fileUrl) throw new Error('No file URL returned.');
            this.#replacePlaceholderWithFileLink(placeholder, file.name, fileUrl);
         })
         .catch(err => {
            console.error('File upload failed:', err);
            this.#showUploadErrorWithRemove(placeholder, file.name);
         });
   }

   #replacePlaceholderWithFileLink(placeholder, filename, url) {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = filename;
      link.textContent = `📄 ${filename}`;
      link.style.textDecoration = 'underline';
      link.style.color = '#0366d6';

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      range.deleteContents(); // Optional: clear selected content

      // Insert the link
      range.insertNode(link);

      // Move the cursor after the inserted link
      range.setStartAfter(link);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);

      // insert a space or newline after the link
      const spacer = document.createTextNode(' ');
      link.after(spacer);

      placeholder.remove()
   }
   // save the current selection
   #saveSelection() {
      if (window.getSelection) {
         const sel = window.getSelection();
         if (sel.rangeCount > 0) {
            return sel.getRangeAt(0);
         }
      }
      return null;
   }

   // to restore a saved selection
   #restoreSelection(range) {
      if (range && window.getSelection) {
         const sel = window.getSelection();
         sel.removeAllRanges();
         sel.addRange(range);
      }
   }

   // to open the link insertion modal
   #openLinkModal(anchor = null) {
      const savedRange = this.#saveSelection();

      // Create modal elements
      const modal = document.createElement('div');
      modal.className = 'ray-editor-link-modal';
      modal.innerHTML = `
        <div class="modal-content">
          <label>URL: <input type="text" id="link-url" /></label>
          <label>Target:
            <select id="link-target">
              <option value="_self">Same Tab</option>
              <option value="_blank">New Tab</option>
            </select>
          </label>
          <label>Rel:
            <select id="link-rel">
              <option value="">Follow</option>
              <option value="nofollow">No Follow</option>
            </select>
          </label>
          <div class="modal-actions">
            <button id="insert-link">Insert Link</button>
            <button id="cancel-link">Cancel</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Pre-fill fields if editing existing link
      if (anchor) {
         document.getElementById('link-url').value = anchor.getAttribute('href') || '';
         document.getElementById('link-target').value = anchor.getAttribute('target') || '_self';
         document.getElementById('link-rel').value = anchor.getAttribute('rel') || '';
      }

      // Handle insert link
      document.getElementById('insert-link').addEventListener('click', () => {
         const url = document.getElementById('link-url').value.trim();
         const target = document.getElementById('link-target').value;
         const rel = document.getElementById('link-rel').value;

         this.#restoreSelection(savedRange);

         if (url) {
            if (anchor) {
               // Update existing link
               anchor.setAttribute('href', url);
               anchor.setAttribute('target', target);
               anchor.setAttribute('rel', rel);
            } else {
               // Create new link
               this.#applyLinkToSelection({ href: url, target, rel });
            }
         }

         document.body.removeChild(modal);
      });

      // Handle cancel
      document.getElementById('cancel-link').addEventListener('click', () => {
         document.body.removeChild(modal);
      });
   }
   #openTableModal() {
      const savedRange = this.#saveSelection();

      const modal = document.createElement('div');
      modal.className = 'ray-editor-table-modal';
      modal.innerHTML = `
         <div class="ray-editor-table-modal-content">
            <label>Rows: <input type="number" id="ray-editor-table-modal-rows" min="1" value="2" /></label>
            <label>Columns: <input type="number" id="ray-editor-table-modal-cols" min="1" value="2" /></label>
            <button id="ray-editor-insert-table">Insert Table</button>
            <button id="ray-editor-cancel-table">Cancel</button>
         </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('ray-editor-insert-table').addEventListener('click', () => {
         const rows = parseInt(document.getElementById('ray-editor-table-modal-rows').value);
         const cols = parseInt(document.getElementById('ray-editor-table-modal-cols').value);

         this.#restoreSelection(savedRange);
         this.#insertTable(rows, cols);
         modal.remove();
      });

      document.getElementById('ray-editor-cancel-table').addEventListener('click', () => {
         modal.remove();
      });
   }

   #insertTable(rows, cols) {
      const table = document.createElement('table');
      table.className = 'ray-editor-table';

      for (let i = 0; i < rows; i++) {
         const tr = document.createElement('tr');
         for (let j = 0; j < cols; j++) {
            const td = document.createElement('td');
            td.innerHTML = '&nbsp;';
            tr.appendChild(td);
         }
         table.appendChild(tr);
      }

      const range = window.getSelection().getRangeAt(0);
      range.deleteContents();
      range.insertNode(table);
      table.addEventListener('contextmenu', (e) => {
         e.preventDefault();
         const td = e.target.closest('td');
         if (!td) return;
         this.#showTableContextMenu(td, e.pageX, e.pageY);
      });
      table.addEventListener('click', (e) => {
         // Remove highlight from any previously selected table
         document.querySelectorAll('table').forEach(t => t.classList.remove('ray-editor-table-highlighted'));

         // Add highlight to the selected table
         table.classList.add('ray-editor-table-highlighted');
      });
      // Move caret after the table
      const newLine = document.createElement('p');
      newLine.innerHTML = '<br>';
      table.after(newLine);

      const sel = window.getSelection();
      const newRange = document.createRange();
      newRange.setStart(newLine, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
   }
   #showTableContextMenu(td, x, y) {
      // Remove existing menu if any
      const existing = document.getElementById('table-context-menu');
      if (existing) existing.remove();

      const menu = document.createElement('div');
      menu.id = 'table-context-menu';
      menu.className = 'ray-table-context-menu';
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;

      // Adding descriptive tooltips to explain actions
      menu.innerHTML = `
         <button data-action="add-row" title="Add a new row below the current row">Add Row</button>
         <button data-action="delete-row" title="Delete the current row. Note: You can't delete the last row.">Delete Row</button>
         <button data-action="add-col" title="Add a new column to the right of the selected column">Add Column</button>
         <button data-action="delete-col" title="Delete the current column. Note: You can't delete the last column.">Delete Column</button>
         <button data-action="remove-table" title="Remove the entire table from the content">Remove Table</button>
      `;

      document.body.appendChild(menu);

      const tr = td.parentElement;
      const table = td.closest('table');
      const cellIndex = Array.from(td.parentNode.children).indexOf(td);

      // Action handling for context menu
      menu.addEventListener('click', (e) => {
         const action = e.target.dataset.action;
         if (!action) return;

         switch (action) {
            case 'add-row':
               // Add a new row below the current row
               const newRow = tr.cloneNode(true);
               newRow.querySelectorAll('td').forEach(cell => cell.innerHTML = '&nbsp;');
               tr.after(newRow);
               break;
            case 'delete-row':
               // Remove the current row if it's not the only row in the table
               if (table.rows.length > 1) tr.remove();
               break;
            case 'add-col':
               // Add a new column to the right of the selected column
               Array.from(table.rows).forEach(row => {
                  const cell = row.insertCell(cellIndex + 1);
                  cell.innerHTML = '&nbsp;';
               });
               break;
            case 'delete-col':
               // Remove the current column if it's not the last column
               const colCount = table.rows[0].cells.length;
               if (colCount > 1) {
                  Array.from(table.rows).forEach(row => row.deleteCell(cellIndex));
               }
               break;
            case 'remove-table':
               // Remove the entire table
               table.remove();
               break;
         }

         menu.remove();
      });

      // Close menu if clicked outside
      document.addEventListener('click', () => menu.remove(), { once: true });
   }


   #applyLinkToSelection({ href, target, rel }) {
      const selection = window.getSelection();
      if (!selection.rangeCount || selection.isCollapsed) return;

      const range = selection.getRangeAt(0);

      // Prevent linking across multiple blocks
      const startBlock = this.#getBlockAncestor(range.startContainer);
      const endBlock = this.#getBlockAncestor(range.endContainer);
      if (startBlock !== endBlock) {
         alert('Please select text within a single paragraph or inline block.');
         return;
      }

      // Create <a> and wrap
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.target = target || '_self';
      if (rel) anchor.rel = rel;
      anchor.className = 'ray-link';

      try {
         range.surroundContents(anchor);
         selection.removeAllRanges();
         selection.addRange(range);
      } catch (err) {
         alert('Invalid selection. Try selecting clean inline text.');
      }
   }
   #getBlockAncestor(node) {
      while (node && node.nodeType === 3) node = node.parentNode;
      while (node && node !== document.body) {
         const style = window.getComputedStyle(node);
         if (style.display === 'block' || style.display === 'flex' || style.display === 'grid') {
            return node;
         }
         node = node.parentNode;
      }
      return null;
   }
   #removeLink(anchor) {
      const parent = anchor.parentNode;
      while (anchor.firstChild) {
         parent.insertBefore(anchor.firstChild, anchor);
      }
      parent.removeChild(anchor);
   }
   #updateToolbar() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const parent = range.startContainer.parentNode;

      // Reset all toolbar states once
      this.#resetToolbar();

      const checks = [
         { tag: 'b', style: ['font-weight', 'bold'], btn: 'ray-btn-bold' },
         { tag: 'i', style: ['font-style', 'italic'], btn: 'ray-btn-italic' },
         { tag: 'u', style: ['text-decoration', 'underline'], btn: 'ray-btn-underline' },
         { tag: 'strike', style: ['text-decoration', 'line-through'], btn: 'ray-btn-strikeThrough' },
         { tag: 'sub', style: null, btn: 'ray-btn-subscript' },
         { tag: 'sup', style: null, btn: 'ray-btn-superscript' },
         { tag: 'li', style: null, btn: 'ray-btn-orderedList' },
         { tag: 'ol', style: null, btn: 'ray-btn-unorderedList' },
         { tag: 'font', style: ['color'], btn: 'ray-btn-textColor' },
         { tag: 'code', style: null, btn: 'ray-btn-codeInline' }
      ];

      for (const { tag, style, btn } of checks) {
         const matchTag = this.#isInTag(parent, tag);
         const matchStyle = style ? this.#isInStyle(parent, style[0], style[1]) : false;
         if (matchTag || matchStyle) {
            document.getElementById(btn)?.classList.add('active');
         }
      }

      // Handle custom code block detection
      if (parent.closest('.ray-code-block')) {
         document.getElementById('ray-btn-codeBlock')?.classList.add('active');
      }

      // Handle heading dropdown
      const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote'];
      const matchedHeading = headings.find(tag => this.#isInTag(parent, tag)) || 'p';
      const headingSelect = document.querySelector('.ray-dropdown-heading');
      if (headingSelect) headingSelect.value = `<${matchedHeading}>`;

      // Handle font dropdown - UPDATED VERSION
      const availableFonts = ['Arial', 'Georgia', 'Verdana']; // Add your font options
      const currentFont = this.#getCurrentFontFamily(parent);
      const fontSelect = document.querySelector('.ray-dropdown-fonts');
      if (fontSelect) {
         // Find the matching font from your dropdown options
         const matchedFont = availableFonts.find(font =>
            currentFont.toLowerCase().includes(font.toLowerCase())
         ) || 'Arial';
         fontSelect.value = matchedFont;
      }

      // alignment dropdown
      let matchedAlignment = parent.getAttribute('align') || 'left';
      const alignmentSelect = document.querySelector('.ray-dropdown-textAlignment');
      if (alignmentSelect) alignmentSelect.value = `${matchedAlignment}`;
   }

   // NEW HELPER METHOD to get current font family
   #getCurrentFontFamily(el) {
      while (el && el !== document) {
         const fontFamily = window.getComputedStyle(el).fontFamily;
         // Return the first font in the font-family stack
         if (fontFamily && fontFamily !== 'inherit') {
            return fontFamily.split(',')[0].replace(/['"]/g, '').trim();
         }
         el = el.parentNode;
      }
      return '';
   }

   #isInStyle(el, styleProp, value = null) {
      while (el && el !== document) {
         if (value) {
            if (window.getComputedStyle(el)[styleProp] === value) return true;
         } else {
            if (window.getComputedStyle(el)[styleProp]) return true;
         }
         el = el.parentNode;
      }
      return false;
   }

   #isInTag(el, tagName) {
      while (el && el !== document) {
         if (el.tagName && el.tagName.toLowerCase() === tagName) return true;
         el = el.parentNode;
      }
      return false;
   }
   // Common function to reset the toolbar
   #resetToolbar() {
      document.querySelectorAll('.ray-editor-toolbar button').forEach(btn => {
         btn.classList.remove('active');
      });
   }
   #insertHr() {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      range.collapse(true); // Caret only

      // Delete any selected contents
      range.deleteContents();

      // Create <hr>
      const hr = document.createElement('hr');
      hr.setAttribute('contenteditable', 'false');
      hr.classList.add('ray-editor-hr');
      hr.style.cursor = 'pointer';
      hr.style.border = '1px solid #ccc';
      hr.style.margin = '1em 0';

      hr.addEventListener('click', () => {
         if (confirm('Remove this horizontal line?')) hr.remove();
      });

      // Add a newline paragraph after <hr> so user can continue typing
      const paragraph = document.createElement('p');
      paragraph.innerHTML = '<br>'; // makes it visibly editable
      paragraph.style.margin = '0';

      // Create fragment to insert multiple nodes
      const frag = document.createDocumentFragment();
      frag.appendChild(hr);
      frag.appendChild(paragraph);

      // Insert the fragment at caret position
      range.insertNode(frag);

      // Move caret inside new paragraph
      const newRange = document.createRange();
      newRange.setStart(paragraph, 0);
      newRange.collapse(true);

      selection.removeAllRanges();
      selection.addRange(newRange);
   }

   #insertDateTime({ block = false } = {}) {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      range.deleteContents();

      const now = new Date();
      const formatted = now.toLocaleString(); // Customize format as needed

      // Create date element
      const dateEl = document.createElement(block ? 'div' : 'span');
      dateEl.textContent = formatted;
      dateEl.contentEditable = 'false';
      dateEl.className = 'ray-date-time';
      dateEl.style.fontSize = '0.85em';
      dateEl.style.color = '#666';
      dateEl.style.margin = '0.5em 0';
      dateEl.style.display = block ? 'block' : 'inline';
      dateEl.style.userSelect = 'none';
      dateEl.style.cursor = 'pointer';
      dateEl.title = 'Click to remove date/time';

      // Allow user to remove
      dateEl.addEventListener('click', () => {
         if (confirm('Remove this date/time?')) dateEl.remove();
      });

      // Add invisible space after date for caret
      const space = document.createTextNode('\u200B');

      // Create a fragment to insert both nodes
      const frag = document.createDocumentFragment();
      frag.appendChild(dateEl);
      frag.appendChild(space);

      // Insert date + space
      range.insertNode(frag);

      // Move caret after the space
      const newRange = document.createRange();
      newRange.setStartAfter(space);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
   }


}
const buttonConfigs = {
   bold: {
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bold-icon lucide-bold"><path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/></svg>`,
      cmd: "bold",
      keyname: "bold"
   },
   italic: {
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-italic-icon lucide-italic"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>`,
      cmd: "italic",
      keyname: "italic"
   },
   underline: {
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-underline-icon lucide-underline"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="20" y2="20"/></svg>`,
      cmd: "underline",
      keyname: "underline"
   },
   strikethrough: {
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-strikethrough-icon lucide-strikethrough"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></svg>`,
      cmd: "strikeThrough",
      keyname: "strikeThrough"
   },
   undo: {
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-undo2-icon lucide-undo-2"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>`,
      keyname: "undo",
      cmd: "undo"
   },
   redo: {
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-redo2-icon lucide-redo-2"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"/></svg>`,
      keyname: "redo",
      cmd: "redo"
   },
   superscript: {
      keyname: "superscript",
      label: "x²",
      cmd: "superscript"
   },
   subscript: {
      keyname: "subscript",
      label: "x₂",
      cmd: "subscript"
   },
   orderedList: {
      keyname: "orderedList",
      label: `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-list-ordered" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h1v4"/><path d="M4 14h1v4"/></svg>`,
      cmd: "insertOrderedList"
   },
   unorderedList: {
      keyname: "unorderedList",
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-icon lucide-list"><path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/></svg>`,
      cmd: "insertUnorderedList"
   },
   uppercase: {
      label: "ABC",
      keyname: "uppercase",
   },
   lowercase: {
      label: "abc",
      keyname: "lowercase",
   },
   headings: {
      dropdown: true,
      keyname: 'heading',
      options: {
         paragraph: { label: 'Paragraph', cmd: 'formatBlock', value: '<p>' },
         heading1: { label: 'Heading 1', cmd: 'formatBlock', value: '<h1>' },
         heading2: { label: 'Heading 2', cmd: 'formatBlock', value: '<h2>' },
         heading3: { label: 'Heading 3', cmd: 'formatBlock', value: '<h3>' },
         heading4: { label: 'Heading 4', cmd: 'formatBlock', value: '<h4>' },
         heading5: { label: 'Heading 5', cmd: 'formatBlock', value: '<h5>' },
         heading6: { label: 'Heading 6', cmd: 'formatBlock', value: '<h6>' },
         blockquote: { label: 'Blockquote', cmd: 'formatBlock', value: 'blockquote' }
      }
   },
   fonts: {
      dropdown: true,
      keyname: 'fonts',
      options: {
         arial: { label: 'Arial', cmd: 'fontName', value: 'Arial' },
         georgia: { label: 'Georgia', cmd: 'fontName', value: 'Georgia' },
         verdana: { label: 'Verdana', cmd: 'fontName', value: 'Verdana' },
      }
   },
   toggleCase: {
      keyname: "toggleCase",
      label: "Tg",
   },
   codeBlock: {
      keyname: "codeBlock",
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-code-icon lucide-code"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
   },
   codeInline: {
      keyname: "codeInline",
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevrons-left-right-ellipsis-icon lucide-chevrons-left-right-ellipsis"><path d="m18 8 4 4-4 4"/><path d="m6 8-4 4 4 4"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>`,
   },
   backgroundColor: {
      keyname: 'backgroundColor',
      label: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-paintbrush-icon lucide-paintbrush"><path d="m14.622 17.897-10.68-2.913"/><path d="M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z"/><path d="M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15"/></svg>',  // Background color icon
   },
   textColor: {
      keyname: 'textColor',
      label: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-brush-icon lucide-brush"><path d="m11 10 3 3"/><path d="M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z"/><path d="M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031"/></svg>',
   },
   imageUpload: {
      keyname: "imageUpload",
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-icon lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
   },
   fileUpload: {
      keyname: "fileUpload",
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-icon lucide-file"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`,
   },
   link: {
      keyname: "link",
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link-icon lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
   },
   removeFormat: {
      keyname: "removeFormat",
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-remove-formatting-icon lucide-remove-formatting"><path d="M4 7V4h16v3"/><path d="M5 20h6"/><path d="M13 4 8 20"/><path d="m15 15 5 5"/><path d="m20 15-5 5"/></svg>`,
   },
   textAlignment: {
      dropdown: true,
      keyname: 'textAlignment',
      options: {
         left: { label: 'Left', cmd: 'justifyLeft', value: 'left' },
         right: { label: 'Right', cmd: 'justifyRight', value: 'right' },
         center: { label: 'Center', cmd: 'justifyCenter', value: 'center' },
      }
   },
   table: {
      keyname: "table",
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-table-icon lucide-table"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>`,
   },
   hr: {
      keyname: "hr",
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-horizontal-rule"><line x1="4" y1="12" x2="20" y2="12"/></svg>`,
   },
   insertDateTime: {
      keyname: "insertDateTime",
      label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-days-icon lucide-calendar-days"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>`
   }
   ,
}