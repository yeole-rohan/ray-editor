export type CommandHandler = (editor: RayEditorInstance, value?: string) => void;
export type EventHandler = (data?: unknown) => boolean | void;

export interface ButtonConfig {
  name: string;
  icon: string;
  tooltip?: string;
  action: (editor: RayEditorInstance) => void;
  isActive?: (editor: RayEditorInstance) => boolean;
}

export interface SlashCommandConfig {
  name: string;
  icon: string;
  description?: string;
  action: (editor: RayEditorInstance) => void;
}

export interface RayEditorInstance {
  // Content
  getContent(): string;
  setContent(html: string): void;

  // Commands
  registerCommand(name: string, handler: CommandHandler): void;
  execCommand(name: string, value?: string): void;

  // Toolbar
  addButton(config: ButtonConfig): void;
  removeButton(name: string): void;

  // Slash commands
  registerSlashCommand(cmd: SlashCommandConfig): void;

  // Events
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  emit(event: string, data?: unknown): void;

  // DOM access
  readonly editorElement: HTMLElement;
  readonly toolbarElement: HTMLElement;

  // Lifecycle
  destroy(): void;
  setReadOnly(readOnly: boolean): void;
  setTheme(theme: 'light' | 'dark'): void;
}

export interface RayPlugin {
  name: string;
  version?: string;
  install(editor: RayEditorInstance): void;
  destroy?(): void;
}
