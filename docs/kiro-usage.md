# How Kiro was used

Rakan Ulangkaji was planned and built with Kiro. This page matches what is in the repository. For a dated list, see [`kiro-usage-log.md`](kiro-usage-log.md).

## Steering

Four files in [`.kiro/steering/`](../.kiro/steering/) set the rules for every session:

- `product.md`: what the product is, the three stitched parts, judging goals and non-goals.
- `tech.md`: stack, folder structure, commands, storage, the AI provider abstraction and zero-cost rules.
- `content-integrity.md`: original questions only, the skema format, pathway disclaimer wording and privacy rules.
- `copy-and-tone.md`: voice, no em dashes, "awak" or "korang" in BM, and the BM and EN glossary.

## Spec

[`.kiro/specs/rakan-ulangkaji-mvp/`](../.kiro/specs/rakan-ulangkaji-mvp/) holds the spec mode output:

- `requirements.md`: EARS style requirements with numbered acceptance criteria.
- `design.md`: architecture, data models, and a list of correctness properties.
- `tasks.md`: ten evening-sized tasks with sub-tasks. Each sub-task cites the requirements it covers. Optional sub-tasks are marked with `*`.

Each task was run as a separate Kiro session with a prompt in [`kiro-prompts/`](../kiro-prompts/). The prompts point to the spec and steering, set hard rules, and ask for a ticked checklist and a usage log row at the end.

## Hooks

Four hooks in [`.kiro/hooks/`](../.kiro/hooks/):

- `lint-on-save`: runs ESLint with fix after a TypeScript file is saved.
- `test-on-save`: runs marker, eligibility and storage tests after a file in `src/core` is saved.
- `copy-guard`: runs `scripts/copy-guard.mjs` on saved copy files to catch em dashes and the banned BM pronoun.
- `spec-sync`: when the agent stops, reminds it to tick finished tasks and add a usage log row.

## Property-based tests from design properties

The design lists correctness properties, such as "marker is deterministic", "eligibility is monotone in grades", "remote failure falls back to the rules reply" and "demo timer does not change marking". Each one became a single `fast-check` test, tagged with a comment like `// Feature: rakan-ulangkaji-mvp, Property 35: ...`. Shared generators live in `src/test/arbitraries/`, and run counts are set once in `src/test/fcConfig.ts`. Example tests and Testing Library tests cover UI, the service worker helpers and content checks. Tests need no network and no API key.

## What Kiro did not decide

Marking and pathway eligibility are plain rules in code. AI may only phrase chat replies, and it is opt-in.
