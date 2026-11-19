import { describe, expect, it } from 'vitest';
import { formatMarks, markUnit, pluralise } from './plural';

describe('pluralise', () => {
  it('uses one for exactly 1 and other for everything else', () => {
    const forms = { one: 'mark', other: 'marks' };
    expect(pluralise(1, forms)).toBe('mark');
    expect(pluralise(0, forms)).toBe('marks');
    expect(pluralise(2, forms)).toBe('marks');
  });
});

describe('formatMarks', () => {
  it('EN is singular for 1 and plural for 0 and 2', () => {
    expect(formatMarks(0, 'en')).toBe('0 marks');
    expect(formatMarks(1, 'en')).toBe('1 mark');
    expect(formatMarks(2, 'en')).toBe('2 marks');
  });

  it('BM keeps markah for every count', () => {
    expect(formatMarks(0, 'bm')).toBe('0 markah');
    expect(formatMarks(1, 'bm')).toBe('1 markah');
    expect(formatMarks(2, 'bm')).toBe('2 markah');
  });

  it('markUnit returns the word alone', () => {
    expect(markUnit(1, 'en')).toBe('mark');
    expect(markUnit(3, 'en')).toBe('marks');
    expect(markUnit(1, 'bm')).toBe('markah');
  });
});
