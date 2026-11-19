import { useSyncExternalStore } from 'react';

export type Route = 'welcome' | 'home' | 'rakan' | 'exam' | 'board' | 'settings';

const PATHS: Record<Route, string> = {
  welcome: '#/welcome',
  home: '#/',
  rakan: '#/rakan',
  exam: '#/exam',
  board: '#/board',
  settings: '#/settings',
};

export function routeHash(route: Route): string {
  return PATHS[route];
}

/** Unknown or empty hashes open home. */
export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split(/[?/]/)[0] ?? '';
  switch (path) {
    case 'welcome':
    case 'rakan':
    case 'exam':
    case 'board':
    case 'settings':
      return path;
    default:
      return 'home';
  }
}

/** Where a student may be, given whether a profile exists. */
export function guardRoute(route: Route, hasProfile: boolean): Route {
  if (!hasProfile) return 'welcome';
  return route === 'welcome' ? 'home' : route;
}

export function navigateTo(route: Route, opts: { replace?: boolean } = {}): void {
  const target = routeHash(route);
  if (opts.replace) {
    const url = window.location.pathname + window.location.search + target;
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  );
  return parseRoute(hash);
}
