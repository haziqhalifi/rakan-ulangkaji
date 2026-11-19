// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { stringsBm } from '../core/i18n/strings.bm';
import { stringsEn } from '../core/i18n/strings.en';
import { createProfileStore, type ProfileStore } from '../core/profile';
import { createStorageService } from '../core/storage/StorageService';
import type { StorageService } from '../core/storage/types';
import { sampleData, sampleProfile } from '../test/fixtures';
import { fakeDurableBackend } from '../test/helpers';
import { ONBOARDING_STEPS } from './Onboarding';

async function build(opts: { saved?: boolean; lang?: 'bm' | 'en'; wrap?: (s: StorageService) => StorageService } = {}) {
  const base = createStorageService({ backend: fakeDurableBackend() });
  if (opts.saved) await base.save(sampleData({ profile: sampleProfile({ language: opts.lang ?? 'en' }) }));
  const storage = opts.wrap ? opts.wrap(base) : base;
  const store = createProfileStore({ storage, defaultLanguage: opts.lang ?? 'en' });
  await store.init();
  return { store, storage: base };
}

const next = () => userEvent.click(screen.getByRole('button', { name: stringsEn['welcome.next'] }));

beforeEach(() => {
  window.location.hash = '';
});

describe('Onboarding', () => {
  it('finishes in four screens, shows the privacy statement before submit, and opens Rakan', async () => {
    const { store } = await build();
    render(<App store={store} />);
    const user = userEvent.setup();

    expect(screen.getByText(`Step 1 of ${ONBOARDING_STEPS}`)).toBeInTheDocument();
    await user.type(screen.getByLabelText(stringsEn['field.name']), 'Aina');
    await next();
    await user.click(screen.getByRole('radio', { name: stringsEn['form.5'] }));
    await next();
    expect(screen.getByRole('checkbox', { name: stringsEn['subject.matematik'] })).toBeChecked();
    for (const key of ['subject.bm', 'subject.bi', 'subject.sejarah', 'subject.sains'] as const) {
      const box = screen.getByRole('checkbox', { name: new RegExp(`${stringsEn[key]}.*${stringsEn['subject.comingSoon']}`) });
      expect(box).toBeDisabled();
    }
    await next();
    expect(screen.getByText(`Step 4 of ${ONBOARDING_STEPS}`)).toBeInTheDocument();
    expect(screen.getByText(stringsEn['welcome.privacy.body'])).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: stringsEn['welcome.submit'] }));

    await waitFor(() => expect(window.location.hash).toBe('#/rakan'));
    expect(store.getState().profile).toMatchObject({ name: 'Aina', form: 5, language: 'en' });
  });

  it('names each bad field, keeps the typed values, and saves nothing', async () => {
    const { store, storage } = await build();
    render(<App store={store} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(stringsEn['field.name']), 'x'.repeat(31));
    await next();
    await next(); // form left empty
    await user.click(screen.getByRole('checkbox', { name: stringsEn['subject.matematik'] })); // unselect
    await next();
    await user.click(screen.getByRole('button', { name: stringsEn['welcome.submit'] }));

    // Jumps back to the first screen with a problem, values intact.
    const input = await screen.findByLabelText(stringsEn['field.name']);
    expect(input).toHaveValue('x'.repeat(31));
    expect(screen.getByText(stringsEn['error.name.too_long'])).toBeInTheDocument();
    await next();
    expect(screen.getByText(stringsEn['error.form.invalid'])).toBeInTheDocument();
    await next();
    expect(screen.getByText(stringsEn['error.subjects.required'])).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: stringsEn['subject.matematik'] })).not.toBeChecked();
    expect((await storage.load()).status).toBe('empty');
    expect(store.getState().profile).toBeNull();
  });

  it('stays on onboarding with values kept when storage fails', async () => {
    const { store } = await build({ wrap: (s) => ({ ...s, save: async () => { throw new Error('full'); } }) });
    render(<App store={store} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(stringsEn['field.name']), 'Ravi');
    await next();
    await user.click(screen.getByRole('radio', { name: stringsEn['form.4'] }));
    await next();
    await next();
    await user.click(screen.getByRole('button', { name: stringsEn['welcome.submit'] }));

    expect(await screen.findByText(stringsEn['welcome.saveFailed'])).toBeInTheDocument();
    expect(store.getState().profile).toBeNull();
    await user.click(screen.getByRole('button', { name: stringsEn['welcome.back'] }));
    await user.click(screen.getByRole('button', { name: stringsEn['welcome.back'] }));
    await user.click(screen.getByRole('button', { name: stringsEn['welcome.back'] }));
    expect(screen.getByLabelText(stringsEn['field.name'])).toHaveValue('Ravi');
  });

  it('switches onboarding copy with the language toggle', async () => {
    const { store } = await build({ lang: 'en' });
    render(<App store={store} />);
    expect(screen.getByRole('heading', { name: stringsEn['welcome.title'] })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'BM' }));
    expect(screen.getByRole('heading', { name: stringsBm['welcome.title'] })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ms');
  });
});

