// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { stringsEn } from '../../core/i18n/strings.en';
import { createProfileStore, type ProfileStore } from '../../core/profile';
import { createStorageService } from '../../core/storage/StorageService';
import { sampleData, sampleProfile } from '../../test/fixtures';
import { fakeDurableBackend } from '../../test/helpers';

async function open(): Promise<ProfileStore> {
  const storage = createStorageService({ backend: fakeDurableBackend() });
  await storage.save(sampleData({ profile: sampleProfile({ language: 'en' }) }));
  const store = createProfileStore({ storage, defaultLanguage: 'en', debounceMs: 0 });
  await store.init();
  window.location.hash = '#/rakan';
  render(<App store={store} />);
  return store;
}

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('Rakan chat screen', () => {
  it('greets by name in a polite live log with labelled bubbles', async () => {
    await open();
    const log = screen.getByRole('log');
    expect(log.getAttribute('aria-live')).toBe('polite');
    expect(within(log).getByText(/Aina/)).toBeTruthy();
    expect(within(log).getByText('Rakan')).toBeTruthy();
  });

  it('sends a message, labels it, replies and removes the typing indicator', async () => {
    const store = await open();
    const input = screen.getByLabelText(stringsEn['chat.input']);
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: stringsEn['chat.send'] }));
    await flush();
    const chat = store.getState().chat;
    expect(chat.map((m) => m.from)).toEqual(['student', 'rakan']);
    expect(within(screen.getByRole('log')).getByText('You')).toBeTruthy();
    expect(screen.queryByText(stringsEn['chat.typing'])).toBeNull();
    expect((input as HTMLTextAreaElement).value).toBe('');
  });

  it('keeps focus and sends nothing on an empty message', async () => {
    const store = await open();
    const input = screen.getByLabelText(stringsEn['chat.input']);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: stringsEn['chat.send'] }));
    await flush();
    expect(store.getState().chat).toHaveLength(0);
    expect(document.activeElement).toBe(input);
  });

  it('shows the limit notice at 500 characters and keeps the text', async () => {
    await open();
    const input = screen.getByLabelText(stringsEn['chat.input']) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'a'.repeat(520) } });
    expect(input.value).toHaveLength(500);
    expect(screen.getByText(stringsEn['chat.limit'])).toBeTruthy();
  });

  it('sends chip text as a student message for Quiz me and revise', async () => {
    const store = await open();
    fireEvent.click(screen.getByRole('button', { name: stringsEn['chat.chip.quiz'] }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: stringsEn['chat.chip.revise'] }));
    await flush();
    const students = store.getState().chat.filter((m) => m.from === 'student').map((m) => m.text);
    expect(students).toEqual([stringsEn['chat.chip.quiz'], stringsEn['chat.chip.revise']]);
    expect(store.getState().chat).toHaveLength(4);
  });

  it('navigates from the exam and pathways chips', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: stringsEn['chat.chip.exam'] }));
    expect(window.location.hash).toBe('#/exam');
    window.location.hash = '#/rakan';
    await flush();
    fireEvent.click(screen.getByRole('button', { name: stringsEn['chat.chip.pathways'] }));
    expect(window.location.hash).toBe('#/board');
  });

  it('switches language through the reply action', async () => {
    const store = await open();
    fireEvent.change(screen.getByLabelText(stringsEn['chat.input']), { target: { value: 'tukar bahasa' } });
    fireEvent.click(screen.getByRole('button', { name: stringsEn['chat.send'] }));
    await flush();
    expect(store.getState().language).toBe('bm');
  });
});
