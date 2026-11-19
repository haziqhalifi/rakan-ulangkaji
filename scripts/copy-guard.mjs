#!/usr/bin/env node
// Copy guard: fails if a file contains an em dash (U+2014) or the banned
// informal BM pronoun as a standalone word (see .kiro/steering/copy-and-tone.md).
// Usage: node scripts/copy-guard.mjs [path ...]   (files or directories)
// With no arguments it reads a Kiro hook JSON from STDIN to get the saved file path.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const EM_DASH = '\u2014';
const BANNED_WORD = /(?<![\p{L}\p{N}_])kau(?![\p{L}\p{N}_])/iu;
const EXCLUDED = ['.kiro/steering/copy-and-tone.md'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.wrangler']);
const TEXT_EXT = /\.(md|txt|json|ts|tsx|js|mjs|css|html|yml|yaml)$/i;
const root = process.cwd();

const isExcluded = (file) =>
  EXCLUDED.includes(relative(root, resolve(file)).split(sep).join('/'));

function* walk(path) {
  const st = statSync(path);
  if (st.isDirectory()) {
    for (const name of readdirSync(path)) {
      if (!SKIP_DIRS.has(name)) yield* walk(join(path, name));
    }
  } else if (TEXT_EXT.test(path)) {
    yield path;
  }
}

function check(file) {
  const problems = [];
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((line, i) => {
      if (line.includes(EM_DASH)) {
        problems.push(`${file}:${i + 1}: em dash found. Use a period, comma, or colon.`);
      }
      if (BANNED_WORD.test(line)) {
        problems.push(`${file}:${i + 1}: banned informal BM pronoun. Use "awak" or "korang".`);
      }
    });
  return problems;
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

function pathFromHook(raw) {
  if (!raw.trim()) return [];
  try {
    const j = JSON.parse(raw);
    const p =
      j.file_path ?? j.filePath ?? j.path ?? j.tool_input?.file_path ??
      j.tool_input?.path ?? j.tool_input?.filePath ?? j.event?.file_path;
    return typeof p === 'string' ? [p] : [];
  } catch {
    return [];
  }
}

let targets = process.argv.slice(2);
if (targets.length === 0) targets = pathFromHook(await readStdin());
if (targets.length === 0) {
  console.error('copy-guard: no file path given (argument or hook JSON on STDIN).');
  process.exit(0);
}

const problems = [];
let scanned = 0;
for (const t of targets) {
  if (!existsSync(t)) continue;
  for (const file of walk(t)) {
    if (isExcluded(file)) continue;
    scanned++;
    problems.push(...check(file));
  }
}

if (problems.length > 0) {
  console.error('copy-guard FAILED:\n' + problems.join('\n'));
  process.exit(1);
}
console.log(`copy-guard OK (${scanned} file${scanned === 1 ? '' : 's'} checked)`);
