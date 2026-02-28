import type { RayEditorOptions, ToolbarGroup } from './types/options';
import type {
  RayPlugin,
  RayEditorInstance,
  ButtonConfig,
  SlashCommandConfig,
  CommandHandler,
  EventHandler,
} from './types/plugin';
import { DEFAULT_TOOLBAR } from './types/options';
import { EventBus } from './core/events';
import { SelectionManager } from './core/selection';
import { CommandManager } from './core/commands';
import { ContentManager } from './core/content';
import { HistoryManager } from './core/history';
import { ToolbarManager } from './core/toolbar';
import { FormattingFeature } from './features/formatting';
import { CodeBlockFeature } from './features/codeblock';
import { LinkFeature } from './features/link';
import { ImageFeature } from './features/image';
import { FileFeature } from './features/file';
import { TableFeature } from './features/table';
import { MentionsFeature } from './features/mentions';
import { YouTubeFeature } from './features/youtube';
import { SlashCommandFeature } from './features/slash-command';
import { FindReplaceFeature } from './features/find-replace';
import { WordCountFeature } from './features/word-count';
import { FullscreenFeature } from './features/fullscreen';
import { MarkdownShortcutsFeature } from './features/markdown-shortcuts';
import { EmojiFeature } from './features/emoji';
import { PluginManager } from './plugins/plugin-manager';

export class RayEditor implements RayEditorInstance {
  // DOM
  private container: HTMLElement;
  readonly editorElement: HTMLElement;
  readonly toolbarElement: HTMLElement;
  private wrapper: HTMLElement;

  // Options
  private options: RayEditorOptions;

  // Core modules
  private eventBus: EventBus;
  private selectionManager: SelectionManager;
  private commandManager: CommandManager;
  private contentManager: ContentManager;
  private historyManager: HistoryManager;
  private toolbarManager: ToolbarManager;

  // Feature modules
  private formattingFeature: FormattingFeature;
  private codeBlockFeature: CodeBlockFeature;
  private linkFeature: LinkFeature;
  private tableFeature: TableFeature;
  private youtubeFeature: YouTubeFeature;
  private imageFeature?: ImageFeature;
  private fileFeature?: FileFeature;
  private mentionsFeature?: MentionsFeature;
  private slashCommandFeature?: SlashCommandFeature;
  private findReplaceFeature?: FindReplaceFeature;
  private wordCountFeature?: WordCountFeature;
  private fullscreenFeature?: FullscreenFeature;
  private markdownShortcutsFeature?: MarkdownShortcutsFeature;
  private emojiFeature?: EmojiFeature;

  // Plugin manager
  private pluginManager: PluginManager;

  // State
  private isSourceMode = false;
  private sourceTextarea: HTMLTextAreaElement | null = null;
  private isReadOnly = false;
  private destroyed = false;

  // Backward compat: toolbar index for inline toolbar IDs
  private toolbarIndex = 0;

