import { useCallback, useSyncExternalStore } from 'react';
import { I18nProvider } from './core/i18n';
import { ProfileProvider, type ProfileStore } from './core/profile';
import { Shell } from './app/Shell';
import { StatusProvider } from './app/StatusContext';

export function App(props: { store: ProfileStore }) {
  const { store } = props;
  const language = useSyncExternalStore(
    store.subscribe,
    () => store.getState().language,
    () => store.getState().language,
  );
  const setLanguage = useCallback((lang: 'bm' | 'en') => store.setLanguage(lang), [store]);

  return (
    <ProfileProvider store={store}>
      <I18nProvider language={language} setLanguage={setLanguage}>
        <StatusProvider>
          <Shell />
        </StatusProvider>
      </I18nProvider>
    </ProfileProvider>
  );
}
