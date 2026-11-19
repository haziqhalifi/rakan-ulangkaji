import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbProfileInput } from '../../test/arbitraries/profileInput';
import { fcCheapConfig } from '../../test/fcConfig';
import { fakeDurableBackend } from '../../test/helpers';
import { createStorageService } from '../storage/StorageService';
import { createProfileStore } from './ProfileStore';
import { validateProfileInput, type ProfileField } from './validation';

const AT = '2026-11-23T10:00:00.000Z';

/** The rules written out independently of the implementation. */
function expectedBad(input: { name: unknown; form: unknown; subjects: unknown; language: unknown }): ProfileField[] {
  const bad: ProfileField[] = [];
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length < 1 || [...name].length > 30) bad.push('name');
  if (input.form !== 4 && input.form !== 5) bad.push('form');
  const subs = input.subjects;
  if (!Array.isArray(subs) || subs.length === 0 || !subs.every((s) => s === 'matematik')) bad.push('subjects');
  if (input.language !== 'bm' && input.language !== 'en') bad.push('language');
  return bad;
}

describe('Property 1: profile validation matches the field rules', () => {
  it('succeeds exactly when every field is valid, and names exactly the bad fields', () => {
    fc.assert(
      fc.property(arbProfileInput, (input) => {
        const result = validateProfileInput(input, AT);
        const bad = expectedBad(input);
        if (bad.length === 0) {
          expect(result.ok).toBe(true);
          if (result.ok) expect(result.value.name).toBe((input.name as string).trim());
        } else {
          expect(result.ok).toBe(false);
          if (!result.ok) expect(result.error.map((e) => e.field).sort()).toEqual([...bad].sort());
        }
      }),
      fcCheapConfig,
    );
  });

  it('leaves the stored profile unchanged when the input is invalid', () => {
    const store = createProfileStore({ storage: createStorageService({ backend: fakeDurableBackend() }) });
    fc.assert(
      fc.property(arbProfileInput, (input) => {
        const before = store.getState().profile;
        const result = store.saveProfile(input);
        if (!result.ok) expect(store.getState().profile).toBe(before);
      }),
      fcCheapConfig,
    );
  });
});
