import { useMemo, useState } from 'react';
import { PATHWAY_RULES } from '../../content/pathwayRules';
import type { PathwayId } from '../../content/types';
import { useI18n } from '../../core/i18n';
import { useProfileState, useProfileStore } from '../../core/profile';
import { bestHint, evaluateAll, listOpenPathways } from './eligibility';
import { Disclaimer } from './Disclaimer';
import { GradeForm } from './GradeForm';
import { PathwayCards } from './PathwayCards';
import { PathwayDetail } from './PathwayDetail';
import { activeGrades, editGrade, hasAnyGrade, initialWhatIf, setWhatIf, type WhatIfState } from './whatIf';
import '../../styles/board.css';

// Default export for React.lazy. The rule data is imported here, so it ships in this chunk only.
export default function BoardScreen() {
  const { t, pick } = useI18n();
  const store = useProfileStore();
  const { grades: saved } = useProfileState();
  const [whatIf, setWhatIfState] = useState<WhatIfState>(initialWhatIf);
  const [openId, setOpenId] = useState<PathwayId | null>(null);
  const [importMsg, setImportMsg] = useState<'ok' | 'none' | null>(null);

  const grades = activeGrades(whatIf, saved);
  const hasGrades = hasAnyGrade(grades);
  const hints = useMemo(() => (hasGrades ? evaluateAll(grades, PATHWAY_RULES) : []), [grades, hasGrades]);
  const open = listOpenPathways(hints);
  const best = bestHint(hints);
  const nameOf = (id: PathwayId) => {
    const r = PATHWAY_RULES.find((x) => x.pathway === id);
    return r ? pick(r.name) : id;
  };

  const onEdit = (subject: Parameters<typeof editGrade>[1], grade: Parameters<typeof editGrade>[2]) => {
    const out = editGrade(whatIf, subject, grade);
    setWhatIfState(out.state);
    if (out.save) store.setGrade(out.save.subject, out.save.grade);
    setImportMsg(null);
  };

  const onImport = () => {
    const res = store.importMathGradeFromLatestExam();
    setImportMsg(res.status === 'ok' ? 'ok' : 'none');
  };

  const openHint = openId ? hints.find((h) => h.pathway === openId) : undefined;
  const openRule = openId ? PATHWAY_RULES.find((r) => r.pathway === openId) : undefined;

  return (
    <section className="stitched board" aria-labelledby="board-title">
      <h1 id="board-title">{t('board.title')}</h1>
      <Disclaimer />
      {openHint && openRule ? (
        <PathwayDetail
          hint={openHint}
          hints={hints}
          rule={openRule}
          rules={PATHWAY_RULES}
          onBack={() => setOpenId(null)}
        />
      ) : (
        <>
          <p>{t('board.intro')}</p>
          <label className="board-toggle">
            <input
              type="checkbox"
              checked={whatIf.on}
              onChange={(e) => {
                setWhatIfState(setWhatIf(whatIf, e.target.checked, saved));
                setImportMsg(null);
              }}
            />
            <span>{t('board.whatif.toggle')}</span>
          </label>
          <p className="board-note" role="status">
            {whatIf.on ? `${t('board.whatif.badge')}. ${t('board.whatif.help')}` : t('board.whatif.saved')}
          </p>
          <GradeForm grades={grades} predicted={whatIf.on} onChange={onEdit} />
          <div className="board-import">
            <button type="button" className="tap" onClick={onImport} disabled={whatIf.on}>
              {t('board.import.button')}
            </button>
            <p className="board-note" role="status">
              {whatIf.on && t('board.import.blocked')}
              {!whatIf.on && importMsg === 'none' && t('board.import.none')}
              {!whatIf.on && importMsg === 'ok' && t('board.import.ok', { grade: saved.matematik ?? '' })}
            </p>
          </div>
          {!hasGrades ? (
            <p className="board-empty">{t('board.empty')}</p>
          ) : (
            <>
              <h2>{t('board.cards.title')}</h2>
              {open.length === 0 && best && (
                <p className="board-support">{t('board.supportive', { name: nameOf(best.pathway) })}</p>
              )}
              {open.length > 0 && (
                <p className="board-support">
                  {t('board.openSummary', { names: open.map((h) => nameOf(h.pathway)).join(', ') })}
                </p>
              )}
              <PathwayCards hints={hints} rules={PATHWAY_RULES} onOpen={(h) => setOpenId(h.pathway)} />
            </>
          )}
        </>
      )}
    </section>
  );
}
