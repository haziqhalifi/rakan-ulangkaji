// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import manifestRaw from '../../public/manifest.webmanifest?raw';
import { createProfileStore } from '../core/profile';
import { createStorageService } from '../core/storage/StorageService';
import { stringsEn } from '../core/i18n/strings.en';
import { stringsBm } from '../core/i18n/strings.bm';
import { sampleData, sampleProfile } from '../test/fixtures';
import { fakeDurableBackend } from '../test/helpers';

async function store(language: 'bm' | 'en' = 'en') {
  const storage = createStorageService({ backend: fakeDurableBackend() });
  await storage.save(sampleData({ profile: sampleProfile({ language }) }));
  const s = createProfileStore({ storage, defaultLanguage: language });
  await s.init();
  return s;
}

beforeEach(() => {
  window.location.hash = '';
});

describe('accessibility basics', () => {
  it('gives every button and nav link an accessible name on each screen', async () => {
    render(<App store={await store()} />);
    for (const hash of ['#/home', '#/rakan', '#/settings']) {
      act(() => {
        window.location.hash = hash;
      });
      await waitFor(() => expect(screen.getAllByRole('button').length).toBeGreaterThan(0));
      for (const el of [...screen.getAllByRole('button'), ...screen.getAllByRole('link')]) {
        expect(el).toHaveAccessibleName();
      }
    }
  });

  it('keeps the language toggle on screen after navigating', async () => {
    render(<App store={await store()} />);
    for (const hash of ['#/home', '#/rakan', '#/settings']) {
      act(() => {
        window.location.hash = hash;
      });
      await waitFor(() => expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument());
    }
  });

  it('shows an offline notice with a live region and hides it when back online', async () => {
    render(<App store={await store()} />);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    // navigator.onLine is not changed by the event, so the notice is driven by the event itself.
    expect(await screen.findByText(new RegExp(stringsEn['offline.notice'].slice(0, 20)))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(stringsEn['offline.notice'].slice(0, 20))).closest('[role="status"]')).not.toBeNull();
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(screen.queryByText(new RegExp(stringsEn['offline.notice'].slice(0, 20)))).toBeNull());
  });

  it('has both languages for the new strings and no em dash or banned word', () => {
    for (const key of ['offline.notice', 'status.updateReady'] as const) {
      for (const text of [stringsEn[key], stringsBm[key]]) {
        expect(text).not.toContain('\u2014');
        expect(text).not.toMatch(/\bkau\b/i);
      }
    }
  });

  it('declares a manifest with standalone display and three icons', () => {
    const m = JSON.parse(manifestRaw) as {
      display: string;
      icons: Array<{ sizes: string; purpose: string }>;
    };
    expect(m.display).toBe('standalone');
    expect(m.icons.map((i) => i.sizes + i.purpose).sort()).toEqual(['192x192any', '512x512any', '512x512maskable']);
  });
});
