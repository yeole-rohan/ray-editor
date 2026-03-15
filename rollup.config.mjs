import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import postcssImport from 'postcss-import';
import resolve from '@rollup/plugin-node-resolve';
import { createRequire } from 'module';

const { version } = createRequire(import.meta.url)('./package.json');

const banner = `/*!
 * RayEditor v${version}
 * https://github.com/yeole-rohan/ray-editor
 * MIT License - © Rohan Yeole
 */`;

const tsBase = { tsconfig: './tsconfig.json' };

export default defineConfig([
  // ESM build — with sourcemap
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/ray-editor.esm.js',
      format: 'es',
      banner,
      sourcemap: true,
    },
    plugins: [
      resolve(),
      typescript({ ...tsBase, declaration: true, declarationDir: 'dist', sourceMap: true, inlineSources: true }),
      postcss({ extract: 'ray-editor.css', minimize: false, plugins: [postcssImport()] }),
    ],
  },
  // ESM minified — no sourcemap
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/ray-editor.esm.min.js',
      format: 'es',
      banner,
      sourcemap: false,
    },
    plugins: [
      resolve(),
      typescript({ ...tsBase, sourceMap: false }),
      postcss({ extract: false }),
      terser(),
    ],
  },
  // CJS build
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
      typescript({ ...tsBase, sourceMap: true, inlineSources: true }),
      postcss({ extract: false }),
    ],
  },
  // UMD build — with sourcemap
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/ray-editor.umd.js',
      format: 'umd',
      name: 'RayEditor',
      banner,
      sourcemap: true,
      exports: 'named',
    },
    plugins: [
      resolve(),
      typescript({ ...tsBase, sourceMap: true, inlineSources: true }),
      postcss({ extract: false }),
    ],
  },
  // UMD minified — no sourcemap
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/ray-editor.umd.min.js',
      format: 'umd',
      name: 'RayEditor',
      banner,
      sourcemap: false,
      exports: 'named',
    },
    plugins: [
      resolve(),
      typescript({ ...tsBase, sourceMap: false }),
      postcss({ extract: false }),
      terser(),
    ],
  },
]);
