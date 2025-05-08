
export function initEditor(containerId, config = {}) {
   const container = document.getElementById(containerId);
   container.classList.add('ray-editor');
   container.classList.add('position-relative')
   addWatermark(container);
   // Create toolbar
   const toolbar = document.createElement('div');
   toolbar.className = 'ray-toolbar';

   // Create content area
   const editor = document.createElement('div');
   editor.className = 'ray-content-editor';
   editor.spellcheck = true;
   editor.contentEditable = true;
   editor.innerHTML = '<p><br></p>';

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
         action: () => executeCommand("undo")
      },
      redo: {
         label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-redo2-icon lucide-redo-2"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"/></svg>`,
         keyname: "redo",
         action: () => executeCommand("redo")
      },
      link: {
         label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link-icon lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
         action: () => openLinkDialog()
      },
      uppercase: {
         label: "ABC",
         keyname: "uppercase",
         action: () => transformSelectedText("upper")
      },
      lowercase: {
         label: "abc",
         keyname: "lowercase",
         action: () => transformSelectedText("lower")
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
      toggleCase: {
         keyname: "toggleCase",
         label: "Tg",
         action: () => toggleTextCase()
      },
      codeBlock: {
         keyname: "codeBlock",
         label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-code-icon lucide-code"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
         action: () => insertCodeBlock()
      },
      codeInline: {
         keyname: "codeInline",
         label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevrons-left-right-ellipsis-icon lucide-chevrons-left-right-ellipsis"><path d="m18 8 4 4-4 4"/><path d="m6 8-4 4 4 4"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>`,
         action: () => insertInlineCode()
      },
      imageUpload: {
         keyname: "imageUpload",
         label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-icon lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
         action: () => triggerImageUpload(config)
      },
      fileUpload: {
         keyname: "file",
         label: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-icon lucide-file"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`,
         action: () => triggerFileUpload(config, container)
      },
      emoji: {
         keyname: 'emoji',
         label: '😊',
         action: () => {
            toggleEmojiPicker(toolbar, editor);
         }
      },
      backgroundColor: {
         keyname: 'backgroundColor',
         label: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-paintbrush-icon lucide-paintbrush"><path d="m14.622 17.897-10.68-2.913"/><path d="M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z"/><path d="M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15"/></svg>',  // Background color icon
         action: () => {
            const input = document.createElement("input");
            input.type = "color";
            input.value = "#ffffff"; // Default background color
            input.oninput = () => {
               const color = input.value;
               document.execCommand("backColor", false, color);
            };
            input.click();
         }
      },
      textColor: {
         keyname: 'textColor',
         label: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-brush-icon lucide-brush"><path d="m11 10 3 3"/><path d="M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z"/><path d="M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031"/></svg>',
         action: () => {
            // Create the color input
            const input = document.createElement("input");
            input.type = "color";
            input.value = "#000000"; // Default color

            // When color is selected, apply it to the selected text
            input.oninput = () => {
               const color = input.value;
               document.execCommand("foreColor", false, color);
            };

            // Trigger click to open color picker dialog
            input.click();
         }
      },
   };

   // Create Tool bar for editor
   for (const key in config) {
      if (key === "headings" && config[key]) {
         // Create the select element
         const headingSelect = document.createElement('select');
         headingSelect.id = 'heading-select';


         // Define heading options
         const headings = [
            { value: 'p', label: 'Paragraph' },
            { value: 'h1', label: 'Heading 1' },
            { value: 'h2', label: 'Heading 2' },
            { value: 'h3', label: 'Heading 3' },
            { value: 'h4', label: 'Heading 4' },
            { value: 'h5', label: 'Heading 5' },
            { value: 'h6', label: 'Heading 6' }
         ];
         // Create option elements for each heading
         headings.forEach((heading) => {
            const option = document.createElement('option');
            option.value = heading.value;
            option.textContent = heading.label;
            headingSelect.appendChild(option);
         });
         // Append the select dropdown to the toolbar
         toolbar.appendChild(headingSelect);
         headingSelect.addEventListener('click', applyHeading);
      } else if (key === "align" && config[key]) {
         // Create the select element for text alignment
         const alignmentSelect = document.createElement('select');
         alignmentSelect.id = 'alignment-select';

         // Define alignment options
         const alignments = [
         { value: 'left', label: 'Left' },
         { value: 'center', label: 'Center' },
         { value: 'right', label: 'Right' },
         ];

         // Create option elements for each alignment
         alignments.forEach((align) => {
         const option = document.createElement('option');
         option.value = align.value;
         option.textContent = align.label;
         alignmentSelect.appendChild(option);
         });

         // Append the select dropdown to the toolbar
         toolbar.appendChild(alignmentSelect);

         // Function to apply selected alignment
         alignmentSelect.addEventListener('change', function () {
         document.execCommand(`justify${this.value === 'left' ? 'Left' : this.value.charAt(0).toUpperCase() + this.value.slice(1)}`);
         });

      }else if (config[key]) {

         // Standard buttons
         const btn = document.createElement("button");
         btn.type = "button";
         btn.title = key.charAt(0).toUpperCase() + key.slice(1);
         btn.id = `ray-btn-${buttonConfigs[key].keyname}`;
         // btn.title = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
         const formattedTitle = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
         btn.setAttribute('data-tooltip', formattedTitle);
         btn.innerHTML = buttonConfigs[key].label;
         btn.className = `ray-btn ray-btn-${buttonConfigs[key].keyname}`;

         btn.onclick = () => {
            if (buttonConfigs[key].cmd) {
               executeCommand(buttonConfigs[key].cmd);
            } else if (buttonConfigs[key].action) {
               buttonConfigs[key].action();
            }
         };

         toolbar.appendChild(btn);
      }
   }
   // Dummy content with all options
   editor.innerHTML = `
   <p><b>This is bold text</b></p>
   <p><i>This is italic text</i></p>
   <p><u>This is underlined text</u></p>
   <p><strike>This is strikethrough text</strike></p>
   <p>This is normal text with no styles.</p>
   `;

   // Cursor position logger
   ['keyup', 'mouseup', 'keydown', 'paste'].forEach(evt => {
      editor.addEventListener(evt, (e) => {
         const position = getCursorPosition(editor);
         updateToolbar();

         const sel = window.getSelection();
         if (!sel.rangeCount) return;
         let node = sel.anchorNode;
         const elementNode = node.nodeType === 3 ? node.parentElement : node;

         // Handle exiting block code on double Enter
         if (evt === 'keydown' && e.key === 'Enter' && !e.shiftKey) {
            const codeContent = elementNode.closest('.ray-code-content');
            if (codeContent) {
               const text = codeContent.innerText.trim();

               if (text === '') {
                  e.preventDefault(); // prevent new line

                  codeContent.innerHTML = '';

                  const newPara = document.createElement('p');
                  newPara.innerHTML = '<br>';

                  const codeBlock = codeContent.closest('.ray-code-block');
                  if (codeBlock) {
                     codeBlock.parentNode.insertBefore(newPara, codeBlock.nextSibling);

                     // Move cursor into the new paragraph
                     const range = document.createRange();
                     range.selectNodeContents(newPara);
                     range.collapse(true);
                     sel.removeAllRanges();
                     sel.addRange(range);
                  }
               } else {
                  // First Enter → mark as potentially empty
                  codeContent.dataset.lastEmptyEnter = 'true';
                  setTimeout(() => {
                     delete codeContent.dataset.lastEmptyEnter;
                  }, 500);
               }
            }
         }

         // Handle inline code exit on space or ArrowRight
         if (evt === 'keydown' && (e.key === ' ' || e.key === 'ArrowRight')) {
            const inlineCode = elementNode.closest('code');
            if (inlineCode && sel.isCollapsed) {
               const range = sel.getRangeAt(0);
               const atEnd = range.endOffset === inlineCode.textContent.length;

               if (atEnd) {
                  e.preventDefault();
                  const spacer = document.createTextNode(e.key === ' ' ? '\u00A0' : '');
                  inlineCode.parentNode.insertBefore(spacer, inlineCode.nextSibling);

                  // Move cursor after the spacer
                  const newRange = document.createRange();
                  newRange.setStartAfter(spacer);
                  newRange.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(newRange);
               }
            }
         }
         // Handle youtube embeding in editor
         if (evt === 'paste') {
            const clipboard = e.clipboardData || window.clipboardData;
            const pastedText = clipboard.getData('text');

            const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
            const match = pastedText.match(ytRegex);

            if (match) {
               e.preventDefault(); // Stop normal paste

               const videoId = match[1];

               const iframe = document.createElement('iframe');
               iframe.src = `https://www.youtube.com/embed/${videoId}`;
               iframe.width = '560';
               iframe.height = '315';
               iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
               iframe.allowFullscreen = true;
               iframe.className = 'ray-youtube-embed';

               const range = window.getSelection().getRangeAt(0);
               range.deleteContents();
               range.insertNode(iframe);
            }
         }
      });
   });


   // Append to container
   container.appendChild(toolbar);
   container.appendChild(editor);
}
let emojiPicker;

