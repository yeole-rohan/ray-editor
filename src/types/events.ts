export type RayEditorEvent =
  | 'content:change'
  | 'selection:change'
  | 'focus'
  | 'blur'
  | 'command:before'
  | 'command:after'
  | 'plugin:install'
  | 'plugin:destroy'
  | 'theme:change'
  | 'readOnly:change';

export interface ContentChangeEvent {
  html: string;
}

export interface CommandEvent {
  command: string;
  value?: string;
  cancelled?: boolean;
}

export interface ThemeChangeEvent {
  theme: 'light' | 'dark';
}
