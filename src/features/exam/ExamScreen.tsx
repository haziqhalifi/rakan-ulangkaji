import { useI18n } from '../../core/i18n';

// Placeholder until exam mode is built in a later task. Default export for React.lazy.
export default function ExamScreen() {
  const { t } = useI18n();
  return (
    <section className="stitched">
      <h1>{t('exam.title')}</h1>
      <p>{t('exam.placeholder')}</p>
    </section>
  );
}
