# Kiro usage log

A dated record of how Kiro was used on Rakan Ulangkaji.

## Thu 19 Nov 2026

| Kiro feature | Prompt summary | Outcome | Files touched |
|---|---|---|---|
| Kiro CLI 3.5.0 headless mode (`--no-interactive`, `--trust-all-tools`, `--v3`) | Run Kiro without a prompt loop so each step could be scripted and repeated | Steering, spec and scaffold steps ran unattended | n/a |
| Steering docs generation | Generate product, tech, content-integrity and copy-and-tone steering | Four steering files that every later step follows | `.kiro/steering/*.md` |
| Spec mode (`--mode spec`) | Requirements-first workflow: EARS requirements, then design with correctness properties, then tasks | Requirements, design (with property-based test properties) and a 10-evening task plan | `.kiro/specs/rakan-ulangkaji-mvp/` |
| Hooks | Create lint-on-save, test-on-save, copy-guard and spec-sync hooks | Four hook files plus a Node script for the copy check | `.kiro/hooks/*.json`, `scripts/copy-guard.mjs` |
| Scaffold run | Minimal Vite, React and TypeScript scaffold with lint and build checks, plus LICENSE, README and this log. Schedule updated to Sun 22 Nov to Tue 1 Dec, submission Fri 4 Dec | `npm install`, `npm run build` and `npm run lint` pass. No feature code yet | `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/`, `eslint.config.js`, `.gitignore`, `public/_redirects`, `LICENSE`, `README.md`, `docs/`, spec schedule |
| Agent hook (Stop trigger) observed | spec-sync fired automatically at the end of the scaffold run | Kiro checked tasks.md and correctly ticked nothing, since task 1.1 (full folder layout) is not finished | none |
| Usage check (`/usage` in headless mode) | Confirm Kiroween bonus credits are on the account | Kiroween credits show as applied, under 1 credit used after steering | none |

Exact prompts used for each run are saved in `kiro-prompts/` (kept outside docs/ because they quote the banned word as a rule).

## Thu 19 Nov 2026 (task 1)

| Kiro feature | Prompt summary | Outcome | Files touched |
|---|---|---|---|
| Spec task execution (task 1) | Build foundations: shared types, design tokens, i18n, Storage_Service, ProfileStore with weak topics, Shell with hash router and lazy routes, ESLint boundaries, and tests for tasks 1.7 to 1.12 | Build, lint and tests pass. A copy-guard hit on the banned-word regex in a test was fixed by building the pattern from letters | `src/core/*`, `src/app/*`, `src/features/*/` placeholders, `src/styles/*`, `src/test/*`, `eslint.config.js`, `vite.config.ts`, `package.json` |

## Thu 19 Nov 2026 (task 2)

| Kiro feature | Prompt summary | Outcome | Files touched |
|---|---|---|---|
| Spec task execution (task 2) | Build onboarding in four screens, profile validation, settings, export, import and delete, plus property and component tests (tasks 2.1 to 2.7, including the optional 2.2 and 2.6) | Build, lint, tests and copy-guard pass | `src/app/Onboarding.tsx`, `src/app/SettingsScreen.tsx`, `src/app/ProfileFields.tsx`, `src/core/profile/*`, `src/core/storage/exportImport.ts`, `src/core/i18n/*`, tests |

## Thu 19 Nov 2026 (task 3)

| Kiro feature | Prompt summary | Outcome | Files touched |
|---|---|---|---|
| Spec task execution (task 3) | Build content types and grade bands, an original Matematik Paper (12 objective, 4 structured) with a shared question bank, the deterministic Marker, and property and example tests for Properties 24 to 29 and 41 | Build, lint, tests and copy-guard pass | `src/content/*`, `src/features/exam/marker.ts`, `src/features/exam/*.test.ts`, `src/test/arbitraries/exam.ts` |

## Thu 19 Nov 2026 (task 4)

| Kiro feature | Prompt summary | Outcome | Files touched |
|---|---|---|---|
| Spec task execution (task 4) | Build the exam timer, runner logic, mark-on-submit wiring, Results screen and the exam runner UI, with property tests for Properties 18 to 23, 30 and 40 and component tests on a fake clock, including retry after a paper load failure | Build, lint, tests and copy-guard pass. userEvent hangs under faked timers, so the component tests use fireEvent | `src/features/exam/*`, `src/styles/exam.css`, `src/core/i18n/strings.*.ts` |

## Thu 19 Nov 2026 (task 5)