  /**
   * Create a new RayEditor instance.
   * @param containerId - ID of the container element, or ID of content element when contentId is used
   * @param options - Editor options
   * @param contentId - (Optional) ID of existing content element to convert
   */
  constructor(
    containerId: string,
    options: RayEditorOptions = {},
    contentId: string | null = null
  ) {
    this.options = this.normalizeOptions(options, contentId);

    // Resolve container and editor area
    if (contentId) {
      const contentEl = document.getElementById(contentId);
      if (!contentEl) throw new Error(`Content element "${contentId}" not found.`);
      this.container = contentEl.parentElement!;
    } else {
      const containerEl = document.getElementById(containerId);
      if (!containerEl) throw new Error(`Container element "${containerId}" not found.`);
      this.container = containerEl;
    }

    // Build wrapper > toolbar + editorArea
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'ray-editor-wrapper';
    this.container.appendChild(this.wrapper);

    this.toolbarElement = document.createElement('div');
    this.toolbarElement.className = 'ray-editor-toolbar';

    this.editorElement = this.buildEditorArea(containerId, contentId);
    this.wrapper.appendChild(this.toolbarElement);
    this.wrapper.appendChild(this.editorElement);

    // If contentId, move container children into wrapper
    if (!contentId) {
      // Remove wrapper from container temporarily, put back
      this.container.removeChild(this.wrapper);
      this.container.appendChild(this.wrapper);
    }

    // Init theme
    this.setTheme(this.options.theme === 'dark' ? 'dark' : 'light');
    if (this.options.theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      this.setTheme(mq.matches ? 'dark' : 'light');
      mq.addEventListener('change', e => this.setTheme(e.matches ? 'dark' : 'light'));
    }

    // Core modules
    this.eventBus = new EventBus();
    this.selectionManager = new SelectionManager();
    this.commandManager = new CommandManager(this.editorElement, this.eventBus);
    this.contentManager = new ContentManager(this.editorElement);
    this.historyManager = new HistoryManager(
      this.editorElement,
      this.options.historySize ?? 100
    );

    // Feature modules
    this.formattingFeature = new FormattingFeature(this.editorElement);
    this.codeBlockFeature = new CodeBlockFeature(this.editorElement);
    this.linkFeature = new LinkFeature(this.editorElement, this.selectionManager);
    this.tableFeature = new TableFeature(this.editorElement, this.selectionManager);
    this.youtubeFeature = new YouTubeFeature();

    // Optional features
    const imgOpts = this.resolveImageUploadOpts();
    if (imgOpts) {
      this.imageFeature = new ImageFeature(this.editorElement, imgOpts);
    }

    const fileOpts = this.resolveFileUploadOpts();
    if (fileOpts) {
      this.fileFeature = new FileFeature(this.editorElement, fileOpts);
    }

    const mentionOpts = this.resolveMentionOpts();
    if (mentionOpts?.enableMentions) {
      this.mentionsFeature = new MentionsFeature(this.editorElement, mentionOpts);
    }

    if (this.options.slashCommands !== false) {
      this.slashCommandFeature = new SlashCommandFeature(this.editorElement);
    }

    if (this.options.findReplace !== false) {
      this.findReplaceFeature = new FindReplaceFeature(this.editorElement);
    }

    if (this.options.wordCount) {
      this.wordCountFeature = new WordCountFeature(this.editorElement);
    }

    this.fullscreenFeature = new FullscreenFeature(this.wrapper);

    if (this.options.markdownShortcuts !== false) {
      this.markdownShortcutsFeature = new MarkdownShortcutsFeature(this.editorElement);
    }

    this.emojiFeature = new EmojiFeature(this.editorElement);

    // Toolbar
    this.toolbarManager = new ToolbarManager(
      this.toolbarElement,
      this.editorElement,
      this.options,
      (keyname: string) => this.dispatchCommand(keyname)
    );
    this.toolbarManager.build(this.options.toolbar ?? DEFAULT_TOOLBAR);

    // Plugin manager (after toolbar so plugins can add buttons)
    this.pluginManager = new PluginManager(this);

    // Register slash command defaults
    if (this.slashCommandFeature) {
      this.slashCommandFeature.registerDefaultCommands(this);
    }

    // Bind editor events
    this.bindEditorEvents();

    // Apply inline toolbar type
    this.applyToolbarType();

    // Auto-inject CSS
    if (this.options.initStyles) {
      this.injectCSS();
    }

    // Watermark — BUG FIX #1: nextSibling (was nextLastSibling)
    this.addWatermark();

    // Apply read-only if set
    if (this.options.readOnly) {
      this.setReadOnly(true);
    }

    // Install plugins from options
    this.options.plugins?.forEach(p => this.use(p));

    // Wire onChange callback
    if (this.options.onChange) {
      this.on('content:change', (data: unknown) => {
        const { html } = data as { html: string };
        this.options.onChange!(html);
      });
    }

    // Initial history entry
    this.historyManager.push(this.editorElement.innerHTML);

    // defaultParagraphSeparator
    document.execCommand('defaultParagraphSeparator', false, 'p');
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Get cleaned HTML content */
  getContent(): string {
    return this.contentManager.getContent();
  }

  /** Set HTML content */
  setContent(html: string): void {
    this.contentManager.setContent(html);
    this.historyManager.push(this.editorElement.innerHTML);
    this.eventBus.emit('content:change', { html: this.getContent() });
  }

  // Backward compatibility aliases
  getRayEditorContent(): string {
    return this.getContent();
  }

  setRayEditorContent(html: string): void {
    this.setContent(html);
  }

  /** Register a custom command */
  registerCommand(name: string, handler: CommandHandler): void {
    this.commandManager.register(name, handler);
  }

  /** Execute a command by name */
  execCommand(name: string, value?: string): void {
    this.commandManager.exec(name, value, this);
  }

  /** Add a toolbar button (from plugin) */
  addButton(config: ButtonConfig): void {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `ray-btn-${config.name}`;
    btn.className = `ray-btn ray-btn-${config.name}`;
    btn.innerHTML = config.icon;
    btn.title = config.tooltip ?? config.name;
    btn.setAttribute('data-tooltip', btn.title);
    btn.addEventListener('click', () => config.action(this));
    this.toolbarElement.appendChild(btn);
  }

  /** Remove a toolbar button */
  removeButton(name: string): void {
    document.getElementById(`ray-btn-${name}`)?.remove();
  }

  /** Register a slash command */
  registerSlashCommand(cmd: SlashCommandConfig): void {
    this.slashCommandFeature?.registerCommand(cmd);
  }

  /** Subscribe to an event */
  on(event: string, handler: EventHandler): void {
    this.eventBus.on(event, handler);
  }

  /** Unsubscribe from an event */
  off(event: string, handler: EventHandler): void {
    this.eventBus.off(event, handler);
  }

  /** Emit an event */
  emit(event: string, data?: unknown): void {
    this.eventBus.emit(event, data);
  }

  /** Also expose as addEventListener for backward compat */
  addEventListener(event: string, callback: EventListener): void {
    this.editorElement.addEventListener(event, callback);
  }

  /** Install a plugin */
  use(plugin: RayPlugin): this {
    this.pluginManager.use(plugin);
    return this;
  }

  /** Set read-only mode */
  setReadOnly(readOnly: boolean): void {
    this.isReadOnly = readOnly;
    this.editorElement.contentEditable = readOnly ? 'false' : 'true';
    this.toolbarElement.style.pointerEvents = readOnly ? 'none' : '';
    this.toolbarElement.style.opacity = readOnly ? '0.5' : '';
    this.eventBus.emit('readOnly:change', { readOnly });
  }

  /** Set theme */
  setTheme(theme: 'light' | 'dark'): void {
    this.wrapper?.setAttribute('data-ray-theme', theme);
    this.eventBus?.emit('theme:change', { theme });
  }

  /** Get word count */
  getWordCount(): { words: number; chars: number } {
    return this.wordCountFeature?.getWordCount() ?? { words: 0, chars: 0 };
  }

  /** Destroy the editor and clean up all resources */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.pluginManager.destroy();
    this.toolbarManager.destroy();
    this.slashCommandFeature?.destroy();
    this.findReplaceFeature?.destroy();
    this.wordCountFeature?.destroy();
    this.fullscreenFeature?.destroy();
    this.emojiFeature?.destroy();
    this.eventBus.destroy();

    this.wrapper.remove();
  }

