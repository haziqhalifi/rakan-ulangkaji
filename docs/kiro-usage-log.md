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

## Sun 22 Nov 2026

| Kiro feature | Prompt summary | Outcome | Files touched |
|---|---|---|---|
| Spec task execution (task 1) | Build foundations: shared types, design tokens, i18n, Storage_Service, ProfileStore with weak topics, Shell with hash router and lazy routes, ESLint boundaries, and tests for tasks 1.7 to 1.12 | Build, lint and tests pass. A copy-guard hit on the banned-word regex in a test was fixed by building the pattern from letters | `src/core/*`, `src/app/*`, `src/features/*/` placeholders, `src/styles/*`, `src/test/*`, `eslint.config.js`, `vite.config.ts`, `package.json` |

## Template for future entries

Copy this block under a new date heading (for example `## Sun 22 Nov 2026`).

| Kiro feature | Prompt summary | Outcome | Files touched |
|---|---|---|---|
| (steering, spec, hook, chat, and so on) | (one or two sentences) | (what worked, what needed a fix) | (paths) |
