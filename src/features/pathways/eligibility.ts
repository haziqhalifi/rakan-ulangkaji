// Eligibility engine. Pure rule code: no network, no core/ai, no React.
// Every condition is a threshold on grade ranks, and the level only depends on which
// conditions are met and how far the unmet ones are, so better grades never lower a level.
import type { Condition, PathwayId, PathwayRule } from '../../content/types';
import { GRADES, type Grade, type Grade_Set, type SpmSubject } from '../../core/profile/types';

export type HintLevel = 'may_be_open' | 'may_need_more' | 'check_closely';
/** Higher is better. */
export const HINT_ORDER: Record<HintLevel, number> = { check_closely: 0, may_need_more: 1, may_be_open: 2 };

export const PATHWAY_ORDER: readonly PathwayId[] = ['matrikulasi', 'asasi', 'stpm', 'diploma', 'tvet', 'foundation'];
export const SUBJECT_ORDER: readonly SpmSubject[] = ['bm', 'bi', 'matematik', 'sejarah', 'sains'];

/** A+ is 9 and G is 0. */
export function gradeRank(g: Grade): number {
  return GRADES.length - 1 - GRADES.indexOf(g);
}

function gradeFromRank(rank: number): Grade {
  return GRADES[GRADES.length - 1 - rank] as Grade;
}

export interface ReasonItem {
  conditionId: string;
  kind: 'minGrade' | 'minCount' | 'noRule';
  strength: 'core' | 'soft';
  met: boolean;
  /** The grade the condition asks for. Absent only for `noRule`. */
  required?: Grade;
  /** minGrade: the subject. */
  subject?: SpmSubject;
  /** minGrade: the student's grade, when there is one. */
  have?: Grade;
  /** minCount: how many subjects are needed and how many already count. */
  count?: number;
  haveCount?: number;
  /** Subjects with no grade that this condition looks at. Only set when the condition is unmet. */
  missingSubjects: SpmSubject[];
}

export interface Suggestion {
  subject: SpmSubject;
  targetGrade: Grade;
}

export interface Hint {
  pathway: PathwayId;
  level: HintLevel;
  reasons: ReasonItem[];
  /** Together, these changes are the smallest found that lift the level. Empty when already open. */
  suggestions: Suggestion[];
}

interface Check {
  met: boolean;
  /** Total grade steps still needed. 0 when met. */
  distance: number;
  item: ReasonItem;
}

const rankOf = (grades: Grade_Set, subject: SpmSubject): number => {
  const g = grades[subject];
  return g === undefined ? -1 : gradeRank(g);
};

function poolOf(c: Extract<Condition, { kind: 'minCount' }>): readonly SpmSubject[] {
  return c.subjects === 'any' ? SUBJECT_ORDER : c.subjects;
}

function check(grades: Grade_Set, c: Condition): Check {
  const need = gradeRank(c.grade);
  if (c.kind === 'minGrade') {
    const have = rankOf(grades, c.subject);
    const met = have >= need;
    return {
      met,
      distance: met ? 0 : need - have,
      item: {
        conditionId: c.id,
        kind: 'minGrade',
        strength: c.strength,
        met,
        required: c.grade,
        subject: c.subject,
        have: grades[c.subject],
        missingSubjects: !met && have < 0 ? [c.subject] : [],
      },
    };
  }
  const pool = poolOf(c);
  const ranks = pool.map((s) => rankOf(grades, s)).sort((a, b) => b - a);
  const haveCount = ranks.filter((r) => r >= need).length;
  const met = haveCount >= c.count;
  let distance = 0;
  for (let i = 0; i < c.count; i++) distance += Math.max(0, need - (ranks[i] ?? -1));
  return {
    met,
    distance: met ? 0 : distance,
    item: {
      conditionId: c.id,
      kind: 'minCount',
      strength: c.strength,
      met,
      required: c.grade,
      count: c.count,
      haveCount,
      missingSubjects: met ? [] : pool.filter((s) => grades[s] === undefined),
    },
  };
}

function levelFrom(checks: Check[], conditions: Condition[]): HintLevel {
  const coreUnmet = checks.filter((k, i) => !k.met && conditions[i]?.strength === 'core');
  const softUnmet = checks.filter((k, i) => !k.met && conditions[i]?.strength === 'soft');
  if (coreUnmet.length === 0) return softUnmet.length === 0 ? 'may_be_open' : 'may_need_more';
  if (coreUnmet.length === 1 && coreUnmet[0]?.distance === 1) return 'may_need_more';
  return 'check_closely';
}

function levelOf(grades: Grade_Set, rule: PathwayRule): HintLevel {
  return levelFrom(
    rule.conditions.map((c) => check(grades, c)),
    rule.conditions,
  );
}

