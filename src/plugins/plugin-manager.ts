import type { RayPlugin, RayEditorInstance } from '../types/plugin';

/**
 * Plugin registry and lifecycle manager.
 */
export class PluginManager {
  private plugins: Map<string, RayPlugin> = new Map();
  private editorInstance: RayEditorInstance;

  constructor(editorInstance: RayEditorInstance) {
    this.editorInstance = editorInstance;
  }

  use(plugin: RayPlugin): this {
    if (this.plugins.has(plugin.name)) {
      console.warn(`[RayEditor] Plugin "${plugin.name}" is already installed.`);
      return this;
    }

    try {
      plugin.install(this.editorInstance);
      this.plugins.set(plugin.name, plugin);
      this.editorInstance.emit('plugin:install', { name: plugin.name });
    } catch (err) {
      console.error(`[RayEditor] Failed to install plugin "${plugin.name}":`, err);
    }

    return this;
  }

  destroy(): void {
    this.plugins.forEach(plugin => {
      try {
        plugin.destroy?.();
        this.editorInstance.emit('plugin:destroy', { name: plugin.name });
      } catch (err) {
        console.error(`[RayEditor] Error destroying plugin "${plugin.name}":`, err);
      }
    });
    this.plugins.clear();
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  get(name: string): RayPlugin | undefined {
    return this.plugins.get(name);
  }
}
