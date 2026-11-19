import type { I18nValue } from '../../core/i18n';
import type { SpmSubject } from '../../core/profile/types';
import type { ReasonItem, Suggestion } from './eligibility';

export function subjectName(t: I18nValue['t'], subject: SpmSubject): string {
  return t(`subject.${subject}`);
}

/** Turn one structured reason into a sentence in the selected language. */
export function reasonText(t: I18nValue['t'], r: ReasonItem): string {
  const grade = r.required ?? '';
  let text: string;
  if (r.kind === 'noRule') return t('board.reason.noRule');
  if (r.kind === 'minGrade' && r.subject) {
    const subject = subjectName(t, r.subject);
    if (r.met) text = t('board.reason.minGrade.met', { subject, grade, have: r.have ?? '' });
    else if (r.have) text = t('board.reason.minGrade.have', { subject, grade, have: r.have });
    else text = t('board.reason.minGrade.missing', { subject, grade });
  } else {
    const params = { count: r.count ?? 0, grade, haveCount: r.haveCount ?? 0 };
    text = t(r.met ? 'board.reason.minCount.met' : 'board.reason.minCount', params);
    if (!r.met && r.missingSubjects.length > 0) {
      const subjects = r.missingSubjects.map((s) => subjectName(t, s)).join(', ');
      text += ` ${t('board.reason.missingList', { subjects })}`;
    }
  }
  if (!r.met && r.strength === 'soft') text += ` ${t('board.reason.softTag')}`;
  return text;
}

export function suggestionText(t: I18nValue['t'], list: readonly Suggestion[]): string {
  const changes = list
    .map((s) => t('board.detail.changeItem', { subject: subjectName(t, s.subject), grade: s.targetGrade }))
    .join(', ');
  return t('board.detail.changeLine', { changes });
}
