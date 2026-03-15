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
import { applySanitizedHTML, sanitizeUrl } from './core/sanitize';
import { normalizePastedHTML } from './core/paste-normalizer';
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
import { MarkdownFeature } from './features/markdown';
import { TaskListFeature } from './features/tasklist';
import { CalloutFeature } from './features/callout';
import { SpecialCharsFeature } from './features/special-chars';

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
  private markdownFeature!: MarkdownFeature;
  private taskListFeature!: TaskListFeature;
  private calloutFeature!: CalloutFeature;
  private specialCharsFeature!: SpecialCharsFeature;

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
    this.markdownFeature = new MarkdownFeature(this.editorElement, this.wrapper, this.toolbarElement);

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

    this.fullscreenFeature = new FullscreenFeature(this.wrapper, this.toolbarElement);

    if (this.options.markdownShortcuts !== false) {
      this.markdownShortcutsFeature = new MarkdownShortcutsFeature(this.editorElement);
    }

    this.emojiFeature = new EmojiFeature(this.editorElement);
    this.taskListFeature = new TaskListFeature(this.editorElement);
    this.calloutFeature = new CalloutFeature(this.editorElement);
    this.specialCharsFeature = new SpecialCharsFeature();

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

    // ARIA on editor element
    this.editorElement.setAttribute('role', 'textbox');
    this.editorElement.setAttribute('aria-multiline', 'true');
    this.editorElement.setAttribute('aria-label', 'Rich text editor');
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Get cleaned HTML content (works in both rich text and markdown mode) */
  getContent(): string {
    const mdHtml = this.markdownFeature?.getContentHtml();
    if (mdHtml !== null && mdHtml !== undefined) return mdHtml;
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
    btn.className = `ray-btn ray-btn-${config.name}`;
    applySanitizedHTML(btn, config.icon);
    btn.title = config.tooltip ?? config.name;
    btn.setAttribute('data-tooltip', btn.title);
    btn.addEventListener('click', () => config.action(this));
    this.toolbarElement.appendChild(btn);
  }

  /** Remove a toolbar button */
  removeButton(name: string): void {
    this.toolbarElement.querySelector(`.ray-btn-${name}`)?.remove();
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

  /** Download the editor content as an HTML file */
  exportHtml(filename = 'document.html'): void {
    const html = `<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"><title>Document</title></head>\n<body>\n${this.getContent()}\n</body>\n</html>`;
    this._downloadBlob(html, filename, 'text/html');
  }

  /** Download the editor content as a plain-text file */
  exportText(filename = 'document.txt'): void {
    const div = document.createElement('div');
    div.innerHTML = this.getContent();
    this._downloadBlob(div.textContent ?? '', filename, 'text/plain');
  }

  private _downloadBlob(content: string, filename: string, type: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
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
    this.markdownFeature?.destroy();
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
      case 'textColor': {
        const tcBtn = this.toolbarElement.querySelector<HTMLElement>('.ray-btn-textColor');
        if (tcBtn) this.formattingFeature.showTextColorPicker(tcBtn);
        break;
      }
      case 'backgroundColor': {
        const bgBtn = this.toolbarElement.querySelector<HTMLElement>('.ray-btn-backgroundColor');
        if (bgBtn) this.formattingFeature.showBackgroundColorPicker(bgBtn);
        break;
      }
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
      case 'table': {
        const tableBtn = this.toolbarElement.querySelector<HTMLElement>('.ray-btn-table');
        if (tableBtn) this.tableFeature.showTablePicker(tableBtn);
        break;
      }
      case 'hr':
        this.insertHr();
        break;
      case 'insertDateTime':
        this.insertDateTime();
        break;
      case 'markdownToggle':
        this.markdownFeature.toggle();
        if (!this.markdownFeature.isMarkdownMode && this.markdownFeature._pendingHtml !== null) {
          this.setContent(this.markdownFeature._pendingHtml);
          this.markdownFeature._pendingHtml = null;
        }
        return; // skip history push — markdown mode manages its own state
      case 'importMarkdown':
        this.markdownFeature.importFile((html) => {
          this.setContent(html);
          this.historyManager.push(this.editorElement.innerHTML);
          this.eventBus.emit('content:change', { html: this.getContent() });
        });
        return;
      case 'exportMarkdown':
        this.markdownFeature.exportFile(this.getContent());
        return;
      case 'showSource':
        this.toggleSourceMode();
        break;
      case 'fullscreen':
        this.fullscreenFeature?.toggle();
        break;
      case 'print':
        this.wrapper?.setAttribute('data-ray-print-target', '');
        document.body.setAttribute('data-ray-printing', '');
        window.addEventListener('afterprint', () => {
          this.wrapper?.removeAttribute('data-ray-print-target');
          document.body.removeAttribute('data-ray-printing');
        }, { once: true });
        window.print();
        break;
      case 'emoji': {
        const emojiBtn = this.toolbarElement.querySelector<HTMLElement>('.ray-btn-emoji');
        this.emojiFeature?.toggle(emojiBtn ?? undefined);
        break;
      }
      case 'highlight': {
        // Toggle yellow highlight using backColor. If already highlighted, remove it.
        const sel = window.getSelection();
        if (sel && sel.rangeCount && !sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          const ancestor = range.commonAncestorContainer;
          const el = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : ancestor as HTMLElement;
          const inMark = el?.closest('mark');
          if (inMark) {
            // Unwrap the mark
            const parent = inMark.parentNode!;
            while (inMark.firstChild) parent.insertBefore(inMark.firstChild, inMark);
            parent.removeChild(inMark);
          } else {
            document.execCommand('insertHTML', false,
              `<mark>${sel.toString()}</mark>`);
          }
        }
        this.editorElement.focus();
        break;
      }
      case 'taskList':
        this.taskListFeature.insertTaskList();
        break;
      case 'callout': {
        const calloutBtn = this.toolbarElement.querySelector<HTMLElement>('.ray-btn-callout');
        if (calloutBtn) this.calloutFeature.showPicker(calloutBtn);
        break;
      }
      case 'specialChars': {
        const scBtn = this.toolbarElement.querySelector<HTMLElement>('.ray-btn-specialChars');
        if (scBtn) this.specialCharsFeature.toggle(scBtn);
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
          this.tableFeature.handleKeydown(event as KeyboardEvent);

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

          // Tab → indent / Shift+Tab → outdent (skip inside table cells — handled by tableFeature)
          if (event.key === 'Tab' && !elementNode.closest('td, th')) {
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
          const pasteEvt = event as ClipboardEvent;

          // 1. Let specialised handlers run first (code blocks, YouTube URLs).
          //    Both call e.preventDefault() themselves when they intercept.
          if (this.codeBlockFeature.handlePaste(pasteEvt)) {
            setTimeout(() => {
              this.historyManager.push(this.editorElement.innerHTML);
              this.eventBus.emit('content:change', { html: this.getContent() });
            }, 0);
            return;
          }
          this.youtubeFeature.handlePaste(pasteEvt);
          if (pasteEvt.defaultPrevented) {
            setTimeout(() => {
              this.historyManager.push(this.editorElement.innerHTML);
              this.eventBus.emit('content:change', { html: this.getContent() });
            }, 0);
            return;
          }

          // 2. General HTML paste — normalize then insert via DOM (preserves listeners)
          const clipHtml = pasteEvt.clipboardData?.getData('text/html') ?? '';
          const clipText = pasteEvt.clipboardData?.getData('text/plain') ?? '';

          if (clipHtml) {
            pasteEvt.preventDefault();
            const normalizedHtml = normalizePastedHTML(clipHtml);
            // Apply RayEditor structure (code blocks, table wrappers, task lists)
            const temp = document.createElement('div');
            temp.innerHTML = normalizedHtml;
            this.contentManager.applyStructure(temp);

            const sel = window.getSelection();
            if (sel?.rangeCount) {
              const range = sel.getRangeAt(0);
              range.deleteContents();
              const frag = document.createDocumentFragment();
              while (temp.firstChild) frag.appendChild(temp.firstChild);
              range.insertNode(frag);
              sel.collapseToEnd();
            }
          } else if (clipText) {
            // Plain text — browser default is fine (inserts as text)
          }

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
          this.tableFeature.repositionContextToolbar();
        }
      });
    });

    // Listen for slash command events from code block / table / hr
    this.editorElement.addEventListener('ray:slash-command', (e: Event) => {
      const { command } = (e as CustomEvent).detail;
      this.dispatchCommand(command);
    });

    // Selection change — also drives table context toolbar
    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;

      // Only handle selections inside this editor
      const anchorNode = sel.anchorNode;
      if (!this.editorElement.contains(anchorNode)) return;

      this.eventBus.emit('selection:change', null);

      const el = anchorNode?.nodeType === Node.TEXT_NODE
        ? (anchorNode as Text).parentElement
        : anchorNode as Element;
      const cell = el?.closest('td') ?? el?.closest('th');
      if (cell && this.editorElement.contains(cell)) {
        this.tableFeature.showContextToolbar(cell as HTMLTableCellElement);
      } else {
        this.tableFeature.hideContextToolbar();
      }
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
    const savedRange = sel.getRangeAt(0).cloneRange();

    // Auto-detect block vs inline: if cursor is in an empty paragraph, insert as block
    const anchorEl = savedRange.startContainer.nodeType === Node.TEXT_NODE
      ? (savedRange.startContainer as Text).parentElement
      : savedRange.startContainer as Element;
    const blockEl = anchorEl?.closest('p, h1, h2, h3, h4, h5, h6, div, li');
    const cursorInEmptyBlock = !!blockEl && !blockEl.textContent?.trim();

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const toDateVal = (d: Date) => d.toISOString().slice(0, 10);
    const toTimeVal = (d: Date) => d.toTimeString().slice(0, 5);

    // Build popup
    const popup = document.createElement('div');
    popup.className = 'ray-datetime-popup';

    // Quick-fill row
    const quickRow = document.createElement('div');
    quickRow.className = 'ray-dt-quick-row';

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.className = 'ray-dt-input';
    dateInput.value = toDateVal(now);

    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.className = 'ray-dt-input';
    timeInput.value = toTimeVal(now);

    const todayBtn = document.createElement('button');
    todayBtn.type = 'button';
    todayBtn.className = 'ray-dt-quick-btn';
    todayBtn.textContent = '📅 Today';
    todayBtn.onmousedown = (e) => { e.preventDefault(); dateInput.value = toDateVal(now); };

    const yestBtn = document.createElement('button');
    yestBtn.type = 'button';
    yestBtn.className = 'ray-dt-quick-btn';
    yestBtn.textContent = '📅 Yesterday';
    yestBtn.onmousedown = (e) => { e.preventDefault(); dateInput.value = toDateVal(yesterday); };

    quickRow.appendChild(todayBtn);
    quickRow.appendChild(yestBtn);

    // Date + Time inputs
    const inputRow = document.createElement('div');
    inputRow.className = 'ray-dt-input-row';
    inputRow.appendChild(dateInput);
    inputRow.appendChild(timeInput);

    // Mode selector
    const modeRow = document.createElement('div');
    modeRow.className = 'ray-dt-mode-row';

    const modes: Array<{ label: string; value: string }> = [
      { label: 'Date + Time', value: 'datetime' },
      { label: 'Date only', value: 'date' },
      { label: 'Time only', value: 'time' },
    ];
    let selectedMode = 'datetime';

    modes.forEach(m => {
      const lbl = document.createElement('label');
      lbl.className = 'ray-dt-mode-label';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'ray-dt-mode';
      radio.value = m.value;
      radio.checked = m.value === 'datetime';
      radio.onchange = () => { selectedMode = m.value; };
      lbl.appendChild(radio);
      lbl.append(' ' + m.label);
      modeRow.appendChild(lbl);
    });

    // Single Insert button — position auto-detected
    const actionRow = document.createElement('div');
    actionRow.className = 'ray-dt-action-row';

    const insertBtn = document.createElement('button');
    insertBtn.type = 'button';
    insertBtn.className = 'ray-dt-action-btn ray-dt-action-btn-primary';
    insertBtn.textContent = cursorInEmptyBlock ? 'Insert' : 'Insert inline';

    insertBtn.onmousedown = (e) => {
      e.preventDefault();
      const dv = dateInput.value;
      const tv = timeInput.value;
      let text = '';
      if (selectedMode === 'datetime') text = `${dv} ${tv}`;
      else if (selectedMode === 'date') text = dv;
      else text = tv;

      popup.remove();

      const sel2 = window.getSelection();
      sel2?.removeAllRanges();
      sel2?.addRange(savedRange);
      savedRange.deleteContents();

      // Always use <span> — <p> inside <p> is invalid HTML.
      // When cursor is in an empty block the span fills that line naturally.
      const dateEl = document.createElement('span');
      dateEl.textContent = text;
      dateEl.contentEditable = 'false';
      dateEl.className = 'ray-date-time';

      savedRange.insertNode(dateEl);

      // Place cursor directly after the span — no zero-width space needed
      const newRange = document.createRange();
      newRange.setStartAfter(dateEl);
      newRange.collapse(true);
      sel2?.removeAllRanges();
      sel2?.addRange(newRange);
    };

    actionRow.appendChild(insertBtn);

    popup.appendChild(quickRow);
    popup.appendChild(inputRow);
    popup.appendChild(modeRow);
    popup.appendChild(actionRow);
    document.body.appendChild(popup);

    // Position popup at cursor, fully within viewport
    const rng = savedRange.cloneRange();
    rng.collapse(true);
    const cursorRect = rng.getBoundingClientRect();
    const editorRect = this.editorElement.getBoundingClientRect();

    // Default: below cursor
    let top = cursorRect.bottom + window.scrollY + 6;
    // Clamp left: prefer cursor-aligned, but keep inside editor + viewport
    let left = Math.max(
      editorRect.left + window.scrollX,
      cursorRect.left + window.scrollX
    );

    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;

    requestAnimationFrame(() => {
      const pr = popup.getBoundingClientRect();

      // Right overflow: push left
      if (pr.right > window.innerWidth - 8) {
        left = window.innerWidth - pr.width - 8 + window.scrollX;
        popup.style.left = `${left}px`;
      }

      // Bottom overflow: flip above cursor
      if (pr.bottom > window.innerHeight - 8) {
        top = cursorRect.top + window.scrollY - pr.height - 6;
        popup.style.top = `${top}px`;
      }

      // Clamp left to at least 8px from viewport edge
      const finalLeft = parseFloat(popup.style.left) - window.scrollX;
      if (finalLeft < 8) {
        popup.style.left = `${8 + window.scrollX}px`;
      }
    });

    // Close on outside click
    setTimeout(() => {
      const onOutside = (e: MouseEvent) => {
        if (!popup.contains(e.target as Node)) {
          popup.remove();
          document.removeEventListener('mousedown', onOutside);
        }
      };
      document.addEventListener('mousedown', onOutside);
    }, 0);
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
        applySanitizedHTML(this.editorElement, this.sourceTextarea.value);
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
    const cdnFallback = 'https://cdn.jsdelivr.net/npm/ray-editor@2/dist/ray-editor.css';
    link.href = sanitizeUrl(this.options.stylesheetUrl || cdnFallback) || cdnFallback;
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
          // Sanitize textarea content before writing to innerHTML to prevent
          // script injection when initialising from an existing textarea element.
          applySanitizedHTML(
            area,
            (contentEl as HTMLTextAreaElement).value || '<p><br></p>'
          );
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
