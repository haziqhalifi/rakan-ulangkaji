// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { stringsEn } from '../../core/i18n/strings.en';
import { createProfileStore, type ProfileStore } from '../../core/profile';
import { createStorageService } from '../../core/storage/StorageService';
import { sampleData, sampleProfile } from '../../test/fixtures';
import { resetNudgeSession } from './nudge';
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

beforeEach(() => resetNudgeSession());

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
    fireEvent.click(screen.getByRole('button', { name: stringsEn['chat.chip.stop'] }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: stringsEn['chat.chip.revise'] }));
    await flush();
    const students = store.getState().chat.filter((m) => m.from === 'student').map((m) => m.text);
    expect(students).toEqual([stringsEn['chat.chip.quiz'], 'stop', stringsEn['chat.chip.revise']]);
    expect(store.getState().chat).toHaveLength(6);
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

describe('Rakan quiz and nudge on the chat screen', () => {
  it('shows one nudge for the weakest topic, with a Quiz me on this chip that starts that topic', async () => {
    const storage = createStorageService({ backend: fakeDurableBackend() });
    await storage.save(
      sampleData({
        profile: sampleProfile({ language: 'en' }),
        progress: {
          quizAttempts: [
            { questionId: 'x1', topic: 'f5-matrices', ratio: 0.2, at: '2026-11-20T10:00:00.000Z' },
            { questionId: 'x2', topic: 'f4-sets', ratio: 0.4, at: '2026-11-20T10:00:00.000Z' },
          ],
          examResults: [],
        },
      }),
    );
    const store = createProfileStore({ storage, defaultLanguage: 'en', debounceMs: 0 });
    await store.init();
    window.location.hash = '#/rakan';
    render(<App store={store} />);
    await flush();
    const nudges = store.getState().chat.filter((m) => m.chips?.includes('quizTopic'));
    expect(nudges).toHaveLength(1);
    expect(nudges[0]?.text).toContain('Matrices');
    fireEvent.click(screen.getByRole('button', { name: stringsEn['chat.chip.quizTopic'] }));
    await flush();
    const last = store.getState().chat.at(-1);
    expect(last?.from).toBe('rakan');
    expect(last?.text).toContain('Question 1 of 5');
    expect(screen.getByRole('button', { name: stringsEn['chat.chip.stop'] })).toBeTruthy();
    expect(store.getState().chat.filter((m) => m.chips?.includes('quizTopic'))).toHaveLength(1);
  });

  it('runs a quiz answer through the marker and records one attempt', async () => {
    const store = await open();
    fireEvent.click(screen.getByRole('button', { name: stringsEn['chat.chip.quiz'] }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /Indices/ }));
    await flush();
    const input = screen.getByLabelText(stringsEn['chat.input']);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(store.getState().progress.quizAttempts).toHaveLength(0);
    fireEvent.change(input, { target: { value: 'Z' } });
    fireEvent.click(screen.getByRole('button', { name: stringsEn['chat.send'] }));
    await flush();
    expect(store.getState().progress.quizAttempts).toHaveLength(1);
    expect(store.getState().chat.at(-1)?.text).toContain('Marks: 0/1');
  });
});
