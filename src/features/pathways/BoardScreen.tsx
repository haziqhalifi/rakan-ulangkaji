import { useI18n } from '../../core/i18n';

// Placeholder until the pathway board is built in a later task. Default export for React.lazy.
export default function BoardScreen() {
  const { t } = useI18n();
  return (
    <section className="stitched">
      <h1>{t('board.title')}</h1>
      <p>{t('board.placeholder')}</p>
    </section>
  );
}
