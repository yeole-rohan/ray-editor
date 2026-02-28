import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginManager } from '../src/plugins/plugin-manager';
import type { RayEditorInstance, RayPlugin } from '../src/types/plugin';

// Minimal mock of the editor instance
function createMockEditor(): RayEditorInstance {
  const handlers = new Map<string, Set<(data?: unknown) => void>>();

  return {
    getContent: vi.fn().mockReturnValue('<p>Hello</p>'),
    setContent: vi.fn(),
    registerCommand: vi.fn(),
    execCommand: vi.fn(),
    addButton: vi.fn(),
    removeButton: vi.fn(),
    registerSlashCommand: vi.fn(),
    on: vi.fn().mockImplementation((event: string, handler: any) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
    }),
    off: vi.fn(),
    emit: vi.fn().mockImplementation((event: string, data?: unknown) => {
      handlers.get(event)?.forEach(h => h(data));
    }),
    destroy: vi.fn(),
    setReadOnly: vi.fn(),
    setTheme: vi.fn(),
    editorElement: document.createElement('div'),
    toolbarElement: document.createElement('div'),
  };
}

describe('PluginManager', () => {
  let editor: RayEditorInstance;
  let pluginManager: PluginManager;

  beforeEach(() => {
    editor = createMockEditor();
    pluginManager = new PluginManager(editor);
  });

  it('installs a plugin and calls install()', () => {
    const installFn = vi.fn();
    const plugin: RayPlugin = { name: 'test-plugin', install: installFn };

    pluginManager.use(plugin);

    expect(installFn).toHaveBeenCalledWith(editor);
    expect(pluginManager.has('test-plugin')).toBe(true);
  });

  it('emits plugin:install event when plugin is installed', () => {
    const plugin: RayPlugin = {
      name: 'my-plugin',
      install: vi.fn(),
    };

    pluginManager.use(plugin);

    expect(editor.emit).toHaveBeenCalledWith('plugin:install', { name: 'my-plugin' });
  });

  it('does not install the same plugin twice', () => {
    const installFn = vi.fn();
    const plugin: RayPlugin = { name: 'dup-plugin', install: installFn };

    pluginManager.use(plugin);
    pluginManager.use(plugin);

    expect(installFn).toHaveBeenCalledTimes(1);
  });

  it('calls plugin.destroy() on manager destroy()', () => {
    const destroyFn = vi.fn();
    const plugin: RayPlugin = {
      name: 'destroy-test',
      install: vi.fn(),
      destroy: destroyFn,
    };

    pluginManager.use(plugin);
    pluginManager.destroy();

    expect(destroyFn).toHaveBeenCalled();
    expect(pluginManager.has('destroy-test')).toBe(false);
  });

  it('emits plugin:destroy event on destroy()', () => {
    const plugin: RayPlugin = {
      name: 'ev-plugin',
      install: vi.fn(),
      destroy: vi.fn(),
    };

    pluginManager.use(plugin);
    pluginManager.destroy();

    expect(editor.emit).toHaveBeenCalledWith('plugin:destroy', { name: 'ev-plugin' });
  });

  it('get() returns installed plugin', () => {
    const plugin: RayPlugin = { name: 'get-test', install: vi.fn() };
    pluginManager.use(plugin);
    expect(pluginManager.get('get-test')).toBe(plugin);
  });

  it('get() returns undefined for unknown plugin', () => {
    expect(pluginManager.get('unknown')).toBeUndefined();
  });
});
