import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Paper } from '../../content/types';
import { useI18n } from '../../core/i18n';
import type { ProfileStore } from '../../core/profile';
import {
  answeredCount,
  createSubmitGuard,
  type SubmitGuard,
  runnerReducer,
  timerOf,
  toInProgress,
  type RunnerState,
  type SubmitTrigger,
} from './runnerLogic';
import { formatMmSs, remainingMs, shouldWarn } from './timer';

export type Announcement = 'warning' | 'autoSubmitted';

export const TICK_MS = 250;
export const SAVE_DEBOUNCE_MS = 300;
export const SAVE_INTERVAL_MS = 10_000;

export interface RunnerProps {
  paper: Paper;
  initial: RunnerState;
  store: Pick<ProfileStore, 'saveExamInProgress'>;
  onSubmit: (trigger: SubmitTrigger, answers: Record<string, string>) => void;
  onAnnounce: (a: Announcement) => void;
}

export function Runner(props: RunnerProps) {
  const { paper, initial, store, onSubmit, onAnnounce } = props;
  const { t, pick } = useI18n();
  const count = paper.questions.length;
  const [state, dispatch] = useReducer((s: RunnerState, a: Parameters<typeof runnerReducer>[1]) => runnerReducer(s, a, count), initial);
  const [remaining, setRemaining] = useState(() => remainingMs(timerOf(initial), Date.now()));
  const [confirming, setConfirming] = useState(false);

  const stateRef = useRef(state);
  const submitRef = useRef(onSubmit);
  const announceRef = useRef(onAnnounce);
  useEffect(() => {
    stateRef.current = state;
    submitRef.current = onSubmit;
    announceRef.current = onAnnounce;
  });
  const guardRef = useRef<SubmitGuard | null>(null);
  // Created on first use, from an effect or an event handler, never during render.
  const getGuard = useCallback((): SubmitGuard => {
    guardRef.current ??= createSubmitGuard((trigger, answers) => submitRef.current(trigger, answers));
    return guardRef.current;
  }, []);

  const saveNow = useCallback(() => {
    if (getGuard().submitted) return;
    store.saveExamInProgress(toInProgress(stateRef.current));
  }, [getGuard, store]);

  const check = useCallback(() => {
    const s = stateRef.current;
    const now = Date.now();
    const left = remainingMs(timerOf(s), now);
    // Only re-render when the displayed second changes.
    setRemaining((prev) => (formatMmSs(prev) === formatMmSs(left) ? prev : left));
    if (left === 0) {
      if (getGuard().fire('timeout', s.answers)) announceRef.current('autoSubmitted');
      return;
    }
    if (shouldWarn(timerOf(s), now, s.warned)) {
      stateRef.current = { ...s, warned: true };
      dispatch({ type: 'warned' });
      announceRef.current('warning');
      saveNow();
    }
  }, [getGuard, saveNow]);

  // Recompute from Date.now() on every tick, so a hidden tab or sleep cannot drift the clock.
  useEffect(() => {
    check();
    const id = setInterval(check, TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  // Save after each change (debounced) and on a steady interval.
  useEffect(() => {
    const id = setTimeout(saveNow, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [state, saveNow]);
  useEffect(() => {
    const id = setInterval(saveNow, SAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [saveNow]);
  useEffect(() => saveNow, [saveNow]); // flush when leaving the screen

  const q = paper.questions[state.currentIndex];
  if (!q) return null;
  const ids = paper.questions.map((x) => x.id);
  const answered = answeredCount(state.answers, ids);
  const value = state.answers[q.id] ?? '';
  const setAnswer = (text: string) => dispatch({ type: 'answer', questionId: q.id, text });

  return (
    <div className="exam-runner">
      <div className="exam-timer-bar">
        <div role="timer" aria-live="off" aria-label={t('exam.timer.label')} className="exam-timer">
          <span className="exam-timer-label">{t('exam.timer.label')}</span>{' '}
          <span className="exam-timer-value">{formatMmSs(remaining)}</span>
        </div>
        {state.warned && remaining > 0 && (
          <p className="exam-warning">
            <span aria-hidden="true">{'\u26A0'}</span> {t('exam.warning')}
          </p>
        )}
      </div>

      <nav aria-label={t('exam.nav.list')}>
        <ul className="exam-grid">
          {paper.questions.map((x, i) => {
            const done = (state.answers[x.id] ?? '').trim() !== '';
            return (
              <li key={x.id}>
                <button
                  type="button"
                  className="exam-grid-btn"
                  aria-current={i === state.currentIndex ? 'step' : undefined}
                  aria-label={t('exam.nav.goto', {
                    n: i + 1,
                    status: done ? t('exam.nav.answered') : t('exam.nav.empty'),
                  })}
                  onClick={() => dispatch({ type: 'goto', index: i })}
                >
                  {i + 1}
                  {done && <span aria-hidden="true"> {'\u2713'}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="exam-question" aria-labelledby="exam-q-heading">
        <h2 id="exam-q-heading">
          {t('exam.question.of', { n: state.currentIndex + 1, total: count })}{' '}
          <span className="exam-marks">({t('exam.marks', { marks: q.marks })})</span>
        </h2>
        {q.kind === 'objective' ? (
          <fieldset>
            <legend className="exam-q-text">{pick(q.question)}</legend>
            <p className="exam-note">{t('exam.answer.objective')}</p>
            {(q.options ?? []).map((o) => (
              <label key={o.id} className="exam-option tap">
                <input
                  type="radio"
                  name={q.id}
                  value={o.id}
                  checked={value === o.id}
                  onChange={() => setAnswer(o.id)}
                />{' '}
                {o.id}. {pick(o.label)}
              </label>
            ))}
          </fieldset>
        ) : (
          <div>
            <p className="exam-q-text">{pick(q.question)}</p>
            <label htmlFor={`ans-${q.id}`}>{t('exam.answer.label')}</label>
            <p className="exam-note">{t('exam.answer.structured')}</p>
            <textarea
              id={`ans-${q.id}`}
              rows={5}
              value={value}
              onChange={(e) => setAnswer(e.target.value)}
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>
        )}
      </section>

      <div className="exam-actions">
        <button type="button" className="tap" disabled={state.currentIndex === 0} onClick={() => dispatch({ type: 'prev' })}>
          {t('exam.nav.prev')}
        </button>
        <button type="button" className="tap" disabled={state.currentIndex >= count - 1} onClick={() => dispatch({ type: 'next' })}>
          {t('exam.nav.next')}
        </button>
        <button type="button" className="tap exam-submit" onClick={() => setConfirming(true)}>
          {t('exam.submit')}
        </button>
      </div>

      {confirming && (
        <div className="exam-confirm" role="dialog" aria-modal="true" aria-labelledby="exam-confirm-title">
          <h2 id="exam-confirm-title">{t('exam.confirm.title')}</h2>
          <p>{t('exam.confirm.body', { answered, total: count })}</p>
          <div className="exam-actions">
            <button
              type="button"
              className="tap exam-submit"
              onClick={() => {
                getGuard().fire('manual', stateRef.current.answers);
              }}
            >
              {t('exam.confirm.yes')}
            </button>
            <button type="button" className="tap" onClick={() => setConfirming(false)}>
              {t('exam.confirm.no')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