function toggleEmojiPicker(toolbar, editor) {
   if (emojiPicker) {
      closeEmojiPicker()
   }
   const selection = window.getSelection();
   if (!selection.rangeCount) return;

   const range = selection.getRangeAt(0).cloneRange();
   const rect = range.getBoundingClientRect();

   emojiPicker = document.createElement('div');
   emojiPicker.className = 'ray-emoji-picker';
   emojiPicker.innerHTML = `<div class="emoji-header">
    <strong>Choose Emoji</strong><button class="close-emoji">✖️</button>
  </div>`;
   const emojiCategories = {
      "Smileys": [
         "😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊",
         "😋", "🫠", "😎", "😍", "😘", "🥰", "😗", "😙", "😚", "☺️",
         "🙂", "🤗", "🤩", "🥲", "🤔", "🤨", "😐", "😑", "😶", "🙄",
         "😏", "😣", "😥", "🫢", "😮", "🫣", "🤐", "😯", "😪", "🫡",
         "😫", "😴", "😌", "😛", "😜", "😝", "🫥", "🤤", "😒", "😶‍🌫️",
         "😓", "😔", "😕", "🙃", "🤑", "😮‍💨", "😲", "☹️", "🫨", "🙁",
         "🙂‍↔️", "🙂‍↕️", "😖", "😞", "🥵", "🥶", "😟", "😤", "🥴", "😢",
         "😭", "😦", "🥳", "😧", "😨", "😩", "🤯", "😬", "😰", "😱",
         "😳", "😵‍💫", "🤪", "😵", "🥺", "😡", "😠", "🥸", "🤬", "😷",
         "🤒", "🤕", "🤢", "🤮", "🫤", "🤧", "😇", "🤠", "🤥", "🤫",
         "🥱", "🤭", "🥹", "🧐", "🤓", "😈", "👿", "🤡", "👹", "👺",
         "💀", "☠️", "👻", "👽", "👾", "🤖", "💩", "🙊"
      ],
      "Love": [
         "🤎", "🤍", "❤️‍🔥", "❤️‍🩹", "🩷", "🩵", "🩶", "🫦", "💋", "💘",
         "💝", "💖", "💗", "💓", "💞", "💕", "💌", "❣️", "💔", "❤️",
         "🧡", "💛", "💚", "💙", "💜", "🖤", "💟", "💍", "💎", "🫂",
         "💐", "💒"
      ],
      "People": [
         "👶", "🧒", "👦", "👧", "🧑", "👨", "👱‍♂️", "🧔", "👩", "👱‍♀️", "🧓", "👴", "👵",
         "👨‍⚕️", "👩‍⚕️", "👨‍🎓", "👩‍🎓", "👨‍🏫", "👩‍🏫", "👨‍⚖️", "👩‍⚖️", "👨‍🌾", "👩‍🌾",
         "👨‍🍳", "👩‍🍳", "👨‍🔧", "👩‍🔧", "👨‍🏭", "👩‍🏭", "👨‍💼", "👩‍💼", "👨‍🔬", "👩‍🔬",
         "👨‍💻", "👩‍💻", "👨‍🎤", "👩‍🎤", "👨‍🎨", "👩‍🎨", "👨‍✈️", "👩‍✈️", "👨‍🚀", "👩‍🚀",
         "👨‍🚒", "👩‍🚒", "👮‍♂️", "👮‍♀️", "🕵️‍♂️", "🕵️‍♀️", "💂‍♂️", "💂‍♀️", "👷‍♂️", "👷‍♀️",
         "🤴", "👸", "👳‍♂️", "👳‍♀️", "👲", "🧕", "🤵", "👰", "🤰", "🤱", "👼", "🎅", "🤶",
         "🧙‍♂️", "🧙‍♀️", "🧚‍♂️", "🧚‍♀️", "🧛‍♂️", "🧛‍♀️", "🧜‍♂️", "🧜‍♀️", "🧝‍♂️", "🧝‍♀️",
         "🧞‍♂️", "🧞‍♀️", "🧟‍♂️", "🧟‍♀️", "🫀", "🫁", "🙍‍♂️", "🙍‍♀️", "🙎‍♂️", "🙎‍♀️",
         "🙅‍♂️", "🙅‍♀️", "🙆‍♂️", "🙆‍♀️", "💁‍♂️", "💁‍♀️", "🙋‍♂️", "🙋‍♀️", "🧏", "🧏‍♂️",
         "🧏‍♀️", "🙇‍♂️", "🙇‍♀️", "🤦", "🤦‍♂️", "🤦‍♀️", "🤷", "🤷‍♂️", "🤷‍♀️", "🧑‍🦰",
         "🧑‍🦱", "🧑‍🦳", "🧑‍🦲", "💆‍♂️", "💆‍♀️", "💇‍♂️", "💇‍♀️", "👤", "👥", "🦸", "🦸‍♂️",
         "🦸‍♀️", "🦹", "🦹‍♂️", "🦹‍♀️", "🧑‍🤝‍🧑", "👫", "👬", "👭", "👩‍❤️‍💋‍👨", "👨‍❤️‍💋‍👨",
         "👩‍❤️‍💋‍👩", "👩‍❤️‍👨", "👨‍❤️‍👨", "👩‍❤️‍👩", "👨‍👩‍👦", "👨‍👩‍👧", "👨‍👩‍👧‍👦",
         "👨‍👩‍👦‍👦", "👨‍👩‍👧‍👧", "👨‍👨‍👦", "👨‍👨‍👧", "👨‍👨‍👧‍👦", "👨‍👨‍👦‍👦",
         "👨‍👨‍👧‍👧", "👩‍👩‍👦", "👩‍👩‍👧", "👩‍👩‍👧‍👦", "👩‍👩‍👦‍👦", "👩‍👩‍👧‍👧", "👨‍🦯",
         "👩‍🦯", "👨‍🦼", "👩‍🦼", "👨‍🦽", "👩‍🦽", "🧍", "🧍‍♂️", "🧍‍♀️", "🧎", "🧎‍♂️", "🧎‍♀️",
         "🫅", "🤵‍♂️", "🤵‍♀️", "👰‍♂️", "👰‍♀️", "🫃", "🫄", "👨‍🍼", "👩‍🍼", "🧑‍🍼", "🧑‍🎄", "🧌",
         "🚶‍➡️", "🧎‍➡️", "🧎‍♀️‍➡️", "🧎‍♂️‍➡️", "🧑‍🦯", "🧑‍🦯‍➡️", "👨‍🦯‍➡️", "👩‍🦯‍➡️",
         "🧑‍🦼", "🧑‍🦽", "🧑‍🧑‍🧒", "🧑‍🧑‍🧒‍🧒", "🧑‍🧒", "🧑‍🧒‍🧒", "🪮"
      ],
      "Gestures": [
         "🤏", "🫱", "🫲", "🫳", "🫴", "🫷", "🫸", "🤌", "🦵", "🫰", "🦶", "🫵", "🫶",
         "🤳", "💪", "👈", "👉", "☝️", "👆", "🖕", "👇", "✌️", "🤞", "🖖", "🤘", "🤙",
         "🖐️", "✋", "👌", "👍", "👎", "✊", "👊", "🤛", "🤜", "🤚", "👋", "🤟", "✍️",
         "👏", "👐", "🙌", "🤲", "🙏", "🤝", "👂", "👃", "👀", "👁️", "🧠", "👅", "👄"
      ],
      "Activities": [
         "🚶‍♂️", "🚶‍♀️", "🏃‍♂️", "🏃‍♀️", "💃", "🕺", "👯‍♂️", "👯‍♀️", "🧖‍♂️", "🧖‍♀️", "🧗‍♂️", "🧗‍♀️",
         "🧘‍♂️", "🧘‍♀️", "🛌", "🕴️", "🗣️", "🤺", "🏇", "⛷️", "🏂", "🏌️‍♂️", "🏌️‍♀️", "🏄‍♂️", "🏄‍♀️",
         "🚣‍♂️", "🚣‍♀️", "🏊‍♂️", "🏊‍♀️", "⛹️‍♂️", "⛹️‍♀️", "🏋️‍♂️", "🏋️‍♀️", "🚴‍♂️", "🚴‍♀️", "🚵‍♂️", "🚵‍♀️",
         "🤸", "🤸‍♂️", "🤸‍♀️", "🤼", "🤼‍♂️", "🤼‍♀️", "🤽", "🤽‍♂️", "🤽‍♀️", "🤾", "🤾‍♂️", "🤾‍♀️",
         "🤹", "🤹‍♂️", "🤹‍♀️", "🏎️", "🏍️", "🛝", "🎖️", "🏆", "🏅", "🥇", "🥈", "🥉",
         "⚽", "⚾", "🏀", "🏐", "🏈", "🏉", "🎾", "🎳", "🏏", "🥎", "🏑", "🏒", "🛼",
         "🏓", "🏸", "🥊", "🥏", "🥋", "🥅", "⛸️", "🎣", "🥍", "🎿", "🛷", "🥌", "🎯",
         "🎱", "🤿", "🪀", "🪁", "🧿", "🧩", "🧸", "🧵", "🧶", "🪄", "🪅", "🪗", "🪘",
         "🪇", "🪈", "🪃"
      ],
      "Music & Video": [
         "📢", "📣", "📯", "🔔",
         "🎼", "🎵", "🎶", "🎙️", "🎚️", "🎛️", "🎧", "📻",
         "🎷", "🎸", "🎹", "🎺", "🎻", "🥁", "🪕",
         "💽", "💿", "📀",
         "🎥", "🎞️", "📽️", "🎬", "📺", "📼",
         "📷", "📸", "📹"
      ],
      "Animals": ["🐶", "🐱", "🐭", "🐹", "🐻", "🐼", "🦁", "🐯"],
      "Activities": ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🎳", "🏓"],
      "Food": [
         "🥭", "🍇", "🍈", "🍉", "🍊", "🍋", "🍌", "🍍", "🍎", "🍏", "🍐", "🍑", "🍒", "🍓", "🥝", "🫐",
         "🥬", "🧄", "🧅", "🍅", "🥥", "🥑", "🍆", "🥔", "🥕", "🌽", "🌶️", "🥒", "🥦", "🫘", "🫛", "🫑", "🍄‍🟫",
         "🥯", "🍞", "🥐", "🥖", "🥨", "🥞", "🧇", "🧈", "🥖", "🫓",
         "🍖", "🍗", "🥩", "🧆", "🥓", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🥙", "🥚", "🍳", "🥘", "🍲", "🥣", "🥗",
         "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", "🍝", "🥮",
         "🍠", "🍢", "🍣", "🍤", "🍥", "🍡", "🥟", "🦪", "🥠", "🥡", "🍿", "🥫",
         "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🧁", "🍰", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯",
         "🍼", "🥛", "☕", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🧃", "🥤", "🧉", "🧊", "🧋",
         "🥢", "🍽️", "🍴", "🥄", "🏺"
      ]
   };
   Object.entries(emojiCategories).forEach(([category, emojis]) => {
      const group = document.createElement('div');
      group.className = 'emoji-group';
      group.innerHTML = `<div class="emoji-title">${category}</div>`;
      const list = document.createElement('div');
      list.className = 'emoji-list';
      emojis.forEach(e => {
         const btn = document.createElement('button');
         btn.className = 'emoji-btn';
         btn.textContent = e;
         btn.onclick = () => {
            insertEmoji(e);
         };
         list.appendChild(btn);
      });
      group.appendChild(list);
      emojiPicker.appendChild(group);
   });

   // When showing the emoji picker
   emojiPicker.style.position = 'absolute';
   emojiPicker.style.zIndex = '9999';
   toolbar.appendChild(emojiPicker);
   positionEmojiPicker(emojiPicker, editor);

   // Close on click ✖️
   emojiPicker.querySelector('.close-emoji').addEventListener('click', closeEmojiPicker);
}
function positionEmojiPicker(emojiPicker, editor) {
   const coords = getCaretCoordinates();
   if (!coords) return;

   const editorRect = editor.getBoundingClientRect();
   const pickerWidth = emojiPicker.offsetWidth;
   const pickerHeight = emojiPicker.offsetHeight;
   const viewportWidth = window.innerWidth;
   const viewportHeight = window.innerHeight;

   // Base position
   let left = coords.left;
   let top = coords.top;

   // Check right boundary
   if (left + pickerWidth > editorRect.right - window.scrollX) {
      left = coords.left - pickerWidth;
   }

   // Check left boundary
   left = Math.max(left, editorRect.left - window.scrollX);

   // Check bottom boundary
   if (top + pickerHeight > editorRect.bottom - window.scrollY) {
      top = coords.top - pickerHeight - 20;
   }

   // Check top boundary
   top = Math.max(top, editorRect.top - window.scrollY);

   // Ensure within viewport
   left = Math.min(left, viewportWidth - pickerWidth);
   top = Math.min(top, viewportHeight - pickerHeight);

   emojiPicker.style.left = `${left}px`;
   emojiPicker.style.top = `${top}px`;
}

