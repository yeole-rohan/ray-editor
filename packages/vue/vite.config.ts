import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'RayEditorVue',
      fileName: (format) => (format === 'es' ? 'index.esm.js' : 'index.cjs.js'),
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['vue', '@rohanyeole/ray-editor'],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
