// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { stringsBm } from '../../core/i18n/strings.bm';
import { stringsEn } from '../../core/i18n/strings.en';
import { createProfileStore, defaultSettings, type ProfileStore } from '../../core/profile';
import { createStorageService } from '../../core/storage/StorageService';
import { paper } from '../../test/arbitraries/exam';
import { sampleData, sampleProfile } from '../../test/fixtures';
import { fakeDurableBackend } from '../../test/helpers';

const gate = vi.hoisted(() => ({ fail: false }));
vi.mock('../../content/matematik.paper', async (orig) => {
  const actual = await orig<typeof import('../../content/matematik.paper')>();
  return {
    ...actual,
    get default() {
      if (gate.fail) throw new Error('chunk failed');
      return actual.default;
    },
  };
});

const START = Date.parse('2026-11-25T09:00:00.000Z');
const MIN = 60_000;

async function build(over: Partial<ReturnType<typeof sampleData>> = {}): Promise<ProfileStore> {
  const storage = createStorageService({ backend: fakeDurableBackend() });
  await storage.save(sampleData({ profile: sampleProfile({ language: 'en' }), ...over }));
  const store = createProfileStore({ storage, defaultLanguage: 'en', debounceMs: 0 });
  await store.init();
  return store;
}

async function open(store: ProfileStore) {
  window.location.hash = '#/exam';
  render(<App store={store} />);
  await settle();
}

const realSetTimeout = setTimeout;