function getCaretCoordinates() {
   const selection = window.getSelection();
   if (!selection.rangeCount) return null;

   const range = selection.getRangeAt(0).cloneRange();
   const marker = document.createElement("span");
   marker.appendChild(document.createTextNode("\u200b")); // zero-width space
   range.insertNode(marker);

   const rect = marker.getBoundingClientRect();
   const coordinates = {
      left: rect.left + window.scrollX,
      top: rect.bottom + window.scrollY + 10
   };

   marker.parentNode.removeChild(marker);
   selection.removeAllRanges();
   selection.addRange(range); // Restore original selection

   return coordinates;
}

function closeEmojiPicker() {
   if (emojiPicker && emojiPicker.parentNode) {
      emojiPicker.parentNode.removeChild(emojiPicker);
   }
   emojiPicker = null;
}

function insertEmoji(emoji) {
   const selection = window.getSelection();
   if (!selection.rangeCount) return;
   const range = selection.getRangeAt(0);
   range.deleteContents();
   range.insertNode(document.createTextNode(emoji));
   range.collapse(false);
   selection.removeAllRanges();
   selection.addRange(range);
}


function triggerFileUpload(config, container) {
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

      if (file.size > 20 * 1024 * 1024) {
         alert('File must be under 20MB.');
         return;
      }

      handleFileUpload(file, config, container);
   });

   document.body.appendChild(input);
   input.click();
   document.body.removeChild(input);
}

