import type { Bilingual, Language } from '../profile/types';
import { stringsEn } from './strings.en';
import { stringsBm } from './strings.bm';

export type StringKey = keyof typeof stringsEn;
export type StringTable = Partial<Record<string, string>>;
export type Params = Record<string, string | number>;

const LAST_RESORT = stringsEn['app.name'];

function usable(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function fill(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const v = params[name];
    return v === undefined ? whole : String(v);
  });
}

/** Build a translator over two tables. Used by tests with sparse tables. */
export function createT(tables: Record<Language, StringTable>) {
  return function translate(key: string, lang: Language, params?: Params): string {
    const other: Language = lang === 'bm' ? 'en' : 'bm';
    const chosen = tables[lang][key];
    if (usable(chosen)) return fill(chosen, params);
    const fallback = tables[other][key];
    if (usable(fallback)) return fill(fallback, params);
    return LAST_RESORT;
  };
}

const translate = createT({ en: stringsEn, bm: stringsBm });

/** Translate a key. Falls back to the other language, never returns a raw key. */
export function t(key: StringKey, lang: Language, params?: Params): string {
  return translate(key, lang, params);
}

/** Pick the right side of bilingual content, falling back to the other side. */
export function pick(content: Bilingual, lang: Language): string {
  const other: Language = lang === 'bm' ? 'en' : 'bm';
  if (usable(content[lang])) return content[lang];
  if (usable(content[other])) return content[other];
  return LAST_RESORT;
}

export function getDisclaimer(lang: Language): string {
  return t('disclaimer', lang);
}

/** First supported tag wins. Neither supported means BM. */
export function detectDefaultLanguage(navLanguages: readonly string[]): Language {
  for (const tag of navLanguages) {
    const lower = tag.trim().toLowerCase();
    if (lower.startsWith('ms')) return 'bm';
    if (lower.startsWith('en')) return 'en';
  }
  return 'bm';
}

export function documentLang(lang: Language): 'ms' | 'en' {
  return lang === 'bm' ? 'ms' : 'en';
}