  // ─── Private: Command Dispatch ─────────────────────────────────────────────

  private dispatchCommand(keyname: string): void {
    switch (keyname) {
      case 'bold':
      case 'italic':
      case 'underline':
      case 'strikethrough':
        document.execCommand(
          keyname === 'strikethrough' ? 'strikeThrough' : keyname,
          false
        );
        this.editorElement.focus();
        break;
      case 'superscript':
      case 'subscript':
      case 'undo':
      case 'redo':
      case 'indent':
      case 'outdent':
      case 'removeFormat':
        document.execCommand(keyname, false);
        this.editorElement.focus();
        break;
      case 'orderedList':
        document.execCommand('insertOrderedList', false);
        this.editorElement.focus();
        break;
      case 'unorderedList':
        document.execCommand('insertUnorderedList', false);
        this.editorElement.focus();
        break;
      case 'uppercase':
        this.formattingFeature.transformSelectedText('upper');
        break;
      case 'lowercase':
        this.formattingFeature.transformSelectedText('lower');
        break;
      case 'toggleCase':
        this.formattingFeature.toggleTextCase();
        break;
      case 'textColor':
        this.formattingFeature.applyTextColor();
        break;
      case 'backgroundColor':
        this.formattingFeature.applyBackgroundColor();
        break;
      case 'codeBlock':
        this.codeBlockFeature.insertCodeBlock();
        break;
      case 'codeInline':
        this.codeBlockFeature.insertInlineCode();
        break;
      case 'link':
        this.linkFeature.openLinkModal();
        break;
      case 'imageUpload':
        this.imageFeature?.triggerUpload();
        break;
      case 'fileUpload':
        this.fileFeature?.triggerUpload();
        break;
      case 'table':
        this.tableFeature.openTableModal();
        break;
      case 'hr':
        this.insertHr();
        break;
      case 'insertDateTime':
        this.insertDateTime();
        break;
      case 'showSource':
        this.toggleSourceMode();
        break;
      case 'fullscreen':
        this.fullscreenFeature?.toggle();
        break;
      case 'print':
        window.print();
        break;
      case 'emoji': {
        const emojiBtn = document.getElementById('ray-btn-emoji');
        this.emojiFeature?.toggle(emojiBtn ?? undefined);
        break;
      }
    }

    this.toolbarManager.updateActiveStates();
    this.historyManager.push(this.editorElement.innerHTML);
    this.eventBus.emit('content:change', { html: this.getContent() });
  }