function handleFileUpload(file, config, container) {
   const uploadUrl = config.fileUpload?.fileUploadUrl;
   const mapResponse = config.fileUpload?.onUploadResponse || ((res) => res.url);

   if (!uploadUrl) {
      console.error('No file upload URL configured.');
      return;
   }

   const formData = new FormData();
   formData.append('file', file);

   const placeholder = insertUploadPlaceholder(file.name, container);

   fetch(uploadUrl, {
      method: 'POST',
      body: formData
   })
      .then(res => {
         if (!res.ok) throw new Error(`Status ${res.status}`);
         return res.json();
      })
      .then(data => {
         const fileUrl = mapResponse(data);
         if (!fileUrl) throw new Error('No file URL returned.');
         replacePlaceholderWithFileLink(placeholder, file.name, fileUrl);
      })
      .catch(err => {
         console.error('File upload failed:', err);
         showUploadErrorWithRemove(placeholder, file.name);
      });
}

function replacePlaceholderWithFileLink(placeholder, filename, url) {
   const link = document.createElement('a');
   link.href = url;
   link.target = '_blank';
   link.download = filename;
   link.textContent = `📄 ${filename}`;
   link.style.textDecoration = 'underline';
   link.style.color = '#0366d6';

   placeholder.replaceWith(link);
}

