import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import resolve from '@rollup/plugin-node-resolve';

const banner = `/*!
 * RayEditor v2.0.0
 * https://github.com/yeole-rohan/ray-editor
 * MIT License - © Rohan Yeole
 */`;

export default defineConfig([
  // ESM build (tree-shakeable, for bundlers)
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/ray-editor.esm.js',
        format: 'es',
        banner,
        sourcemap: true,
      },
      {
        file: 'dist/ray-editor.esm.min.js',
        format: 'es',
        banner,
        sourcemap: false,
        plugins: [terser()],
      },
    ],
    plugins: [
      resolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
      }),
      postcss({
        extract: 'ray-editor.css',
        minimize: false,
      }),
    ],
  },
  // CJS build (Node, legacy bundlers)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/ray-editor.cjs.js',
      format: 'cjs',
      banner,
      sourcemap: true,
      exports: 'named',
    },
    plugins: [
      resolve(),
      typescript({ tsconfig: './tsconfig.json' }),
      postcss({ extract: false }),
    ],
  },
  // UMD build (CDN <script> tag)
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/ray-editor.umd.js',
        format: 'umd',
        name: 'RayEditor',
        banner,
        sourcemap: true,
        exports: 'named',
      },
      {
        file: 'dist/ray-editor.umd.min.js',
        format: 'umd',
        name: 'RayEditor',
        banner,
        sourcemap: false,
        plugins: [terser()],
        exports: 'named',
      },
    ],
    plugins: [
      resolve(),
      typescript({ tsconfig: './tsconfig.json' }),
      postcss({ extract: false }),
    ],
  },
  // Dark theme CSS
  {
    input: 'src/themes/dark.css',
    output: {
      file: 'dist/ray-editor.dark.css',
    },
    plugins: [
      postcss({
        extract: true,
        minimize: false,
      }),
    ],
  },
]);
