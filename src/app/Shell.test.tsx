// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { createProfileStore, type ProfileStore } from '../core/profile';
import { createStorageService } from '../core/storage/StorageService';
import { sampleData, sampleProfile } from '../test/fixtures';
import { fakeDurableBackend } from '../test/helpers';
import { stringsEn } from '../core/i18n/strings.en';

async function storeWith(language: 'bm' | 'en' = 'en'): Promise<ProfileStore> {
  const storage = createStorageService({ backend: fakeDurableBackend() });
  await storage.save(sampleData({ profile: sampleProfile({ language }) }));
  const store = createProfileStore({ storage, defaultLanguage: language });
  await store.init();
  return store;
}

async function emptyStore(): Promise<ProfileStore> {
  const store = createProfileStore({
    storage: createStorageService({ backend: fakeDurableBackend() }),
    defaultLanguage: 'en',
  });
  await store.init();
  return store;
}

function goto(hash: string) {
  window.location.hash = hash;
}

beforeEach(() => {
  goto('');
  document.documentElement.lang = '';
});

describe('Shell', () => {
  it('redirects every route to welcome when there is no profile', async () => {
    goto('#/rakan');
    render(<App store={await emptyStore()} />);
    await waitFor(() => expect(window.location.hash).toBe('#/welcome'));
    expect(screen.getByRole('heading', { name: stringsEn['welcome.title'] })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('shows the language toggle on the welcome screen', async () => {
    render(<App store={await emptyStore()} />);
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
  });

  it('shows the home caption naming the three modes', async () => {
    render(<App store={await storeWith()} />);
    expect(await screen.findByText(stringsEn['home.caption'])).toBeInTheDocument();
    expect(screen.getByText(stringsEn['home.mode.rakan'])).toBeInTheDocument();
    expect(screen.getByText(stringsEn['home.mode.exam'])).toBeInTheDocument();
    expect(screen.getByText(stringsEn['home.mode.board'])).toBeInTheDocument();
  });

  it('marks the current mode with aria-current="page"', async () => {
    goto('#/rakan');
    render(<App store={await storeWith()} />);
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe('Rakan');

    act(() => goto('#/board'));
    await waitFor(() => expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe('Pathways'));
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it('lazy loads the exam and board screens', async () => {
    goto('#/exam');
    render(<App store={await storeWith()} />);
    expect(await screen.findByRole('heading', { name: 'Exam' })).toBeInTheDocument();
    act(() => goto('#/board'));
    expect(await screen.findByRole('heading', { name: 'Pathways' })).toBeInTheDocument();
  });

  it('switches language in place and sets the document language', async () => {
    const user = userEvent.setup();
    goto('#/rakan');
    const store = await storeWith('bm');
    render(<App store={store} />);
    await screen.findByRole('heading', { name: 'Rakan' });
    expect(document.documentElement.lang).toBe('ms');

    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByRole('link', { name: 'Exam' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/rakan');

    await user.click(screen.getByRole('button', { name: 'BM' }));
    expect(document.documentElement.lang).toBe('ms');
    expect(screen.getByRole('link', { name: 'Peperiksaan' })).toBeInTheDocument();
    expect(store.getState().profile?.language).toBe('bm');
  });

  it('toggle buttons are at least 44 px by class and expose pressed state', async () => {
    render(<App store={await emptyStore()} />);
    const en = screen.getByRole('button', { name: 'EN' });
    expect(en).toHaveClass('tap');
    expect(en).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'BM' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the kind storage banner when saving fails', async () => {
    const storage = createStorageService({ backend: fakeDurableBackend() });
    vi.spyOn(storage, 'save').mockRejectedValue(new Error('quota'));
    const failing = createProfileStore({ storage, defaultLanguage: 'en' });
    await failing.init();
    render(<App store={failing} />);
    act(() => failing.setGrade('matematik', 'B'));
    await act(async () => {
      await failing.flush();
    });
    expect(screen.getByRole('status')).toHaveTextContent(stringsEn['status.writeFailed']);
  });
});
