// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { createProfileStore, type ProfileStore } from '../core/profile';
import { createStorageService } from '../core/storage/StorageService';
import { sampleData, sampleProfile } from '../test/fixtures';
import { fakeDurableBackend } from '../test/helpers';

async function open(): Promise<ProfileStore> {
  const storage = createStorageService({ backend: fakeDurableBackend() });
  await storage.save(sampleData({ profile: sampleProfile({ language: 'en' }) }));
  const store = createProfileStore({ storage, defaultLanguage: 'en', debounceMs: 0 });
  await store.init();
  window.location.hash = '#/settings';
  render(<App store={store} />);
  return store;
}

const proxyBox = () => screen.getByLabelText(/Built-in helper/) as HTMLInputElement;
const click = (el: HTMLElement) => act(async () => { fireEvent.click(el); });

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('remote AI consent UI', () => {
  it('starts with every provider off', async () => {
    const store = await open();
    expect(proxyBox().checked).toBe(false);
    expect(store.getState().settings.remote.proxy.enabled).toBe(false);
  });

  it('dismiss leaves the provider disabled with no consent', async () => {
    const store = await open();
    await click(proxyBox());
    expect(screen.getByText(/the question you typed/)).toBeTruthy();
    expect(screen.getByText(/Receiving provider: Cloudflare Workers AI/)).toBeTruthy();
    await click(screen.getByRole('button', { name: 'Not now' }));
    const s = store.getState().settings.remote.proxy;
    expect(s.enabled).toBe(false);
    expect(s.consentAt).toBeUndefined();
  });

  it('confirm records consent and enables, then revoke returns to rules only', async () => {
    const store = await open();
    await click(proxyBox());
    await click(screen.getByRole('button', { name: 'I understand, turn it on' }));
    const on = store.getState().settings.remote.proxy;
    expect(on.enabled).toBe(true);
    expect(on.consentAt).toBeTruthy();
    await click(screen.getByRole('button', { name: 'Revoke consent and turn off' }));
    const off = store.getState().settings.remote.proxy;
    expect(off.enabled).toBe(false);
    expect(off.consentAt).toBeUndefined();
  });

  it('share options are off by default', async () => {
    const store = await open();
    expect(store.getState().settings.share).toEqual({ name: false, school: false, grades: false });
  });
});
