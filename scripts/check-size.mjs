// Fails the build if the initial JavaScript (entry chunk plus its static imports)
// is more than 200 KB gzipped. Run after `vite build`.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST = 'dist';
const LIMIT = 200 * 1024;

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="[^"]*?(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
if (refs.length === 0) {
  console.error('check-size: no entry scripts found in dist/index.html');
  process.exit(1);
}

const gz = (file) => gzipSync(readFileSync(join(DIST, file))).length;
const kb = (n) => (n / 1024).toFixed(1) + ' KB';

let total = 0;
for (const f of new Set(refs)) {
  const size = gz(f);
  total += size;
  console.log(`  initial ${f}: ${kb(size)} gzip`);
}
const initial = new Set(refs.map((r) => r.replace('assets/', '')));
const lazy = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.js') && !initial.has(f));
for (const f of lazy) console.log(`  lazy    assets/${f}: ${kb(gz('assets/' + f))} gzip`);

console.log(`Initial JS total: ${kb(total)} gzip (limit ${kb(LIMIT)}). Lazy chunks: ${lazy.length}.`);
if (total > LIMIT) {
  console.error('check-size: initial JavaScript is over the limit.');
  process.exit(1);
}
if (lazy.length === 0) {
  console.error('check-size: no lazy chunks found. Exam and pathway content should load on demand.');
  process.exit(1);
}
