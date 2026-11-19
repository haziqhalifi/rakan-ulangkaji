import type { Form, Language, Result, StudentProfile, SubjectId } from './types';

/** Raw values from a form. Anything may be wrong, so every field is `unknown`. */
export interface ProfileInput {
  name: unknown;
  form: unknown;
  subjects: unknown;
  language: unknown;
}

export type ProfileField = 'name' | 'form' | 'subjects' | 'language';

export interface ValidationError {
  field: ProfileField;
  code: 'required' | 'too_long' | 'invalid';
}

export const NAME_MAX = 30;
export const SELECTABLE_SUBJECTS: readonly SubjectId[] = ['matematik'];

/**
 * Pure field check shared by onboarding, profile edits and import.
 * Valid means: trimmed name of 1 to 30 characters, form 4 or 5, at least one
 * known subject (and no unknown ones), and a language of bm or en.
 */
export function validateProfileInput(
  input: ProfileInput,
  createdAt: string,
): Result<StudentProfile, ValidationError[]> {
  const errors: ValidationError[] = [];

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length === 0) errors.push({ field: 'name', code: 'required' });
  else if ([...name].length > NAME_MAX) errors.push({ field: 'name', code: 'too_long' });

  if (input.form !== 4 && input.form !== 5) errors.push({ field: 'form', code: 'invalid' });

  const subjects = Array.isArray(input.subjects) ? (input.subjects as unknown[]) : [];
  const knownOnly = subjects.every((s) => (SELECTABLE_SUBJECTS as readonly unknown[]).includes(s));
  if (subjects.length === 0) errors.push({ field: 'subjects', code: 'required' });
  else if (!knownOnly) errors.push({ field: 'subjects', code: 'invalid' });

  if (input.language !== 'bm' && input.language !== 'en') errors.push({ field: 'language', code: 'invalid' });

  if (errors.length > 0) return { ok: false, error: errors };
  return {
    ok: true,
    value: {
      name,
      form: input.form as Form,
      subjects: [...new Set(subjects as SubjectId[])],
      language: input.language as Language,
      createdAt,
    },
  };
}
