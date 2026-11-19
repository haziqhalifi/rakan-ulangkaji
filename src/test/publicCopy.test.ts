import { describe, expect, it } from 'vitest';

// Scans public copy for rules in the copy-and-tone and content-integrity steering.
const modules = import.meta.glob(
  [
    '../../README.md',
    '../../docs/**/*.md',
    '../content/**/*.ts',
    '../core/i18n/**/*.ts',
    '!../**/*.test.ts',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const EM_DASH = '\u2014';
const KAU = /(?<![\p{L}\p{N}_])kau(?![\p{L}\p{N}_])/iu;
const FORBIDDEN = /you are eligible|you will get in|awak layak|anda layak|pasti (diterima|dapat)|akan diterima/i;

const entries = Object.entries(modules);
const offenders = (test: (text: string) => boolean) =>
  entries.filter(([, text]) => test(text)).map(([name]) => name);

describe('public copy scan', () => {
  it('finds files to scan', () => {
    expect(entries.length).toBeGreaterThan(5);
  });

  it('has no em dash', () => {
    expect(offenders((t) => t.includes(EM_DASH))).toEqual([]);
  });

  it('never uses the banned BM pronoun', () => {
    expect(offenders((t) => KAU.test(t))).toEqual([]);
  });

  it('has no promise-style eligibility phrases', () => {
    expect(offenders((t) => FORBIDDEN.test(t))).toEqual([]);
  });
});
