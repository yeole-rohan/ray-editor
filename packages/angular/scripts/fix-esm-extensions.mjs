// ngc emits relative import specifiers without a file extension (e.g. `from './x'`),
// which Node's native ESM resolver rejects now that this package declares "type": "module".
// Bundlers (Angular CLI, webpack, esbuild) resolve extensionless specifiers fine on their own,
// so this only matters for native `node --input-type=module` / `import()` consumers.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const distDir = new URL('../dist', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

for (const file of readdirSync(distDir).filter((f) => f.endsWith('.js'))) {
  const filePath = join(distDir, file);
  const original = readFileSync(filePath, 'utf8');
  const fixed = original.replace(/from '(\.[^']+)'/g, (match, spec) =>
    spec.endsWith('.js') ? match : `from '${spec}.js'`
  );
  if (fixed !== original) writeFileSync(filePath, fixed);
}