describe('Settings', () => {
  async function open(store: ProfileStore) {
    window.location.hash = '#/settings';
    render(<App store={store} />);
    return screen.findByRole('heading', { name: stringsEn['settings.title'] });
  }

  it('keeps data when delete is cancelled, and returns to onboarding when confirmed', async () => {
    const { store, storage } = await build({ saved: true });
    await open(store);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: stringsEn['settings.delete.button'] }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: stringsEn['settings.delete.cancel'] }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(store.getState().profile).not.toBeNull();
    expect((await storage.load()).status).toBe('ok');

    await user.click(screen.getByRole('button', { name: stringsEn['settings.delete.button'] }));
    await user.click(screen.getByRole('button', { name: stringsEn['settings.delete.confirm'] }));
    await waitFor(() => expect(window.location.hash).toBe('#/welcome'));
    expect(await screen.findByRole('heading', { name: stringsEn['welcome.title'] })).toBeInTheDocument();
    expect((await storage.load()).status).toBe('empty');
  });

  it('shows field errors on a profile edit and keeps the entered value', async () => {
    const { store } = await build({ saved: true });
    await open(store);
    const user = userEvent.setup();
    const name = screen.getByLabelText(stringsEn['field.name']);
    await user.clear(name);
    await user.type(name, '   ');
    await user.click(screen.getByRole('button', { name: stringsEn['settings.profile.save'] }));
    expect(screen.getAllByText(stringsEn['error.name.required']).length).toBeGreaterThan(0);
    expect(name).toHaveValue('   ');
    expect(store.getState().profile?.name).toBe('Aina');
  });

  it('imports pasted text and reports a bad file kindly', async () => {
    const { store } = await build({ saved: true });
    await open(store);
    const user = userEvent.setup();
    const paste = screen.getByLabelText(stringsEn['settings.import.paste']);

    await user.click(paste);
    await user.paste('not json');
    await user.click(screen.getByRole('button', { name: stringsEn['settings.import.button'] }));
    expect(screen.getByText(stringsEn['settings.import.unreadable'])).toBeInTheDocument();

    const bundle = store.exportData();
    bundle.payload.grades = { matematik: 'A' };
    await user.clear(paste);
    await user.click(paste);
    await user.paste(JSON.stringify(bundle));
    await user.click(screen.getByRole('button', { name: stringsEn['settings.import.button'] }));
    expect(screen.getByText(stringsEn['settings.import.ok'])).toBeInTheDocument();
    expect(store.getState().grades.matematik).toBe('A');
  });

  it('toggles the demo short timer', async () => {
    const { store } = await build({ saved: true });
    await open(store);
    await userEvent.click(screen.getByRole('checkbox', { name: stringsEn['settings.timer.label'] }));
    expect(store.getState().settings.demoShortTimer).toBe(true);
  });
});
