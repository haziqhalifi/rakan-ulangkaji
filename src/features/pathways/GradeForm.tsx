import { GRADES, type Grade, type Grade_Set, type SpmSubject } from '../../core/profile/types';
import { useI18n } from '../../core/i18n';
import { SUBJECT_ORDER } from './eligibility';

export function GradeForm(props: {
  grades: Grade_Set;
  predicted: boolean;
  onChange: (subject: SpmSubject, grade: Grade) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="board-grades" role="group" aria-label={t('board.grades.title')}>
      {SUBJECT_ORDER.map((subject) => {
        const value = props.grades[subject] ?? '';
        const id = `grade-${subject}`;
        return (
          <label key={subject} className="board-grade" htmlFor={id}>
            <span>
              {t(`subject.${subject}`)}
              {props.predicted && <em className="board-tag"> {t('board.whatif.predictedTag')}</em>}
            </span>
            <select
              id={id}
              className="tap"
              value={value}
              onChange={(e) => {
                const g = GRADES.find((x) => x === e.target.value);
                if (g) props.onChange(subject, g);
              }}
            >
              <option value="" disabled>
                {t('board.grade.choose')}
              </option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}
