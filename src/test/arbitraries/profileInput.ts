import fc from 'fast-check';

/** Names of any content and length, with and without padding. */
export const arbNameInput = fc.oneof(
  fc.string({ maxLength: 45 }),
  fc.string({ maxLength: 40 }).map((s) => `  ${s}\t `),
  fc.constantFrom('', '   ', 'Aina', 'Mei Ling', 'x'.repeat(30), 'x'.repeat(31), ` ${'y'.repeat(30)} `),
);

export const arbFormInput = fc.oneof(
  fc.constantFrom<unknown>(4, 5),
  fc.constantFrom<unknown>(3, 6, 0, '4', null, undefined, 4.5),
  fc.integer(),
);

export const arbSubjectsInput = fc.oneof(
  fc.constant<unknown>(['matematik']),
  fc.constant<unknown>([]),
  fc.constant<unknown>(['sains']),
  fc.constant<unknown>(['matematik', 'sains']),
  fc.constant<unknown>(undefined),
);

export const arbLanguageInput = fc.oneof(
  fc.constantFrom<unknown>('bm', 'en'),
  fc.constantFrom<unknown>('fr', 'BM', '', null, 1),
);

export const arbProfileInput = fc.record({
  name: arbNameInput as fc.Arbitrary<unknown>,
  form: arbFormInput,
  subjects: arbSubjectsInput,
  language: arbLanguageInput,
});