| Kiro feature | Prompt summary | Outcome | Files touched |
|---|---|---|---|
| Spec task execution (task 5) | Build the AI core interface and rules provider, intent engine, chat input validator, original topic explanations, reply templates and the Rakan chat screen, with property tests for Properties 2 to 5 and component tests | Build, lint, tests and copy-guard pass. All optional sub-tasks were small and done | `src/core/ai/*`, `src/features/chat/*`, `src/content/topicExplanations.ts`, `src/styles/chat.css`, `src/core/i18n/strings.*.ts` |
| Spec task execution (task 6) | Build the Rakan quiz state machine, nudges, revise advice with percentages, and wire them into the chat screen, with property tests for Properties 14 to 17 | Build, lint, tests and copy-guard pass. All optional sub-tasks were small and done. The marker moved to `core/marking` (re-exported from `features/exam`) so chat and exam share it without a cross-feature import | `src/features/chat/{quiz,nudge,replies,ChatScreen}*`, `src/core/marking/marker.ts`, `src/core/profile/weakTopics.property.test.ts`, `eslint.config.js`, `src/core/i18n/strings.*.ts` |

## Thu 19 Nov 2026 (task 7)

| Kiro feature | Prompt summary | Outcome | Files touched |
|---|---|---|---|
| Spec task execution (task 7) | Author hedged pathway rule data, build the eligibility engine, what-if helper, board UI with grade form, cards, detail panel and Disclaimer, with property tests for Properties 31 to 37 and example and component tests | Build, lint, tests and copy-guard pass. The optional single-flow integration test (7.14) was skipped to keep the task small. Suggestions are the cheapest set of changes found by a small search, and levels use grade-step distance so they stay monotone | `src/content/pathwayRules.ts`, `src/features/pathways/*`, `src/styles/board.css`, `src/test/arbitraries/grades.ts`, `src/core/i18n/strings.*.ts` |

## Thu 19 Nov 2026 (task 8)

| Kiro feature | Prompt summary | Outcome | Files touched |
|---|---|---|---|
| Spec task execution (task 8) | Add optional remote AI: payload builder, consent gate, 8 second timeout and silent rules fallback, UserKey and Proxy providers, Pages Function proxy, Settings consent UI, with property tests for Properties 6 to 9 and fallback example tests | Build, lint, tests and copy-guard pass. The default path stays rules only. Remote text is limited to topic help, greeting and unknown intents. All optional tests (8.7, 8.8, 8.10) were small, so they were done | `src/core/ai/*`, `functions/api/chat.ts`, `src/app/SettingsScreen.tsx`, `src/features/chat/ChatScreen.tsx`, `src/core/profile/ProfileStore.ts`, `src/core/i18n/strings.*.ts` |

## Thu 19 Nov 2026 (task 9)

| Kiro feature | Prompt summary | Outcome | Files touched |
|---|---|---|---|
| Spec task execution (task 9) | Add the web manifest and icons, a hand-written service worker with a precache manifest plugin, offline notice, bundle size gate, seam wipe, and an accessibility pass | Build, lint, tests and copy-guard pass. Initial JS is about 99 KB gzip against the 200 KB limit, and exam and board stay in lazy chunks. The optional tests 9.7, 9.8 and 9.9 were small, so they were done. The ember colour token was darkened to pass the 4.5:1 contrast test | `public/manifest.webmanifest`, `public/sw.js`, `public/icons/*`, `scripts/make-icons.mjs`, `scripts/precache-plugin.mjs`, `scripts/check-size.mjs`, `src/app/registerSW.ts`, `src/app/OfflineNotice.tsx`, `src/app/UpdateNotice.tsx`, `src/styles/*.css`, `src/core/i18n/strings.*.ts` |

## Thu 19 Nov 2026 (task 10)

| Kiro feature | Prompt summary | Outcome | Files touched |
|---|---|---|---|
| Spec task execution (task 10) | Write the README, demo script, Kiro usage write-up, deploy guide, Devpost checklist and manual checklist, add a public copy scan test, and run the final gates | Docs added, optional test 10.7 done because it was small. Build, lint, tests and copy-guard pass | `README.md`, `docs/demo-script.md`, `docs/kiro-usage.md`, `docs/deploy-cloudflare-pages.md`, `docs/devpost-checklist.md`, `docs/manual-checklist.md`, `src/test/publicCopy.test.ts` |

## Template for future entries

Copy this block under a new date heading (for example `## Fri 20 Nov 2026`).

| Kiro feature | Prompt summary | Outcome | Files touched |
|---|---|---|---|
| (steering, spec, hook, chat, and so on) | (one or two sentences) | (what worked, what needed a fix) | (paths) |

Note: tasks 1 to 10 were all executed by Kiro CLI on Thu 19 Nov 2026 (about 18:00 to 19:00 MYT), one headless `kiro-cli chat --v3` run per task, driven by a small shell loop that verified build, lint and tests and committed after each task. Kiroween credits used for the whole build: about 106 of 4,000.
