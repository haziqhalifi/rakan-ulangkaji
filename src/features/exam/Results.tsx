import { topicLabel } from '../../content/questionBank';
import type { Paper } from '../../content/types';
import { useI18n } from '../../core/i18n';
import type { Exam_Result } from '../../core/profile';
import { useNavigate } from '../../app/NavigationContext';

function encouragementKey(percent: number) {
  if (percent >= 70) return 'exam.results.encourage.high' as const;
  if (percent >= 45) return 'exam.results.encourage.mid' as const;
  return 'exam.results.encourage.low' as const;
}

export function Results(props: { paper: Paper; result: Exam_Result; onAgain: () => void }) {
  const { paper, result, onAgain } = props;
  const { t, pick } = useI18n();
  const navigate = useNavigate();
  const note = result.trigger === 'manual' ? null : t(`exam.results.auto.${result.trigger}`);

  return (
    <div className="exam-results">
      <h2>{t('exam.results.title')}</h2>
      {note && <p className="exam-note">{note}</p>}
      <p className="exam-total">
        {t('exam.results.total', {
          earned: result.totalEarned,
          available: result.totalAvailable,
          percent: result.percent,
        })}
      </p>
      <p className="exam-grade">{t('exam.results.grade', { grade: result.grade })}</p>
      <p className="exam-note">{t('exam.results.gradeNote')}</p>
      <p>{t(encouragementKey(result.percent))}</p>

      <h3>{t('exam.results.topics')}</h3>
      <ul className="exam-topics">
        {result.topics.map((s) => (
          <li key={s.topic}>
            {t('exam.results.topicLine', {
              topic: pick(topicLabel(s.topic)),
              earned: s.earned,
              available: s.available,
              percent: Math.round(s.ratio * 100),
            })}
          </li>
        ))}
      </ul>

      <h3>{t('exam.results.questions')}</h3>
      <ol className="exam-review">
        {paper.questions.map((q) => {
          const r = result.questions.find((x) => x.questionId === q.id);
          if (!r) return null;
          return (
            <li key={q.id} className="exam-review-item">
              <p className="exam-q-text">{pick(q.question)}</p>
              <p className="exam-score">
                {t('exam.results.score', { earned: r.marks, available: r.marksAvailable })}
                {r.unanswered && <strong> {t('exam.results.unanswered')}</strong>}
              </p>
              <ul className="exam-points">
                {q.skema.map((p) => {
                  const pr = r.points.find((x) => x.pointId === p.id);
                  const earned = pr?.earned === true;
                  return (
                    <li key={p.id} className={earned ? 'point-earned' : 'point-missed'}>
                      <span aria-hidden="true">{earned ? '\u2713' : '\u2717'}</span>{' '}
                      <strong>{earned ? t('exam.results.earned') : t('exam.results.missed')}</strong>:{' '}
                      {pick(p.point)} ({t('exam.marks', { marks: p.marks })})
                    </li>
                  );
                })}
              </ul>
              <p className="exam-explain">
                <strong>{t('exam.results.explanation')}:</strong> {pick(q.explanation)}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="exam-actions">
        <div className="exam-pathways">
          <button type="button" className="tap" onClick={() => navigate('board')}>
            {t('exam.results.pathways')}
          </button>
          <span className="exam-note">{t('exam.results.pathwaysNote')}</span>
        </div>
        <button type="button" className="tap" onClick={onAgain}>
          {t('exam.results.again')}
        </button>
      </div>
    </div>
  );
}