/** Grades worth trying for one subject: the thresholds in the rule that sit above the current grade. */
function thresholdsFor(rule: PathwayRule, subject: SpmSubject, currentRank: number): Grade[] {
  const ranks = new Set<number>();
  for (const c of rule.conditions) {
    const applies = c.kind === 'minGrade' ? c.subject === subject : poolOf(c).includes(subject);
    if (applies && gradeRank(c.grade) > currentRank) ranks.add(gradeRank(c.grade));
  }
  return [...ranks].sort((a, b) => a - b).map(gradeFromRank);
}

/** The cheapest set of changes (fewest subjects, then fewest grade steps) that lifts the level. */
function suggest(grades: Grade_Set, rule: PathwayRule, level: HintLevel): Suggestion[] {
  if (level === 'may_be_open') return [];
  const options = SUBJECT_ORDER.map((s) => thresholdsFor(rule, s, rankOf(grades, s)));
  let best: { cost: [number, number]; picks: Suggestion[] } | null = null;

  const walk = (i: number, trial: Grade_Set, picks: Suggestion[], steps: number): void => {
    if (i === SUBJECT_ORDER.length) {
      if (picks.length === 0 || HINT_ORDER[levelOf(trial, rule)] <= HINT_ORDER[level]) return;
      const better =
        best === null || picks.length < best.cost[0] || (picks.length === best.cost[0] && steps < best.cost[1]);
      if (better) best = { cost: [picks.length, steps], picks };
      return;
    }
    const subject = SUBJECT_ORDER[i] as SpmSubject;
    walk(i + 1, trial, picks, steps);
    for (const target of options[i] ?? []) {
      walk(
        i + 1,
        { ...trial, [subject]: target },
        [...picks, { subject, targetGrade: target }],
        steps + gradeRank(target) - rankOf(grades, subject),
      );
    }
  };
  walk(0, grades, [], 0);
  return (best as { picks: Suggestion[] } | null)?.picks ?? [];
}

function orderedReasons(items: ReasonItem[]): ReasonItem[] {
  const unmet = items.filter((r) => !r.met);
  const rank = (r: ReasonItem) => (r.strength === 'core' ? 0 : 1);
  if (unmet.length > 0) return [...unmet].sort((a, b) => rank(a) - rank(b));
  // Everything is met: show the tightest passing core condition, or the first condition.
  const core = items.filter((r) => r.strength === 'core');
  const pool = core.length > 0 ? core : items;
  const tightest = [...pool].sort((a, b) => gradeRank(b.required ?? 'G') - gradeRank(a.required ?? 'G'))[0];
  return tightest ? [tightest] : [];
}

export function evaluatePathway(grades: Grade_Set, rule: PathwayRule): Hint {
  const checks = rule.conditions.map((c) => check(grades, c));
  const level = levelFrom(checks, rule.conditions);
  return {
    pathway: rule.pathway,
    level,
    reasons: orderedReasons(checks.map((k) => k.item)),
    suggestions: suggest(grades, rule, level),
  };
}

function missingRuleHint(pathway: PathwayId): Hint {
  return {
    pathway,
    level: 'check_closely',
    reasons: [{ conditionId: 'no_rule', kind: 'noRule', strength: 'core', met: false, missingSubjects: [] }],
    suggestions: [],
  };
}

/** Exactly six hints, in the fixed pathway order. Total: any grade set, even an empty one. */
export function evaluateAll(grades: Grade_Set, rules: readonly PathwayRule[]): Hint[] {
  return PATHWAY_ORDER.map((id) => {
    const rule = rules.find((r) => r.pathway === id);
    return rule ? evaluatePathway(grades, rule) : missingRuleHint(id);
  });
}

/** The hint with the best level. Ties go to the earlier pathway in the fixed order. */
export function bestHint(hints: readonly Hint[]): Hint | undefined {
  let best: Hint | undefined;
  for (const h of hints) {
    if (!best || HINT_ORDER[h.level] > HINT_ORDER[best.level]) best = h;
    else if (HINT_ORDER[h.level] === HINT_ORDER[best.level] && PATHWAY_ORDER.indexOf(h.pathway) < PATHWAY_ORDER.indexOf(best.pathway)) best = h;
  }
  return best;
}

export function listOpenPathways(hints: readonly Hint[]): Hint[] {
  return hints.filter((h) => h.level === 'may_be_open');
}

/** Apply a hint's suggestions to a grade set. Used by tests and the what-if shortcut. */
export function applySuggestions(grades: Grade_Set, suggestions: readonly Suggestion[]): Grade_Set {
  const next: Grade_Set = { ...grades };
  for (const s of suggestions) next[s.subject] = s.targetGrade;
  return next;
}
