import { GRADES, type PersistedData } from '../profile/types';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Hand-written guard for the persisted payload. Checks shape, not every field value. */
export function isPersistedData(v: unknown): v is PersistedData {
  if (!isObject(v)) return false;
  const { profile, progress, grades, chat, examInProgress, settings } = v;
  if (profile !== null && !isObject(profile)) return false;
  if (!isObject(progress)) return false;
  if (!Array.isArray(progress.quizAttempts) || !Array.isArray(progress.examResults)) return false;
  if (!isObject(grades)) return false;
  for (const g of Object.values(grades)) {
    if (typeof g !== 'string' || !(GRADES as readonly string[]).includes(g)) return false;
  }
  if (!Array.isArray(chat)) return false;
  if (examInProgress !== null && !isObject(examInProgress)) return false;
  if (!isObject(settings)) return false;
  return true;
}

