import type { PathwayRule } from '../../content/types';
import { useI18n } from '../../core/i18n';
import { listOpenPathways, type Hint } from './eligibility';
import { LevelBadge } from './PathwayCards';
import { reasonText, suggestionText } from './reasonText';

export function PathwayDetail(props: {
  hint: Hint;
  hints: Hint[];
  rule: PathwayRule;
  rules: readonly PathwayRule[];
  onBack: () => void;
}) {
  const { t, pick } = useI18n();
  const { hint, rule } = props;
  const open = listOpenPathways(props.hints).filter((h) => h.pathway !== hint.pathway);
  const nameOf = (id: string) => {
    const r = props.rules.find((x) => x.pathway === id);
    return r ? pick(r.name) : id;
  };
  return (
    <section className="board-detail" aria-labelledby="board-detail-title">
      <button type="button" className="tap board-back" onClick={props.onBack}>
        {t('board.detail.back')}
      </button>
      <h2 id="board-detail-title">{pick(rule.name)}</h2>
      <LevelBadge level={hint.level} />
      <h3>{t('board.detail.needs')}</h3>
      <p>{pick(rule.usuallyNeeds)}</p>
      <h3>{t('board.detail.why')}</h3>
      <ul>
        {hint.reasons.map((r) => (
          <li key={r.conditionId}>{reasonText(t, r)}</li>
        ))}
      </ul>
      <h3>{t('board.detail.change')}</h3>
      <p>{hint.suggestions.length > 0 ? suggestionText(t, hint.suggestions) : t('board.detail.alreadyOpen')}</p>
      <h3>{t('board.detail.next')}</h3>
      <p>{pick(rule.nextStep)}</p>
      <p className="board-reviewed">{t('board.detail.reviewed', { date: rule.lastReviewed })}</p>
      {hint.level !== 'may_be_open' && open.length > 0 && (
        <>
          <h3>{t('board.detail.openList')}</h3>
          <ul>
            {open.map((h) => (
              <li key={h.pathway}>{nameOf(h.pathway)}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
