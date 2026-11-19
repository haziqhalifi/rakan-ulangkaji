import { useI18n, type StringKey } from '../core/i18n';
import { useProfileState } from '../core/profile';

export function PlaceholderScreen(props: { titleKey: StringKey; bodyKey: StringKey }) {
  const { t } = useI18n();
  return (
    <section className="stitched">
      <h1>{t(props.titleKey)}</h1>
      <p>{t(props.bodyKey)}</p>
    </section>
  );
}

export function WelcomeScreen() {
  return <PlaceholderScreen titleKey="welcome.title" bodyKey="welcome.body" />;
}

export function SettingsScreen() {
  return <PlaceholderScreen titleKey="settings.title" bodyKey="settings.placeholder" />;
}

export function HomeScreen() {
  const { t } = useI18n();
  const { profile } = useProfileState();
  return (
    <section className="stitched">
      <h1>{t('home.title', { name: profile?.name ?? '' })}</h1>
      <p>{t('home.caption')}</p>
      <ul className="mode-list">
        <li>{t('home.mode.rakan')}</li>
        <li>{t('home.mode.exam')}</li>
        <li>{t('home.mode.board')}</li>
      </ul>
    </section>
  );
}
