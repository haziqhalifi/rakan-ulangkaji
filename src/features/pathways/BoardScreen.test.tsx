// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { stringsBm } from '../../core/i18n/strings.bm';
import { stringsEn } from '../../core/i18n/strings.en';
import { createProfileStore, GRADES, type Exam_Result, type Grade_Set, type ProfileStore } from '../../core/profile';
import { createStorageService } from '../../core/storage/StorageService';
import { arbGrade, arbGradeSet } from '../../test/arbitraries/grades';
import { fcConfig } from '../../test/fcConfig';
import { sampleData, sampleProfile } from '../../test/fixtures';
import { fakeDurableBackend } from '../../test/helpers';

async function build(grades: Grade_Set, results: Exam_Result[] = []): Promise<ProfileStore> {
  const storage = createStorageService({ backend: fakeDurableBackend() });
  await storage.save(
    sampleData({
      profile: sampleProfile({ language: 'en' }),
      grades,
      progress: { quizAttempts: [], examResults: results },
    }),
  );
  const store = createProfileStore({ storage, defaultLanguage: 'en', debounceMs: 0 });
  await store.init();
  return store;
}

const result = (grade: Exam_Result['grade'], id = 'r1'): Exam_Result => ({
  id,
  paperId: 'p',
  submittedAt: '2026-11-22T10:00:00.000Z',
  trigger: 'manual',
  totalEarned: 1,
  totalAvailable: 2,
  percent: 50,
  grade,
  questions: [],
  topics: [],
});

async function open(store: ProfileStore) {
  window.location.hash = '#/board';
  render(<App store={store} />);
  await screen.findByRole('heading', { name: stringsEn['board.title'] });
}

const select = (name: string) => screen.getByLabelText(new RegExp(`^${name}`)) as HTMLSelectElement;

afterEach(() => cleanup());

describe('Board screen', () => {
  it('shows the prompt, no hints and the full Disclaimer when no grades exist', async () => {
    await open(await build({}));
    expect(screen.getByText(stringsEn['board.empty'])).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /^Details for/ })).toHaveLength(0);
    expect(screen.getByText(stringsEn['disclaimer'])).toBeInTheDocument();
  });

  it('shows six cards and the Disclaimer, and a detail view keeps its place when the language switches', async () => {
    await open(await build({ bm: 'B', bi: 'B', matematik: 'B+', sejarah: 'C', sains: 'B' }));
    expect(screen.getAllByRole('button', { name: /^Details for/ })).toHaveLength(6);
    expect(screen.getByText(stringsEn['disclaimer'])).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^Details for/ })[2] as HTMLElement);
    expect(screen.getByRole('heading', { name: 'STPM' })).toBeInTheDocument();
    expect(screen.getByText(stringsEn['disclaimer'])).toBeInTheDocument();
    expect(screen.getByText(/Rules last reviewed: 2026-11-20/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'BM' }));
    expect(screen.getByRole('heading', { name: 'STPM' })).toBeInTheDocument();
    expect(screen.getByText(stringsBm['disclaimer'])).toBeInTheDocument();
    expect(screen.queryByText(stringsEn['disclaimer'])).toBeNull();
    expect(screen.getByText(stringsBm['board.detail.needs'])).toBeInTheDocument();
  });

  it('lists open routes in the detail of a route that is not open', async () => {
    await open(await build({ bm: 'C', bi: 'C', matematik: 'C', sejarah: 'E', sains: 'G' }));
    expect(screen.getByText(/Routes that may be open:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Details for Matriculation/ }));
    const list = screen.getByText(stringsEn['board.detail.openList']).nextElementSibling as HTMLElement;
    expect(within(list).getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('shows a supportive message naming a route when none is open', async () => {
    await open(await build({ bm: 'G' }));
    expect(screen.getByText(/That is only a starting point/)).toBeInTheDocument();
  });

  it('saves edits when what if is off, and leaves saved grades alone when it is on', async () => {
    const store = await build({ matematik: 'C' });
    await open(store);
    fireEvent.change(select('Bahasa Melayu'), { target: { value: 'A' } });
    expect(store.getState().grades).toEqual({ matematik: 'C', bm: 'A' });
    fireEvent.click(screen.getByRole('checkbox', { name: stringsEn['board.whatif.toggle'] }));
    expect(screen.getAllByText(/Predicted/).length).toBeGreaterThan(0);
    fireEvent.change(select('Matematik'), { target: { value: 'A+' } });
    expect(select('Matematik').value).toBe('A+');
    expect(store.getState().grades).toEqual({ matematik: 'C', bm: 'A' });
    fireEvent.click(screen.getByRole('checkbox', { name: stringsEn['board.whatif.toggle'] }));
    expect(select('Matematik').value).toBe('C');
  });

  it('imports Matematik from the latest exam, or says kindly that there is none', async () => {
    const none = await build({ bm: 'B' });
    await open(none);
    fireEvent.click(screen.getByRole('button', { name: stringsEn['board.import.button'] }));
    expect(screen.getByText(stringsEn['board.import.none'])).toBeInTheDocument();
    expect(none.getState().grades).toEqual({ bm: 'B' });
    cleanup();
    const some = await build({ bm: 'B', matematik: 'D' }, [result('A-')]);
    await open(some);
    fireEvent.click(screen.getByRole('button', { name: stringsEn['board.import.button'] }));
    expect(some.getState().grades).toEqual({ bm: 'B', matematik: 'A-' });
  });

  it('offers exactly the 10 grades and uses no forbidden phrases', async () => {
    await open(await build({ bm: 'B' }));
    const options = within(select('Matematik')).getAllByRole('option').map((o) => o.textContent);
    expect(options.slice(1)).toEqual([...GRADES]);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/you are eligible|you will get in/i);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'BM' }));
    });
    expect(document.body.textContent ?? '').not.toMatch(/awak layak|anda layak|awak akan diterima/i);
  });
});

describe('grade import', () => {
  // Feature: rakan-ulangkaji-mvp, Property 31: Grade import replaces only Matematik
  it('replaces only Matematik, and changes nothing when there is no result', async () => {
    await fc.assert(
      fc.asyncProperty(arbGradeSet, arbGrade, fc.boolean(), async (grades, examGrade, hasResult) => {
        const store = await build(grades, hasResult ? [result(examGrade)] : []);
        const out = store.importMathGradeFromLatestExam();
        if (hasResult) {
          expect(out).toEqual({ status: 'ok', grade: examGrade });
          expect(store.getState().grades).toEqual({ ...grades, matematik: examGrade });
        } else {
          expect(out.status).toBe('no_result');
          expect(store.getState().grades).toEqual(grades);
        }
      }),
      { ...fcConfig, numRuns: 30 },
    );
  });
});
