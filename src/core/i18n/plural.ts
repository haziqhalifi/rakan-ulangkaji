import type { Language } from '../profile/types';

export interface PluralForms {
  one: string;
  other: string;
}

/** English separates 1 from everything else (0 and 2 are plural). BM does not inflect, so both forms match. */
export function pluralise(count: number, forms: PluralForms): string {
  return count === 1 ? forms.one : forms.other;
}

const MARK_UNIT: Record<Language, PluralForms> = {
  en: { one: 'mark', other: 'marks' },
  bm: { one: 'markah', other: 'markah' },
};

/** The unit word alone: "mark", "marks" or "markah". */
export function markUnit(count: number, lang: Language): string {
  return pluralise(count, MARK_UNIT[lang]);
}

/** A full mark count: "1 mark", "2 marks", "1 markah", "2 markah". */
export function formatMarks(count: number, lang: Language): string {
  return `${count} ${markUnit(count, lang)}`;
}
