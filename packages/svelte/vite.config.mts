import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'RayEditorSvelte',
      fileName: (format) => (format === 'es' ? 'index.esm.js' : 'index.cjs.js'),
      formats: ['es', 'cjs'],
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
