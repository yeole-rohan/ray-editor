import type { EventHandler } from '../types/plugin';

/**
 * Internal event bus for the editor.
 * Supports multiple handlers per event and cancellable events.
 */
export class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, data?: unknown): boolean {
    const handlers = this.listeners.get(event);
    if (!handlers) return true;

    let cancelled = false;
    for (const handler of handlers) {
      const result = handler(data);
      if (result === false) {
        cancelled = true;
        break;
      }
    }
    return !cancelled;
  }

  destroy(): void {
    this.listeners.clear();
  }
}
