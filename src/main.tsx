import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerServiceWorker, UPDATE_READY_EVENT } from './app/registerSW';
import { detectDefaultLanguage } from './core/i18n';
import { createProfileStore } from './core/profile';
import { createStorageService } from './core/storage';
import './styles/tokens.css';
import './styles/base.css';
import './styles/stitch.css';
import './styles/shell.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

const store = createProfileStore({
  storage: createStorageService(),
  defaultLanguage: detectDefaultLanguage(navigator.languages ?? [navigator.language]),
});

// Load saved data before the first render so the route guard has the real profile.
void store
  .init()
  .catch(() => undefined)
  .then(() => {
    createRoot(container).render(
      <StrictMode>
        <App store={store} />
      </StrictMode>,
    );
    if (import.meta.env.PROD) {
      const sw = registerServiceWorker({
        isExamInProgress: () => store.getState().examInProgress !== null,
        onUpdateReady: () => window.dispatchEvent(new Event(UPDATE_READY_EVENT)),
      });
      store.subscribe(() => sw.flush());
    }
  });
