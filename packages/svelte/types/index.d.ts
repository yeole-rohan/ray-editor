import { SvelteComponent } from 'svelte';
import type { RayEditorOptions } from '@rohanyeole/ray-editor';

export interface RayEditorSvelteProps {
  value?: string;
  options?: RayEditorOptions;
  className?: string;
}

declare class RayEditor extends SvelteComponent<RayEditorSvelteProps> {
  getContent(): string;
  setContent(html: string): void;
}

export default RayEditor;
export { RayEditor };
