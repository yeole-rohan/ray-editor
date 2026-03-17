import type { RayPlugin } from './plugin';

// All available toolbar button/feature string keys
export type ToolbarItem =
  // Formatting
  | 'bold' | 'italic' | 'underline' | 'strikethrough'
  | 'superscript' | 'subscript'
  | 'uppercase' | 'lowercase' | 'toggleCase'
  | 'textColor' | 'backgroundColor'
  | 'fontSize' | 'fontFamily' | 'lineHeight'
  | 'removeFormat'
  // Structure
  | 'headings' | 'blockquote' | 'orderedList' | 'unorderedList'
  | 'indent' | 'outdent' | 'textAlignment' | 'hr'
  // Code
  | 'codeBlock' | 'codeInline'
  // Media & embeds
  | 'imageUpload' | 'fileUpload' | 'youtube' | 'emoji' | 'insertDateTime'
  // Links & tables
  | 'link' | 'table'
  // Mentions
  | 'mentions'
  // Markdown
  | 'markdownToggle' | 'importMarkdown' | 'exportMarkdown'
  // New features
  | 'highlight' | 'fontSize' | 'taskList' | 'callout' | 'specialChars'
  // Utility
  | 'undo' | 'redo' | 'showSource' | 'fullscreen' | 'print'
  | 'fonts' | 'overflowMenu' | 'wordCount';

// A toolbar group is an array of ToolbarItem keys (renders as a separated cluster)
export type ToolbarGroup = ToolbarItem[];

export interface ImageUploadOptions {
  /** Endpoint URL returning { url: string } */
  imageUploadUrl: string;
  /** Max file size in bytes, default 20MB */
  imageMaxSize?: number;
  /** File accept string, default 'image/*' */
  accept?: string;
}

export interface FileUploadOptions {
  /** Endpoint URL returning { url: string } */
  fileUploadUrl: string;
  /** Max file size in bytes, default 50MB */
  fileMaxSize?: number;
  /** File accept string */
  accept?: string;
}

export interface MentionOptions {
  /** Whether mentions are enabled */
  enableMentions?: boolean;
  /** Trigger character, default '@' */
  mentionTag?: string;
  /** Rendered element type */
  mentionElement?: 'span' | 'a';
  /** Base URL for <a href> links */
  mentionUrl?: string;
}

export interface RayEditorLocale {
  bold: string;
  italic: string;
  underline: string;
  strikethrough: string;
  [key: string]: string;
}

export interface RayEditorOptions {
  /**
   * Defines which buttons appear in the toolbar and their grouping.
   * Each sub-array is a visual group separated by a divider.
   * @default Full toolbar with all available buttons
   */
  toolbar?: ToolbarGroup[];

  // ─── Feature configs ────────────────────────────────────────────────────────

  imageUpload?: ImageUploadOptions;
  fileUpload?: FileUploadOptions;
  mentions?: MentionOptions;

  // Legacy flat options (v1 compat)
  imageUploadUrl?: string;
  imageMaxSize?: number;
  fileUploadUrl?: string;
  fileMaxSize?: number;
  enableMentions?: boolean;
  mentionTag?: string;
  mentionElement?: 'span' | 'a';
  mentionUrl?: string;

  // ─── UI / Behaviour ──────────────────────────────────────────────────────

  toolbarType?: 'default' | 'inline';
  overflowMenu?: boolean;
  readOnly?: boolean;
  markdownShortcuts?: boolean;
  wordCount?: boolean;
  findReplace?: boolean;
  slashCommands?: boolean;
  historySize?: number;

  // ─── Theming ─────────────────────────────────────────────────────────────

  theme?: 'light' | 'dark' | 'auto';
  initStyles?: boolean;
  stylesheetUrl?: string;

  // ─── Extensibility ───────────────────────────────────────────────────────

  plugins?: RayPlugin[];
  locale?: Partial<RayEditorLocale>;

  // ─── Callbacks ───────────────────────────────────────────────────────────

  onChange?: (html: string) => void;
}

export const DEFAULT_TOOLBAR: ToolbarGroup[] = [
  ['bold', 'italic', 'underline', 'strikethrough', 'highlight'],
  ['superscript', 'subscript'],
  ['uppercase', 'lowercase', 'toggleCase'],
  ['textColor', 'backgroundColor', 'fontSize'],
  ['fonts'],
  ['headings', 'blockquote', 'callout'],
  ['orderedList', 'unorderedList', 'taskList', 'indent', 'outdent'],
  ['textAlignment', 'hr'],
  ['codeBlock', 'codeInline'],
  ['link', 'imageUpload', 'fileUpload', 'table'],
  ['emoji', 'specialChars', 'insertDateTime'],
  ['markdownToggle', 'importMarkdown', 'exportMarkdown'],
  ['undo', 'redo', 'removeFormat'],
  ['showSource', 'fullscreen', 'print'],
];
