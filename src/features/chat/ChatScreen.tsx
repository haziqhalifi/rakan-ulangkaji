import { useI18n } from '../../core/i18n';

// Placeholder until the chat is built in a later task.
export function ChatScreen() {
  const { t } = useI18n();
  return (
    <section className="stitched">
      <h1>{t('rakan.title')}</h1>
      <p>{t('rakan.placeholder')}</p>
    </section>
  );
}
