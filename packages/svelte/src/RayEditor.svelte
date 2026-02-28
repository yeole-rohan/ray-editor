<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { RayEditorOptions } from 'ray-editor';

  /** Bound HTML content — use bind:value for two-way binding */
  export let value: string = '';

  /** RayEditor options */
  export let options: RayEditorOptions = {};

  /** Additional CSS class */
  export let className: string = '';

  let container: HTMLDivElement;
  let editor: import('ray-editor').RayEditor | null = null;
  let internalUpdate = false;

  onMount(async () => {
    const { RayEditor } = await import('ray-editor');

    const id = `ray-svelte-${Math.random().toString(36).slice(2)}`;
    container.id = id;

    editor = new RayEditor(id, {
      ...options,
      onChange: (html: string) => {
        internalUpdate = true;
        value = html;
        internalUpdate = false;
      },
    });

    if (value) editor.setContent(value);
  });

  // Sync external value changes → editor
  $: if (editor && !internalUpdate && value !== undefined) {
    const current = editor.getContent();
    if (current !== value) editor.setContent(value);
  }

  onDestroy(() => {
    editor?.destroy();
    editor = null;
  });

  export function getContent(): string {
    return editor?.getContent() ?? '';
  }

  export function setContent(html: string): void {
    editor?.setContent(html);
  }
</script>

<div bind:this={container} class={className} />
