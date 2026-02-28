// Main entry point
export { RayEditor } from './RayEditor';

// Types
export type {
  RayEditorOptions,
  ToolbarItem,
  ToolbarGroup,
  ImageUploadOptions,
  FileUploadOptions,
  MentionOptions,
} from './types/options';

export type {
  RayPlugin,
  RayEditorInstance,
  ButtonConfig,
  SlashCommandConfig,
  CommandHandler,
  EventHandler,
} from './types/plugin';

export type { RayEditorEvent } from './types/events';

// Default export (for CDN/UMD usage)
export { RayEditor as default } from './RayEditor';

// CSS import (processed by PostCSS in rollup)
import './styles/main.css';
