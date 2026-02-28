import type { CommandHandler } from '../types/plugin';
import type { EventBus } from './events';

/**
 * Command registry and execution engine.
 * Wraps document.execCommand and supports custom commands.
 */
export class CommandManager {
  private commands: Map<string, CommandHandler> = new Map();
  private editorArea: HTMLElement;
  private eventBus: EventBus;

  constructor(editorArea: HTMLElement, eventBus: EventBus) {
    this.editorArea = editorArea;
    this.eventBus = eventBus;
  }

  register(name: string, handler: CommandHandler): void {
    this.commands.set(name, handler);
  }

  exec(command: string, value?: string, editorInstance?: any): void {
    // Fire before event (can cancel)
    const proceed = this.eventBus.emit('command:before', { command, value });
    if (!proceed) return;

    const customHandler = this.commands.get(command);
    if (customHandler) {
      customHandler(editorInstance, value);
    } else {
      // Native execCommand
      document.execCommand(command, false, value ?? undefined);
      this.editorArea.focus();
    }

    this.eventBus.emit('command:after', { command, value });
    this.eventBus.emit('content:change', { html: this.editorArea.innerHTML });
  }
}
