// Fictional students only.
import { defaultSettings, type PersistedData, type StudentProfile } from '../core/profile/types';

export const FICTIONAL_NAMES = ['Aina', 'Daniel', 'Mei Ling', 'Ravi'] as const;

export function sampleProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    name: 'Aina',
    form: 5,
    subjects: ['matematik'],
    language: 'bm',
    createdAt: '2026-11-22T10:00:00.000Z',
    ...overrides,
  };
}

export function sampleData(overrides: Partial<PersistedData> = {}): PersistedData {
  return {
    profile: sampleProfile(),
    progress: { quizAttempts: [], examResults: [] },
    grades: { matematik: 'B' },
    chat: [],
    examInProgress: null,
    settings: defaultSettings(),
    ...overrides,
  };
}
