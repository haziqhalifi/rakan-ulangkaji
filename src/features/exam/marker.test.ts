import { describe, expect, it } from 'vitest';
import { matematikPaper } from '../../content/matematik.paper';
import type { Question } from '../../content/types';
import { gradeForPercent, markPaper, markQuestion, normalise, topicBreakdown } from './marker';

const q = (id: string): Question => {
  const found = matematikPaper.questions.find((x) => x.id === id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
};

describe('normalise', () => {
  it('lowercases, trims and collapses whitespace', () => {
    expect(normalise('  X   =  2.5 ')).toBe('x = 2.5');
  });
  it('strips listed units as whole words only', () => {
    expect(normalise('12 Minutes', ['minutes'])).toBe('12');
    expect(normalise('12minit', ['minit'])).toBe('12');
    expect(normalise('admin', ['min'])).toBe('admin');
  });
  it('treats unit lists with regex symbols safely', () => {
    expect(normalise('5 (cm)', ['(cm)'])).toBe('5');
  });
});

describe('objective questions', () => {
  const obj = q('mat-f4-ind-03');
  it('awards the mark for the right option, any case or spacing', () => {
    expect(markQuestion(obj, 'D').marks).toBe(1);
    expect(markQuestion(obj, ' d ').marks).toBe(1);
  });
  it('awards nothing for a wrong option', () => {
    const r = markQuestion(obj, 'B');
    expect(r.marks).toBe(0);
    expect(r.unanswered).toBe(false);
    expect(r.points[0]?.earned).toBe(false);
  });
});

describe('structured questions', () => {
  const s = q('mat-f5-var-s1');
  it('strips units and accepts decimal and fraction style variants', () => {
    expect(markQuestion(s, 'k = 60\nt = 60/n\n12 minit').marks).toBe(4);
    expect(markQuestion(s, '60; t=60 / n; 12 MINUTES').marks).toBe(4);
    const ind = q('mat-f4-ind-s1');
    expect(markQuestion(ind, '3^4\n2x - 1 = 4\n5/2').marks).toBe(4);
    expect(markQuestion(ind, '3^4\n2x = 5\nx = 2.5').marks).toBe(4);
  });
  it('gives partial credit per point', () => {
    const r = markQuestion(s, 'k = 60\nt = 20/n\n9');
    expect(r.marks).toBe(1);
    expect(r.points.map((p) => p.earned)).toEqual([true, false, false]);
    expect(r.points[2]?.marksAvailable).toBe(2);
  });
  it('is not fooled by one right line repeated', () => {
    const sets = q('mat-f4-set-s1');
    expect(markQuestion(sets, '30\n30\n30\n30').marks).toBe(1);
  });
  it('marks one correct and one wrong answer for every point', () => {
    for (const question of matematikPaper.questions.filter((x) => x.kind === 'structured')) {
      question.skema.forEach((point, i) => {
        const lines = question.skema.map((_p, j) => (j === i ? point.accepted[0] : 'wrong 999'));
        const r = markQuestion(question, lines.join('\n'));
        expect(r.points[i]?.earned, `${question.id}/${point.id}`).toBe(true);
        expect(r.marks).toBeGreaterThanOrEqual(point.marks);
      });
      const none = markQuestion(question, 'wrong 999\nwrong 998');
      expect(none.marks).toBe(0);
    }
  });
});

describe('unanswered', () => {
  it('reports unanswered for missing and blank answers', () => {
    expect(markQuestion(q('mat-f4-ind-01'), undefined).unanswered).toBe(true);
    expect(markQuestion(q('mat-f4-ind-01'), '   ').unanswered).toBe(true);
    expect(markQuestion(q('mat-f4-ind-01'), 'A').unanswered).toBe(false);
  });
});

describe('markPaper', () => {
  const meta = { submittedAt: '2026-11-24T10:00:00.000Z', id: 'r1', trigger: 'timeout' as const };
  const total = matematikPaper.questions.reduce((n, x) => n + x.marks, 0);

  it('scores a perfect and an empty paper', () => {
    const answers: Record<string, string> = {};
    for (const question of matematikPaper.questions) {
      answers[question.id] = question.skema.map((p) => p.accepted[0]).join('\n');
    }
    const full = markPaper(matematikPaper, answers, meta);
    expect(full.totalEarned).toBe(total);
    expect(full.percent).toBe(100);
    expect(full.grade).toBe('A+');
    expect(full.trigger).toBe('timeout');
    expect(full.paperId).toBe(matematikPaper.id);

    const empty = markPaper(matematikPaper, {}, meta);
    expect(empty.totalEarned).toBe(0);
    expect(empty.grade).toBe('G');
    expect(empty.questions.every((r) => r.unanswered)).toBe(true);
  });

  it('builds a topic breakdown in paper order', () => {
    const r = markPaper(matematikPaper, { 'mat-f4-ind-01': 'B' }, meta);
    const topics = topicBreakdown(r.questions, matematikPaper);
    expect(topics).toEqual(r.topics);
    expect(topics[0]).toMatchObject({ topic: 'f4-indices', earned: 1 });
    expect(topics[0]?.ratio).toBe(Math.round((1 / topics[0]!.available) * 100) / 100);
  });
});

describe('gradeForPercent', () => {
  it('uses the band boundaries', () => {
    expect(gradeForPercent(90)).toBe('A+');
    expect(gradeForPercent(89.9)).toBe('A');
    expect(gradeForPercent(40)).toBe('E');
    expect(gradeForPercent(39.9)).toBe('G');
  });
});
