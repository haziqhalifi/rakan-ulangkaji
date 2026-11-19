import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const FEATURES = ['chat', 'exam', 'pathways'];
const AI_PATTERNS = ['**/core/ai', '**/core/ai/**'];

const crossFeature = (own) =>
  FEATURES.filter((f) => f !== own).flatMap((other) => [
    `**/features/${other}`,
    `**/features/${other}/**`,
    `../${other}`,
    `../${other}/**`,
  ]);

const restrict = (patterns, message) => ({
  'no-restricted-imports': ['error', { patterns: [{ group: patterns, message }] }],
});

// Features import from core and content, never from each other.
// marker.ts and eligibility.ts must stay deterministic, so they may not import core/ai.
function featureBoundaries() {
  const crossMsg = 'Features must not import each other. Share data through core/profile.';
  const aiMsg = 'Marking and eligibility must stay deterministic. Do not import core/ai here.';
  return [
    ...FEATURES.map((f) => ({
      files: [`src/features/${f}/**/*.{ts,tsx}`],
      rules: restrict(crossFeature(f), crossMsg),
    })),
    {
      files: ['src/features/exam/marker.ts'],
      rules: restrict([...crossFeature('exam'), ...AI_PATTERNS], `${crossMsg} ${aiMsg}`),
    },
    {
      files: ['src/features/pathways/eligibility.ts'],
      rules: restrict([...crossFeature('pathways'), ...AI_PATTERNS], `${crossMsg} ${aiMsg}`),
    },
  ];
}

export default tseslint.config(
  { ignores: ['dist', '.wrangler', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  ...featureBoundaries(),
  {
    files: ['functions/**/*.ts'],
    rules: { 'no-console': 'error' },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
);
