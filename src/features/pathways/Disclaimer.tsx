import { getDisclaimer } from '../../core/i18n';
import { useI18n } from '../../core/i18n';

/** The full guidance-only notice. Falls back to the other language if the text is missing. */
export function Disclaimer() {
  const { lang, t } = useI18n();
  return (
    <aside className="board-disclaimer" role="note" aria-label={t('board.disclaimer.label')}>
      <p>{getDisclaimer(lang)}</p>
    </aside>
  );
}
