// Pure state helper for the board's "what if" mode.
// While the mode is on, edits only touch `predicted`. The saved Grade_Set is never passed in for writing.
import type { Grade, Grade_Set, SpmSubject } from '../../core/profile/types';

export interface WhatIfState {
  on: boolean;
  predicted: Grade_Set;
}

export const initialWhatIf: WhatIfState = { on: false, predicted: {} };

/** Turning on starts from a copy of the saved grades. Turning off discards the predicted grades. */
export function setWhatIf(state: WhatIfState, on: boolean, saved: Grade_Set): WhatIfState {
  if (on === state.on) return state;
  return on ? { on: true, predicted: { ...saved } } : { on: false, predicted: {} };
}

/** The grades the hints and the form should show. */
export function activeGrades(state: WhatIfState, saved: Grade_Set): Grade_Set {
  return state.on ? state.predicted : saved;
}

export type EditOutcome = { state: WhatIfState; save?: { subject: SpmSubject; grade: Grade } };

/** What-if on: change the predicted copy only. Off: ask the caller to save through the Profile_Store. */
export function editGrade(state: WhatIfState, subject: SpmSubject, grade: Grade): EditOutcome {
  if (state.on) return { state: { on: true, predicted: { ...state.predicted, [subject]: grade } } };
  return { state, save: { subject, grade } };
}

export function hasAnyGrade(grades: Grade_Set): boolean {
  return Object.values(grades).some((g) => g !== undefined);
}
