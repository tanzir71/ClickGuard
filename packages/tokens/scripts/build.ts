import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokens } from '../src/tokens.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../dist');
const primitive = tokens.color as Record<string, string>;
const resolveValue = (value: string) =>
  value.replace(/^\{color\.(.+)\}$/, (_, key: string) => primitive[key] ?? value);
const groups = Object.entries(tokens).flatMap(([group, values]) =>
  Object.entries(values).map(([key, value]) => `  --cg-${group}-${key}: ${resolveValue(String(value))};`),
);
await mkdir(out, { recursive: true });
await writeFile(resolve(out, 'tokens.css'), `:root {\n${groups.join('\n')}\n}\n`, 'utf8');
await writeFile(resolve(out, 'tokens.json'), JSON.stringify(tokens, null, 2), 'utf8');
await writeFile(
  resolve(out, 'index.js'),
  `export const tokens = ${JSON.stringify(tokens, null, 2)};\n`,
  'utf8',
);