/** The lazy chunks load through real module I/O, so give them real time, not fake time. */
async function settle() {
  for (let i = 0; i < 20; i++) {
    await act(async () => {
      await new Promise((r) => realSetTimeout(r, 15));
    });
    if (screen.queryByText(stringsEn['loading']) === null && screen.queryByText(stringsEn['exam.loading']) === null) return;
  }
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** userEvent waits on timers that are faked here, so use fireEvent. */
const user = () => ({ click: async (el: HTMLElement) => void fireEvent.click(el) });

beforeEach(() => {
  vi.useFakeTimers({ now: START, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
});

afterEach(() => {
  cleanup();
  gate.fail = false;
  vi.useRealTimers();
});

describe('exam flow', () => {
  it('shows instructions first and does not start the timer until Start', async () => {
    await open(await build());
    expect(screen.getByRole('heading', { name: stringsEn['exam.instructions.title'] })).toBeInTheDocument();
    expect(screen.getByText('Time: 45 minutes')).toBeInTheDocument();
    expect(screen.getByText(`Questions: ${paper.questions.length}`)).toBeInTheDocument();
    expect(screen.queryByRole('timer')).toBeNull();
    await advance(5 * MIN);
    await user().click(screen.getByRole('button', { name: stringsEn['exam.start'] }));
    expect(screen.getByRole('timer')).toHaveTextContent('45:00');
  });

  it('uses 60 seconds with the demo timer and leaves the questions alone', async () => {
    const settings = { ...defaultSettings(), demoShortTimer: true };
    await open(await build({ settings }));
    await user().click(screen.getByRole('button', { name: stringsEn['exam.start'] }));
    expect(screen.getByRole('timer')).toHaveTextContent('01:00');
    expect(screen.getByText(new RegExp(`Question 1 of ${paper.questions.length}`))).toBeInTheDocument();
  });

  it('keeps answers when the language changes, and the timer keeps its start time', async () => {
    await open(await build());
    const u = user();
    await u.click(screen.getByRole('button', { name: stringsEn['exam.start'] }));
    const first = paper.questions[0];
    await u.click(screen.getByRole('radio', { name: new RegExp(`^${first?.options?.[1]?.id}\\.`) }));
    await advance(30_000);
    await u.click(screen.getByRole('button', { name: 'BM' }));
    expect(screen.getByRole('timer')).toHaveTextContent('44:30');
    expect(screen.getByRole('radio', { name: new RegExp(`^${first?.options?.[1]?.id}\\.`) })).toBeChecked();
    expect(screen.getByRole('button', { name: stringsBm['exam.submit'] })).toBeInTheDocument();
  });

  it('announces the 5 minute warning once and auto-submits at zero', async () => {
    const store = await build();
    await open(store);
    await user().click(screen.getByRole('button', { name: stringsEn['exam.start'] }));
    await advance(40 * MIN);
    expect(screen.getAllByText(stringsEn['exam.warning']).length).toBe(2); // visible banner and live region
    await advance(5 * MIN);
    expect(screen.getByRole('heading', { name: stringsEn['exam.results.title'] })).toBeInTheDocument();
    expect(screen.getByText(stringsEn['exam.results.auto.timeout'])).toBeInTheDocument();
    expect(screen.getByText(stringsEn['exam.autoSubmitted'])).toBeInTheDocument();
    await advance(60_000);
    expect(store.getState().progress.examResults).toHaveLength(1);
    expect(store.getState().progress.examResults[0]?.trigger).toBe('timeout');
    expect(store.getState().examInProgress).toBeNull();
  });

  it('cancelling the confirmation keeps the paper running, then a manual submit shows results', async () => {
    const store = await build();
    await open(store);
    const u = user();
    await u.click(screen.getByRole('button', { name: stringsEn['exam.start'] }));
    const q1 = paper.questions[0];
    const correct = q1?.skema[0]?.accepted[0] ?? 'A';
    await u.click(screen.getByRole('radio', { name: new RegExp(`^${correct}\\.`) }));
    await u.click(screen.getByRole('button', { name: stringsEn['exam.submit'] }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: stringsEn['exam.confirm.no'] }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(store.getState().progress.examResults).toHaveLength(0);

    await u.click(screen.getByRole('button', { name: stringsEn['exam.submit'] }));
    await u.click(screen.getByRole('button', { name: stringsEn['exam.confirm.yes'] }));
    expect(screen.getByRole('heading', { name: stringsEn['exam.results.title'] })).toBeInTheDocument();
    expect(screen.getByText(stringsEn['exam.results.gradeNote'])).toBeInTheDocument();
    expect(screen.getByText(stringsEn['exam.results.pathwaysNote'])).toBeInTheDocument();
    expect(screen.getAllByText(stringsEn['exam.results.unanswered']).length).toBe(paper.questions.length - 1);
    const saved = store.getState().progress.examResults;
    expect(saved).toHaveLength(1);
    expect(saved[0]?.questions[0]?.marks).toBe(1);

    await u.click(screen.getByRole('button', { name: stringsEn['exam.results.pathways'] }));
    expect(window.location.hash).toBe('#/board');
  });

  it('offers to resume when time remains, with the saved answers', async () => {
    const q1 = paper.questions[0];
    const examInProgress = {
      paperId: paper.id,
      startedAtMs: START - 10 * MIN,
      durationMs: 45 * MIN,
      answers: { [q1?.id ?? 'x']: 'B' },
      currentIndex: 0,
      warned: false,
    };
    await open(await build({ examInProgress }));
    expect(screen.getByText('You have 35:00 left. Your answers are saved.')).toBeInTheDocument();
    await user().click(screen.getByRole('button', { name: stringsEn['exam.resume.continue'] }));
    expect(screen.getByRole('timer')).toHaveTextContent('35:00');
    expect(screen.getByRole('radio', { name: /^B\./ })).toBeChecked();
  });

  it('auto-submits the saved answers when time ran out while away', async () => {
    const examInProgress = {
      paperId: paper.id,
      startedAtMs: START - 50 * MIN,
      durationMs: 45 * MIN,
      answers: {},
      currentIndex: 0,
      warned: true,
    };
    const store = await build({ examInProgress });
    await open(store);
    expect(screen.getByText(stringsEn['exam.results.auto.resume_expired'])).toBeInTheDocument();
    expect(store.getState().progress.examResults[0]?.trigger).toBe('resume_expired');
    expect(store.getState().examInProgress).toBeNull();
  });

  it('shows a retry message when the paper fails to load, without starting the timer', async () => {
    gate.fail = true;
    await open(await build());
    expect(screen.getByRole('alert')).toHaveTextContent(stringsEn['exam.loadFailed']);
    expect(screen.queryByRole('timer')).toBeNull();
    gate.fail = false;
    await user().click(screen.getByRole('button', { name: stringsEn['exam.retry'] }));
    await settle();
    expect(screen.getByRole('heading', { name: stringsEn['exam.instructions.title'] })).toBeInTheDocument();
  });
});
