import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

const tsBase = { tsconfig: './tsconfig.json' };
const external = [/^react/, /^react-dom/, '@rohanyeole/ray-editor'];

export default defineConfig([
  {
    input: 'src/index.tsx',
    output: {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true,
    },
    external,
    plugins: [
      resolve(),
      typescript({ ...tsBase, declaration: true, declarationDir: 'dist', sourceMap: true }),
    ],
  },
  {
    input: 'src/index.tsx',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins: [
      resolve(),
      typescript({ ...tsBase, sourceMap: true }),
    ],
  },
]);
