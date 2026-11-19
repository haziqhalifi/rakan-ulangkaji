import { describe, expect, it } from 'vitest';
import { guardRoute, parseRoute, routeHash, type Route } from './router';

describe('router', () => {
  it('parses known routes and falls back to home', () => {
    expect(parseRoute('#/rakan')).toBe('rakan');
    expect(parseRoute('#/exam')).toBe('exam');
    expect(parseRoute('#/board')).toBe('board');
    expect(parseRoute('#/settings')).toBe('settings');
    expect(parseRoute('#/welcome')).toBe('welcome');
    expect(parseRoute('')).toBe('home');
    expect(parseRoute('#/')).toBe('home');
    expect(parseRoute('#/nope')).toBe('home');
  });

  it('round trips every route hash', () => {
    const routes: Route[] = ['welcome', 'home', 'rakan', 'exam', 'board', 'settings'];
    for (const r of routes) expect(parseRoute(routeHash(r))).toBe(r);
  });

  it('sends every route to welcome when there is no profile', () => {
    for (const r of ['home', 'rakan', 'exam', 'board', 'settings', 'welcome'] as Route[]) {
      expect(guardRoute(r, false)).toBe('welcome');
    }
  });

  it('keeps routes when a profile exists, except welcome', () => {
    expect(guardRoute('exam', true)).toBe('exam');
    expect(guardRoute('welcome', true)).toBe('home');
  });
});
