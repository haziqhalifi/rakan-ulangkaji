import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { useI18n } from '../core/i18n';
import { useProfileState } from '../core/profile';
import { ChatScreen } from '../features/chat/ChatScreen';
import { ErrorBoundary } from './ErrorBoundary';
import { LanguageToggle } from './LanguageToggle';
import { NavigationProvider } from './NavigationContext';
import { StatusBanner } from './StatusBanner';
import { Onboarding } from './Onboarding';
import { SettingsScreen } from './SettingsScreen';
import { HomeScreen } from './screens';
import { guardRoute, navigateTo, routeHash, useRoute, type Route } from './router';

// Exam and board load on demand. A failed load shows the "needs one online visit" panel.
const ExamScreen = lazy(() => import('../features/exam/ExamScreen'));
const BoardScreen = lazy(() => import('../features/pathways/BoardScreen'));

const NAV: Array<{ route: Route; label: 'nav.rakan' | 'nav.exam' | 'nav.board' }> = [
  { route: 'rakan', label: 'nav.rakan' },
  { route: 'exam', label: 'nav.exam' },
  { route: 'board', label: 'nav.board' },
];

export function Shell() {
  const { t } = useI18n();
  const { profile } = useProfileState();
  const requested = useRoute();
  const route = guardRoute(requested, profile !== null);

  useEffect(() => {
    if (route !== requested) navigateTo(route, { replace: true });
  }, [route, requested]);

  let screen: ReactNode;
  switch (route) {
    case 'welcome':
      screen = <Onboarding />;
      break;
    case 'rakan':
      screen = <ChatScreen />;
      break;
    case 'exam':
      screen = <ExamScreen />;
      break;
    case 'board':
      screen = <BoardScreen />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
    default:
      screen = <HomeScreen />;
  }

  return (
    <NavigationProvider navigate={(r) => navigateTo(r)}>
      <div className="shell" data-mode={route}>
        <header className="shell-header">
          <a className="shell-title" href={routeHash('home')} aria-label={`${t('app.name')}, ${t('nav.home')}`}>
            {t('app.name')}
          </a>
          <div className="shell-tools">
            {profile && (
              <a className="shell-link" href={routeHash('settings')} aria-current={route === 'settings' ? 'page' : undefined}>
                {t('nav.settings')}
              </a>
            )}
            <LanguageToggle />
          </div>
        </header>
        <StatusBanner />
        <main className="shell-main">
          <ErrorBoundary key={route} fallback={(error) => <ErrorPanel error={error} />}>
            <Suspense fallback={<p role="status">{t('loading')}</p>}>{screen}</Suspense>
          </ErrorBoundary>
        </main>
        {profile && (
          <nav className="shell-nav" aria-label={t('nav.main')}>
            {NAV.map((item) => (
              <a
                key={item.route}
                href={routeHash(item.route)}
                aria-current={route === item.route ? 'page' : undefined}
              >
                {t(item.label)}
              </a>
            ))}
          </nav>
        )}
      </div>
    </NavigationProvider>
  );
}

function ErrorPanel(props: { error: Error }) {
  const { t } = useI18n();
  void props.error; // details are never shown to the student
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return (
    <section className="stitched" role="alert">
      <h1>{t(offline ? 'error.offlineTitle' : 'error.title')}</h1>
      <p>{t(offline ? 'error.offlineBody' : 'error.body')}</p>
      {offline ? (
        <a className="tap" href={routeHash('rakan')}>
          {t('error.backToRakan')}
        </a>
      ) : (
        <button type="button" className="tap" onClick={() => window.location.reload()}>
          {t('error.reload')}
        </button>
      )}
    </section>
  );
}