  // ─── Private: Editor Event Binding ─────────────────────────────────────────

  private bindEditorEvents(): void {
    const events: string[] = ['keyup', 'mouseup', 'keydown', 'paste', 'click'];

    events.forEach(evt => {
      this.editorElement.addEventListener(evt, (e) => {
        const event = e as KeyboardEvent & MouseEvent & ClipboardEvent;
        const sel = window.getSelection();
        if (!sel?.rangeCount) return;

        const node = sel.anchorNode;
        const elementNode = node?.nodeType === Node.TEXT_NODE
          ? node.parentElement!
          : node as Element;

        if (!elementNode) return;

        if (evt === 'keyup' || evt === 'mouseup') {
          this.toolbarManager.updateActiveStates();
        }

        if (evt === 'keydown') {
          this.codeBlockFeature.handleCodeBlockExit(event as KeyboardEvent, elementNode);
          this.codeBlockFeature.handleInlineCodeExit(
            event as KeyboardEvent,
            sel,
            elementNode
          );

          // Custom undo/redo via history manager (Ctrl+Z / Ctrl+Y)
          const isMac = navigator.platform.toLowerCase().includes('mac');
          const ctrl = isMac ? event.metaKey : event.ctrlKey;
          if (ctrl && event.key === 'z' && !event.shiftKey) {
            event.preventDefault();
            this.historyManager.undo();
            return;
          }
          if (ctrl && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
            event.preventDefault();
            this.historyManager.redo();
            return;
          }

          // Tab → indent / Shift+Tab → outdent
          if (event.key === 'Tab') {
            event.preventDefault();
            document.execCommand(event.shiftKey ? 'outdent' : 'indent', false);
          }
        }

        if (evt === 'keyup') {
          this.mentionsFeature?.handleKeyUp(event as KeyboardEvent, elementNode);

          // Push to history on every word completion (space/enter)
          if (event.key === ' ' || event.key === 'Enter') {
            this.historyManager.push(this.editorElement.innerHTML);
            this.eventBus.emit('content:change', { html: this.getContent() });
          }
        }

        if (evt === 'paste') {
          this.youtubeFeature.handlePaste(event as ClipboardEvent);
          // Push to history after paste
          setTimeout(() => {
            this.historyManager.push(this.editorElement.innerHTML);
            this.eventBus.emit('content:change', { html: this.getContent() });
          }, 0);
        }

        if (evt === 'click') {
          const anchor = (event.target as HTMLElement).closest('a');
          if (anchor && this.editorElement.contains(anchor)) {
            event.preventDefault();
            this.linkFeature.showLinkPopup(anchor as HTMLAnchorElement);
          }

          // Handle slash command dispatch from code block / table / hr
          const slashTarget = event.target as HTMLElement;
          slashTarget.dispatchEvent;
        }

        if (evt === 'click' || evt === 'keyup') {
          // Remove table highlight if clicking outside table
          const table = (event.target as HTMLElement).closest('table');
          if (!table) {
            document.querySelectorAll('.ray-editor-table-highlighted').forEach(t => {
              t.classList.remove('ray-editor-table-highlighted');
            });
          }
        }
      });
    });

    // Listen for slash command events from code block / table / hr
    this.editorElement.addEventListener('ray:slash-command', (e: Event) => {
      const { command } = (e as CustomEvent).detail;
      this.dispatchCommand(command);
    });

    // Selection change
    document.addEventListener('selectionchange', () => {
      if (!this.editorElement.contains(document.activeElement)) return;
      this.eventBus.emit('selection:change', null);
    });

    // Focus/blur
    this.editorElement.addEventListener('focus', () => {
      this.eventBus.emit('focus', null);
    });
    this.editorElement.addEventListener('blur', () => {
      this.eventBus.emit('blur', null);
    });
  }

  // ─── Private: Feature Implementations ──────────────────────────────────────

