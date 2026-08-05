import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'RayEditorSvelte',
      fileName: () => 'index.esm.js',
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^svelte/, '@rohanyeole/ray-editor'],
      output: {
        exports: 'named',
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
