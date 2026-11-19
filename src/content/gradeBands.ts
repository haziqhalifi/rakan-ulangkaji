import type { GradeBand } from './types';

/**
 * Illustrative percentage to grade bands for one practice paper.
 * These are simplified estimates, not official SPM boundaries.
 * Sorted descending. The first band that matches wins.
 */
export const GRADE_BANDS: readonly GradeBand[] = [
  { minPercent: 90, grade: 'A+' },
  { minPercent: 80, grade: 'A' },
  { minPercent: 70, grade: 'A-' },
  { minPercent: 65, grade: 'B+' },
  { minPercent: 60, grade: 'B' },
  { minPercent: 55, grade: 'C+' },
  { minPercent: 50, grade: 'C' },
  { minPercent: 45, grade: 'D' },
  { minPercent: 40, grade: 'E' },
  { minPercent: 0, grade: 'G' },
];
