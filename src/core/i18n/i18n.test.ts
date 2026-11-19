import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fcCheapConfig } from '../../test/fcConfig';
import { stringsBm } from './strings.bm';
import { stringsEn } from './strings.en';
import { createT, detectDefaultLanguage, documentLang, getDisclaimer, pick, t, type StringKey } from './t';

const keys = Object.keys(stringsEn) as StringKey[];
const EM_DASH = '\u2014';
const PROPER_NOUNS = ['SPM', 'STPM', 'UPU', 'TVET', 'KSSM'];

describe('string tables', () => {
  it('BM has every EN key and no extras', () => {
    expect(Object.keys(stringsBm).sort()).toEqual([...keys].sort());
  });

  it('no value is empty', () => {
    for (const k of keys) {
      expect(stringsEn[k].trim(), `en ${k}`).not.toBe('');
      expect(stringsBm[k].trim(), `bm ${k}`).not.toBe('');
    }
  });

  it('has no em dash and no banned informal pronoun', () => {
    const word = ['k', 'a', 'u'].join('');
    const banned = new RegExp(`(?<![\\p{L}\\p{N}_])${word}(?![\\p{L}\\p{N}_])`, 'iu');
    for (const text of [...Object.values(stringsEn), ...Object.values(stringsBm)]) {
      expect(text.includes(EM_DASH)).toBe(false);
      expect(banned.test(text)).toBe(false);
    }
  });

  it('keeps SPM, STPM, UPU, TVET and KSSM literal in both languages', () => {
    for (const k of keys) {
      for (const noun of PROPER_NOUNS) {
        expect(stringsEn[k].includes(noun), `${k} ${noun}`).toBe(stringsBm[k].includes(noun));
      }
    }
  });

  it('has the disclaimer in both languages', () => {
    expect(getDisclaimer('en')).toContain('guidance only');
    expect(getDisclaimer('bm')).toContain('panduan sahaja');
    expect(getDisclaimer('bm')).toContain('UPU');
  });
});

describe('t()', () => {
  it('fills parameters', () => {
    expect(t('home.title', 'en', { name: 'Aina' })).toBe('Hi Aina! Pick where to start.');
    expect(t('home.title', 'bm', { name: 'Ravi' })).toBe('Hai Ravi! Nak mula dari mana?');
  });
});

describe('Property 38: fallback never returns empty or a raw key', () => {
  const arbMissing = fc.constantFrom<'present' | 'missing' | 'empty' | 'blank'>('present', 'missing', 'empty', 'blank');
  const arbKey = fc.stringMatching(/^[a-z]{1,6}\.[a-z]{1,8}$/);

  it('returns the other language when the selected value is missing or empty', () => {
    fc.assert(
      fc.property(
        arbKey,
        fc.string({ minLength: 1 }).filter((s) => s.trim() !== '' && !s.includes('{')),
        arbMissing,
        fc.constantFrom('bm' as const, 'en' as const),
        (key, other, pattern, lang) => {
          const selectedValue =
            pattern === 'present' ? 'selected text' : pattern === 'missing' ? undefined : pattern === 'empty' ? '' : '   ';
          const tables = {
            bm: lang === 'bm' ? (selectedValue === undefined ? {} : { [key]: selectedValue }) : { [key]: other },
            en: lang === 'en' ? (selectedValue === undefined ? {} : { [key]: selectedValue }) : { [key]: other },
          };
          const out = createT(tables)(key, lang);
          expect(out.trim()).not.toBe('');
          expect(out).not.toBe(key);
          expect(out).toBe(pattern === 'present' ? 'selected text' : other);
        },
      ),
      fcCheapConfig,
    );
  });

  it('still returns non-empty text when both languages are missing', () => {
    expect(createT({ bm: {}, en: {} })('x.y', 'bm')).not.toBe('x.y');
  });

  it('pick() falls back the same way', () => {
    expect(pick({ bm: '', en: 'Hello' }, 'bm')).toBe('Hello');
    expect(pick({ bm: 'Hai', en: ' ' }, 'en')).toBe('Hai');
  });

  it('every real key resolves to non-empty text in both languages', () => {
    for (const k of keys) {
      expect(t(k, 'bm').trim()).not.toBe('');
      expect(t(k, 'en')).not.toBe(k);
    }
  });
});

describe('Property 39: default language detection', () => {
  const arbTag = fc.oneof(
    fc.constantFrom('ms', 'ms-MY', 'en', 'en-GB', 'en-US', 'MS', 'EN-us'),
    fc.constantFrom('zh-CN', 'ta', 'fr', 'ja-JP', 'de'),
  );

  it('follows the first supported tag, and defaults to bm', () => {
    fc.assert(
      fc.property(fc.array(arbTag, { maxLength: 6 }), (tags) => {
        const first = tags.find((x) => /^(ms|en)/i.test(x));
        const expected = first === undefined ? 'bm' : /^ms/i.test(first) ? 'bm' : 'en';
        const result = detectDefaultLanguage(tags);
        expect(result).toBe(expected);
        expect(['bm', 'en']).toContain(result);
      }),
      fcCheapConfig,
    );
  });

  it('maps to document language codes', () => {
    expect(documentLang('bm')).toBe('ms');
    expect(documentLang('en')).toBe('en');
  });
});
