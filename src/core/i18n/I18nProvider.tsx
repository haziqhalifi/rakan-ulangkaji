import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { Bilingual, Language } from '../profile/types';
import { documentLang, pick, t, type Params, type StringKey } from './t';

export interface I18nValue {
  lang: Language;
  setLanguage: (lang: Language) => void;
  t: (key: StringKey, params?: Params) => string;
  pick: (content: Bilingual) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider(props: {
  language: Language;
  setLanguage: (lang: Language) => void;
  children: ReactNode;
}) {
  const { language, setLanguage, children } = props;

  useEffect(() => {
    document.documentElement.lang = documentLang(language);
  }, [language]);

  const value = useMemo<I18nValue>(
    () => ({
      lang: language,
      setLanguage,
      t: (key, params) => t(key, language, params),
      pick: (content) => pick(content, language),
    }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
