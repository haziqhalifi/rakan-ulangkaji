import { useCallback, useEffect, useState } from 'react';
import type { Paper } from '../../content/types';
import { useI18n } from '../../core/i18n';
import { useProfileState, useProfileStore, type Exam_Result } from '../../core/profile';
import { Results } from './Results';
import { Runner, type Announcement } from './Runner';
import { decideResume, initialRunnerState, newRunnerState, type RunnerState, type SubmitTrigger } from './runnerLogic';
import { finalizeExam } from './submit';
import { examDurationMs, formatMmSs, remainingMs } from './timer';
import '../../styles/exam.css';

type Phase =
  | { name: 'loading' }
  | { name: 'loadFailed' }
  | { name: 'instructions' }
  | { name: 'resume'; state: RunnerState; leftMs: number }
  | { name: 'running'; state: RunnerState }
  | { name: 'markFailed'; answers: Record<string, string>; trigger: SubmitTrigger }
  | { name: 'results'; result: Exam_Result };

// Default export for React.lazy. The Paper itself loads on mount, in a separate chunk.
export default function ExamScreen() {
  const { t, pick } = useI18n();
  const store = useProfileStore();
  const { settings } = useProfileState();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  const mark = useCallback(
    (p: Paper, answers: Record<string, string>, trigger: SubmitTrigger) => {
      const res = finalizeExam(p, answers, trigger, store);
      setPhase(res.ok ? { name: 'results', result: res.value } : { name: 'markFailed', answers, trigger });
    },
    [store],
  );

  useEffect(() => {
    let cancelled = false;
    import('../../content/matematik.paper')
      .then((m) => {
        if (cancelled) return;
        const p = m.default;
        setPaper(p);
        const saved = store.getState().examInProgress;
        if (saved && saved.paperId === p.id) {
          if (decideResume(saved, Date.now()) === 'auto_submit') {
            setAnnouncement('autoSubmitted');
            mark(p, saved.answers, 'resume_expired');
          } else {
            setPhase({ name: 'resume', state: initialRunnerState(saved), leftMs: remainingMs(saved, Date.now()) });
          }
        } else {
          setPhase({ name: 'instructions' });
        }
      })
      .catch(() => {
        if (!cancelled) setPhase({ name: 'loadFailed' });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, store, mark]);

  const durationMs = paper ? examDurationMs(paper.durationMinutes, settings.demoShortTimer) : 0;

  const start = () => {
    if (!paper) return;
    setAnnouncement(null);
    setPhase({ name: 'running', state: newRunnerState(paper.id, Date.now(), durationMs) });
  };

  return (
    <section className="stitched exam" aria-labelledby="exam-title">
      <h1 id="exam-title">{t('exam.title')}</h1>
      <div className="visually-hidden" role="status" aria-live="assertive">
        {announcement === 'warning' && t('exam.warning')}
        {announcement === 'autoSubmitted' && t('exam.autoSubmitted')}
      </div>

      {phase.name === 'loading' && <p role="status">{t('exam.loading')}</p>}

      {phase.name === 'loadFailed' && (
        <div>
          <p role="alert">{t('exam.loadFailed')}</p>
          <button type="button" className="tap" onClick={() => {
              setPhase({ name: 'loading' });
              setAttempt((n) => n + 1);
            }}>
            {t('exam.retry')}
          </button>
        </div>
      )}

      {phase.name === 'instructions' && paper && (
        <div className="exam-instructions">
          <h2>{t('exam.instructions.title')}</h2>
          <p className="exam-paper-title">{pick(paper.title)}</p>
          <ul>
            <li>
              {settings.demoShortTimer
                ? t('exam.instructions.demoDuration', { seconds: Math.round(durationMs / 1000) })
                : t('exam.instructions.duration', { minutes: paper.durationMinutes })}
            </li>
            <li>{t('exam.instructions.questions', { count: paper.questions.length })}</li>
            <li>{t('exam.instructions.marks', { marks: paper.questions.reduce((n, q) => n + q.marks, 0) })}</li>
          </ul>
          <p>{t('exam.instructions.timerNote')}</p>
          <p>{t('exam.instructions.saveNote')}</p>
          <button type="button" className="tap exam-submit" onClick={start}>
            {t('exam.start')}
          </button>
        </div>
      )}

      {phase.name === 'resume' && paper && (
        <div className="exam-instructions">
          <h2>{t('exam.resume.title')}</h2>
          <p>{t('exam.resume.body', { time: formatMmSs(phase.leftMs) })}</p>
          <div className="exam-actions">
            <button type="button" className="tap exam-submit" onClick={() => setPhase({ name: 'running', state: phase.state })}>
              {t('exam.resume.continue')}
            </button>
            <button
              type="button"
              className="tap"
              onClick={() => {
                store.saveExamInProgress(null);
                setPhase({ name: 'instructions' });
              }}
            >
              {t('exam.resume.discard')}
            </button>
          </div>
        </div>
      )}

      {phase.name === 'running' && paper && (
        <Runner
          paper={paper}
          initial={phase.state}
          store={store}
          onSubmit={(trigger, answers) => mark(paper, answers, trigger)}
          onAnnounce={setAnnouncement}
        />
      )}

      {phase.name === 'markFailed' && paper && (
        <div>
          <p role="alert">{t('exam.markFailed')}</p>
          <button type="button" className="tap" onClick={() => mark(paper, phase.answers, phase.trigger)}>
            {t('exam.retry')}
          </button>
        </div>
      )}

      {phase.name === 'results' && paper && (
        <Results paper={paper} result={phase.result} onAgain={() => setPhase({ name: 'instructions' })} />
      )}
    </section>
  );
}