function triggerImageUpload(config) {
   const input = document.createElement('input');
   input.type = 'file';
   input.accept = 'image/*';
   input.style.display = 'none';

   input.addEventListener('change', () => {
      const image = input.files[0];
      if (!image) return;

      if (!image.type.startsWith('image/')) {
         alert('Only image files are allowed.');
         return;
      }

      if (image.size > 5 * 1024 * 1024) { // 5MB limit
         alert('Image size must be under 5MB.');
         return;
      }

      handleImageUpload(image, config, container);
   });

   document.body.appendChild(input);
   input.click();
   document.body.removeChild(input);
}

function handleImageUpload(image, config, container) {
   const uploadUrl = config.imageUpload?.imageUploadUrl;
   const mapResponse = config.imageUpload?.onUploadResponse || (res => res.url);

   if (!uploadUrl) {
      console.error('Upload URL is not configured.');
      return;
   }

   const formData = new FormData();
   formData.append('file', image);

   const placeholder = insertUploadPlaceholder(image.name, container);

   fetch(uploadUrl, {
      method: 'POST',
      body: formData
   })
      .then(res => {
         if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);
         return res.json();
      })
      .then(data => {
         const imageUrl = mapResponse(data);
         if (!imageUrl) throw new Error('No image URL returned from server.');
         replacePlaceholderWithImage(placeholder, imageUrl);
      })
      .catch(err => {
         console.error('Image upload failed:', err);
         showUploadErrorWithRemove(placeholder, image.name);
      });
}

