import { useI18n } from '../core/i18n';
import type { Language } from '../core/profile';

const OPTIONS: Array<{ lang: Language; label: 'lang.bm' | 'lang.en' }> = [
  { lang: 'bm', label: 'lang.bm' },
  { lang: 'en', label: 'lang.en' },
];

/** Visible on every screen, including onboarding. Each target is 44 px. */
export function LanguageToggle() {
  const { lang, setLanguage, t } = useI18n();
  return (
    <div className="lang-toggle" role="group" aria-label={t('lang.toggle')}>
      {OPTIONS.map((o) => (
        <button
          key={o.lang}
          type="button"
          className="tap"
          lang={o.lang === 'bm' ? 'ms' : 'en'}
          aria-pressed={lang === o.lang}
          onClick={() => setLanguage(o.lang)}
        >
          {t(o.label)}
        </button>
      ))}
    </div>
  );
}