  private insertHr(): void {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;

    const range = sel.getRangeAt(0);
    range.collapse(true);
    range.deleteContents();

    const hr = document.createElement('hr');
    hr.setAttribute('contenteditable', 'false');
    hr.className = 'ray-editor-hr';
    hr.style.cursor = 'pointer';
    hr.style.border = '1px solid #ccc';
    hr.style.margin = '1em 0';

    // BUG FIX #4: custom modal instead of confirm()
    hr.addEventListener('click', () => {
      this.showConfirmModal('Remove this horizontal rule?', () => hr.remove());
    });

    const paragraph = document.createElement('p');
    paragraph.innerHTML = '<br>';

    const frag = document.createDocumentFragment();
    frag.appendChild(hr);
    frag.appendChild(paragraph);
    range.insertNode(frag);

    const newRange = document.createRange();
    newRange.setStart(paragraph, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  private insertDateTime(): void {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;

    const range = sel.getRangeAt(0);
    range.deleteContents();

    const now = new Date();
    const formatted = now.toLocaleString();

    // BUG FIX #4: custom modal instead of confirm()
    this.showConfirmModal('Insert date/time on a new line?', (onNewLine) => {
      const dateEl = document.createElement(onNewLine ? 'div' : 'span');
      dateEl.textContent = formatted;
      dateEl.contentEditable = 'false';
      dateEl.className = 'ray-date-time';
      Object.assign(dateEl.style, {
        fontSize: '0.85em',
        color: '#666',
        margin: '0.5em 0',
        display: onNewLine ? 'block' : 'inline',
        userSelect: 'none',
        cursor: 'pointer',
      });
      dateEl.title = 'Click to remove date/time';

      // BUG FIX #5: custom modal for remove confirm
      dateEl.addEventListener('click', () => {
        this.showConfirmModal('Remove this date/time?', () => dateEl.remove());
      });

      const space = document.createTextNode('\u200B');
      const frag = document.createDocumentFragment();
      frag.appendChild(dateEl);
      frag.appendChild(space);
      range.insertNode(frag);

      const newRange = document.createRange();
      newRange.setStartAfter(space);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    });
  }

  private toggleSourceMode(): void {
    if (!this.editorElement) return;

    if (!this.isSourceMode) {
      this.sourceTextarea = document.createElement('textarea');
      this.sourceTextarea.className = 'ray-editor-sourcearea';
      this.sourceTextarea.style.width = '100%';
      this.sourceTextarea.style.height = this.editorElement.offsetHeight + 'px';
      this.sourceTextarea.style.minHeight = '200px';
      this.sourceTextarea.value = this.editorElement.innerHTML;
      this.editorElement.style.display = 'none';
      this.editorElement.parentNode?.insertBefore(
        this.sourceTextarea,
        this.editorElement
      );
      this.isSourceMode = true;
    } else {
      if (this.sourceTextarea) {
        this.editorElement.innerHTML = this.sourceTextarea.value;
        this.sourceTextarea.parentNode?.removeChild(this.sourceTextarea);
        this.sourceTextarea = null;
      }
      this.editorElement.style.display = '';
      this.isSourceMode = false;
    }
  }

  /**
   * BUG FIX #4 & #5: Custom modal to replace native confirm()/alert()
   */
  private showConfirmModal(
    message: string,
    onConfirm: (result?: any) => void,
    showCancel = true
  ): void {
    const overlay = document.createElement('div');
    overlay.className = 'ray-confirm-modal';

    const box = document.createElement('div');
    box.className = 'ray-confirm-box';
    box.innerHTML = `
      <p class="ray-confirm-message">${message}</p>
      <div class="ray-confirm-actions">
        <button class="ray-confirm-ok">OK</button>
        ${showCancel ? '<button class="ray-confirm-cancel">Cancel</button>' : ''}
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    box.querySelector('.ray-confirm-ok')!.addEventListener('click', () => {
      overlay.remove();
      onConfirm(true);
    });

    if (showCancel) {
      box.querySelector('.ray-confirm-cancel')!.addEventListener('click', () => {
        overlay.remove();
      });
    }
  }

  // ─── Private: Watermark ─────────────────────────────────────────────────────

  private addWatermark(): void {
    if (this.options.hideWatermark) return;

    const watermark = document.createElement('div');
    watermark.id = 'ray-editor-watermark';
    watermark.innerHTML = `Made with ❤️ by <a href="https://rohanyeole.com" target="_blank" rel="noopener">Rohan Yeole</a>`;

    // BUG FIX #1: was this.editorElement.nextLastSibling → nextSibling
    this.editorElement.parentNode?.insertBefore(
      watermark,
      this.editorElement.nextSibling
    );
  }

  // ─── Private: CSS ───────────────────────────────────────────────────────────

  private injectCSS(): void {
    if (document.querySelector('.ray-editor-styles')) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.className = 'ray-editor-styles';
    link.href =
      this.options.stylesheetUrl ||
      'https://cdn.jsdelivr.net/npm/ray-editor@2/dist/ray-editor.css';
    document.head.appendChild(link);
  }

  // ─── Private: Toolbar Type ──────────────────────────────────────────────────

  private applyToolbarType(): void {
    if (!this.options.toolbarType || this.options.toolbarType === 'default') return;

    this.toolbarElement.classList.add(
      `ray-editor-toolbar-${this.options.toolbarType}`
    );
    this.toolbarElement.id = `ray-editor-toolbar-${this.toolbarIndex++}`;

    if (this.options.toolbarType === 'inline') {
      this.toolbarElement.style.display = 'none';

      this.editorElement.addEventListener('focus', () => {
        this.toolbarElement.style.display = 'flex';
      });

      const maybeHide = (e: FocusEvent) => {
        const next = e.relatedTarget as Node;
        if (
          !this.editorElement.contains(next) &&
          !this.toolbarElement.contains(next)
        ) {
          this.toolbarElement.style.display = 'none';
        }
      };

      this.editorElement.addEventListener('blur', maybeHide, true);
      this.toolbarElement.addEventListener('blur', maybeHide, true);
      this.toolbarElement.tabIndex = -1;
    }
  }

  // ─── Private: Editor Area Builder ──────────────────────────────────────────

  private buildEditorArea(containerId: string, contentId: string | null): HTMLElement {
    const area = document.createElement('div');
    area.className = 'ray-editor-content';
    area.contentEditable = 'true';
    area.spellcheck = true;

    if (contentId) {
      const contentEl = document.getElementById(contentId);
      if (contentEl) {
        // Copy attributes
        for (const attr of Array.from(contentEl.attributes)) {
          if (attr.name === 'class') {
            area.className += ' ' + attr.value;
          } else if (attr.name !== 'id') {
            area.setAttribute(attr.name, attr.value);
          }
        }
        if (contentEl.id) area.id = contentEl.id;

        if (contentEl.tagName === 'TEXTAREA') {
          area.innerHTML = (contentEl as HTMLTextAreaElement).value || '<p><br></p>';
        } else {
          area.innerHTML = contentEl.innerHTML || '<p><br></p>';
        }
        contentEl.parentNode?.replaceChild(area, contentEl);
      }
    } else {
      area.innerHTML = '<p><br></p>';
    }

    return area;
  }

  // ─── Private: Options Normalization ────────────────────────────────────────

  /**
   * Normalize legacy v1 flat options into v2 format.
   * Preserves full backward compatibility.
   */
  private normalizeOptions(
    opts: RayEditorOptions,
    contentId: string | null
  ): RayEditorOptions {
    const normalized = { ...opts };

    // Normalize mentions (v1 flat → v2 nested)
    if (!normalized.mentions) {
      normalized.mentions = {
        enableMentions: opts.enableMentions ?? false,
        mentionTag: opts.mentionTag ?? '@',
        mentionElement: opts.mentionElement ?? 'span',
        mentionUrl: opts.mentionUrl ?? '',
      };
    }

    // Normalize imageUpload
    if (!normalized.imageUpload && opts.imageUploadUrl) {
      normalized.imageUpload = {
        imageUploadUrl: opts.imageUploadUrl,
        imageMaxSize: opts.imageMaxSize,
      };
    }

    // Normalize fileUpload
    if (!normalized.fileUpload && opts.fileUploadUrl) {
      normalized.fileUpload = {
        fileUploadUrl: opts.fileUploadUrl,
        fileMaxSize: opts.fileMaxSize,
      };
    }

    return normalized;
  }

  private resolveImageUploadOpts() {
    if (this.options.imageUpload) return this.options.imageUpload;
    if (this.options.imageUploadUrl) {
      return {
        imageUploadUrl: this.options.imageUploadUrl,
        imageMaxSize: this.options.imageMaxSize,
      };
    }
    return null;
  }

  private resolveFileUploadOpts() {
    if (this.options.fileUpload) return this.options.fileUpload;
    if (this.options.fileUploadUrl) {
      return {
        fileUploadUrl: this.options.fileUploadUrl,
        fileMaxSize: this.options.fileMaxSize,
      };
    }
    return null;
  }

  private resolveMentionOpts() {
    return this.options.mentions ?? null;
  }
}