function showUploadErrorWithRemove(placeholder, imagename) {
   placeholder.innerHTML = `❌ Failed to upload "${imagename}"`;

   const removeBtn = document.createElement('button');
   removeBtn.textContent = 'Remove';
   removeBtn.style.marginLeft = '10px';
   removeBtn.style.background = 'transparent';
   removeBtn.style.border = 'none';
   removeBtn.style.color = '#d00';
   removeBtn.style.cursor = 'pointer';

   removeBtn.onclick = () => placeholder.remove();
   placeholder.appendChild(removeBtn);
}

function insertUploadPlaceholder(filename, container) {
   const placeholder = document.createElement('div');
   placeholder.className = 'upload-placeholder';
   placeholder.textContent = `Uploading ${filename}...`;
   document.getElementById(container).appendChild(placeholder);
   return placeholder;
}

function replacePlaceholderWithImage(placeholder, imageUrl) {
   const img = document.createElement('img');
   img.src = imageUrl;
   img.alt = 'Uploaded Image';
   img.style.maxWidth = '100%';

   placeholder.replaceWith(img);
}

function insertInlineCode() {
   const selection = window.getSelection();
   if (!selection.rangeCount || selection.isCollapsed) return;

   const range = selection.getRangeAt(0);
   const selectedText = range.toString();

   const parentCode = getSelectedElementInTag('code');

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

function getSelectedElementInTag(tagName) {
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

function insertCodeBlock() {
   const selection = window.getSelection();
   if (!selection.rangeCount) return;

   const range = selection.getRangeAt(0);

   // Create wrapper div
   const wrapper = document.createElement('div');
   wrapper.className = 'ray-code-block';

   // Create editable inner div
   const codeContent = document.createElement('div');
   codeContent.className = 'ray-code-content';
   codeContent.setAttribute('contenteditable', 'true');
   codeContent.innerHTML = '<br>'; // blank line for typing

   wrapper.appendChild(codeContent);

   // Insert wrapper at current position
   range.deleteContents();
   range.insertNode(wrapper);

   // Move cursor inside the codeContent div
   setTimeout(() => {
      const newRange = document.createRange();
      newRange.selectNodeContents(codeContent);
      newRange.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(newRange);
   }, 0);
}

function toggleTextCase() {
   const sel = window.getSelection();
   if (!sel.rangeCount) return;

   const range = sel.getRangeAt(0);
   const selectedText = range.toString();

   if (!selectedText.trim()) return;

   const toggled = selectedText.split("").map(char => {
      // Toggle case: if lowercase, make uppercase; if uppercase, make lowercase
      return char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase();
   }).join("");

   range.deleteContents();
   range.insertNode(document.createTextNode(toggled));

   // Place cursor after transformed text
   range.collapse(false);
   sel.removeAllRanges();
   sel.addRange(range);
}

function transformSelectedText(mode) {
   const sel = window.getSelection();
   if (!sel.rangeCount) return;

   const range = sel.getRangeAt(0);
   const selectedText = range.toString();

   if (!selectedText.trim()) return;

   const transformed = mode === "upper" ? selectedText.toUpperCase() : selectedText.toLowerCase();

   range.deleteContents();
   range.insertNode(document.createTextNode(transformed));

   // Place cursor after transformed text
   range.collapse(false);
   sel.removeAllRanges();
   sel.addRange(range);
}

// Apply Heading to Selection
function applyHeading() {
   const selectedOption = document.getElementById('heading-select').value;
   document.execCommand('formatBlock', false, selectedOption)
}

function executeCommand(command) {
   document.execCommand(command, false, null);
}

function getCursorPosition(editor) {
   const selection = window.getSelection();
   if (!selection || selection.rangeCount === 0) return null;

   const range = selection.getRangeAt(0);
   const preRange = range.cloneRange();
   preRange.selectNodeContents(editor);
   preRange.setEnd(range.endContainer, range.endOffset);

   return preRange.toString().length;
}

function updateToolbar() {
   const selection = window.getSelection();
   if (!selection || selection.rangeCount === 0) return;

   const range = selection.getRangeAt(0);
   const parent = range.startContainer.parentNode;

   // Reset toolbar
   resetToolbar()

   // Check and highlight formatting
   if (isInTag(parent, 'b') || isInStyle(parent, 'font-weight', 'bold')) {
      // Reset toolbar
      resetToolbar()
      document.getElementById('ray-btn-bold').classList.add('active');
   }
   if (isInTag(parent, 'i') || isInStyle(parent, 'font-style', 'italic')) {
      // Reset toolbar
      resetToolbar()
      document.getElementById('ray-btn-italic').classList.add('active');
   }
   if (isInTag(parent, 'u') || isInStyle(parent, 'text-decoration', 'underline')) {
      // Reset toolbar
      resetToolbar()
      document.getElementById('ray-btn-underline').classList.add('active');
   }
   if (isInTag(parent, 'strike') || isInStyle(parent, 'text-decoration', 'line-through')) {
      // Reset toolbar
      resetToolbar()
      document.getElementById('ray-btn-strikeThrough').classList.add('active');
   }
   // Check for subscript
   if (isInTag(parent, 'sub')) {
      resetToolbar()
      document.getElementById('ray-btn-subscript').classList.add('active');
   }

   // Check for superscript
   if (isInTag(parent, 'sup')) {
      resetToolbar()
      document.getElementById('ray-btn-superscript').classList.add('active');
   }
   // Check for orderedList
   if (isInTag(parent, 'li')) {
      resetToolbar()
      document.getElementById('ray-btn-orderedList').classList.add('active');
   }
   // Check for unorderedList
   if (isInTag(parent, 'ol')) {
      resetToolbar()
      document.getElementById('ray-btn-unorderedList').classList.add('active');
   }
   // Check for code block
   if (parent.closest('.ray-code-block')) {
      resetToolbar();
      document.getElementById('ray-btn-codeBlock').classList.add('active');
   }
   if (isInTag(parent, 'code')) {
      resetToolbar();
      document.getElementById('ray-btn-codeInline').classList.add('active');
   }
   if (isInTag(parent, 'font')) {
      resetToolbar();
      document.getElementById('ray-btn-textColor').classList.add('active');
   }
   // Check for heading tags or paragraph tags and highlight the respective dropdown option
   const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p']; // Include h1 to h6, and p for default
   let activeTag = 'p'; // Default to paragraph (p)

   // Loop through the headings and check if the parent node matches any
   headings.forEach((tag) => {
      if (isInTag(parent, tag)) {
         activeTag = tag;
      }
   });
   // Update the heading select dropdown based on the active tag
   document.getElementById('heading-select').value = activeTag;
}

// Common function to reset the toolbar
function resetToolbar() {
   document.querySelectorAll('.ray-toolbar button').forEach(btn => {
      btn.classList.remove('active');
   });
}

function isInTag(el, tagName) {
   while (el && el !== document) {
      if (el.tagName && el.tagName.toLowerCase() === tagName) return true;
      el = el.parentNode;
   }
   return false;
}

function isInStyle(el, styleProp, value) {
   
   while (el && el !== document) {
      if (window.getComputedStyle(el)[styleProp] === value) return true;
      el = el.parentNode;
   }
   return false;
}

function addWatermark(container) {
   if (!container) return;

   const watermark = document.createElement('div');
   watermark.id = 'ray-editor-watermark';
   watermark.innerHTML = `Made with ❤️ by <a href="https://rohanyeole.com" target="_blank" rel="noopener">Rohan Yeole</a>`;

   // Insert after the editor
   container.parentNode.insertBefore(watermark, container.nextSibling);
}
