import type { PathwayRule } from '../../content/types';
import { useI18n } from '../../core/i18n';
import type { Hint, HintLevel } from './eligibility';

export const LEVEL_ICON: Record<HintLevel, string> = {
  may_be_open: '\u2713',
  may_need_more: '~',
  check_closely: '?',
};

export function LevelBadge(props: { level: HintLevel }) {
  const { t } = useI18n();
  return (
    <span className={`board-level board-level-${props.level}`}>
      <span aria-hidden="true">{LEVEL_ICON[props.level]}</span> {t(`board.level.${props.level}`)}
    </span>
  );
}

export function PathwayCards(props: {
  hints: Hint[];
  rules: readonly PathwayRule[];
  onOpen: (hint: Hint) => void;
}) {
  const { t, pick } = useI18n();
  return (
    <ul className="board-cards">
      {props.hints.map((h) => {
        const rule = props.rules.find((r) => r.pathway === h.pathway);
        const name = rule ? pick(rule.name) : h.pathway;
        return (
          <li key={h.pathway}>
            <button
              type="button"
              className={`board-card board-card-${h.level}`}
              aria-label={t('board.card.open', { name, level: t(`board.level.${h.level}`) })}
              onClick={() => props.onOpen(h)}
            >
              <strong>{name}</strong>
              <LevelBadge level={h.level} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
