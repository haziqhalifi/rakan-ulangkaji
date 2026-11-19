# Implementation Plan: Rakan Ulangkaji MVP

## Overview

This plan follows the 10-evening build order in design.md. It is written for one developer working 2 to 3 hours per evening, with submission by Friday 4 December 2026. The language is TypeScript (strict), as used in design.md.

Ordering keeps the demo path working early. Evening 5 gives a working chat, evening 4 gives a working exam, and evening 7 closes the loop (exam result, Rakan nudge, board hint). Evenings 8 to 10 add optional remote AI, offline polish, and submission material. Remote AI never blocks the demo.

Target schedule (today is Thu 19 Nov 2026). The developer is busy with other hackathons until Sat 21 Nov, so the build starts on Sun 22 Nov:

| Evening | Date | Task |
|---|---|---|
| 1 | Sun 22 Nov | 1 |
| 2 | Mon 23 Nov | 2 |
| 3 | Tue 24 Nov | 3 |
| 4 | Wed 25 Nov | 4 |
| 5 | Thu 26 Nov | 5 |
| 6 | Fri 27 Nov | 6 |
| 7 | Sat 28 Nov | 7 |
| 8 | Sun 29 Nov | 8 |
| 9 | Mon 30 Nov | 9 |
| 10 | Tue 1 Dec | 10 |

Wed 2 Dec and Thu 3 Dec are buffer for overruns and the manual checklist on a real phone. Submission is on Fri 4 Dec 2026, run by the human (deploy and Devpost). The official Devpost deadline is Sat 5 Dec 2026 6:00 AM MYT, so Fri 4 Dec leaves a safety margin. If an evening overruns, skip optional sub-tasks (marked `*`) first, never the required tests for marking, timer, eligibility, storage, and fallback.

## Tasks

- [x] 1. Foundations: scaffold, tokens, i18n, storage, ProfileStore, Shell (~1 evening)
  - [x] 1.1 Scaffold the project and quality gates
    - Create the Vite + React + TypeScript (strict) project with the folder layout from design.md (`src/app`, `src/features/{chat,exam,pathways}`, `src/core/{profile,storage,ai,i18n}`, `src/content`, `src/styles`, `functions/`, `public/`, `docs/`)
    - Add npm scripts `dev`, `build` (`tsc --noEmit` then `vite build`), `lint`, and `test` (`vitest --run`)
    - Add only free, project-local dev dependencies: Vitest, fast-check, React Testing Library, jsdom, fake-indexeddb, ESLint with `@typescript-eslint`
    - Configure ESLint: no cross-feature imports, `no-explicit-any`, `features/exam/marker.ts` and `features/pathways/eligibility.ts` may not import `core/ai`, and `no-console` under `functions/`
    - Create `src/core/profile/types.ts` with the shared types from design.md (Language, Grade, Grade_Set, StudentProfile, Settings, ChatMessage, Exam_Result, Progress_Record, ExamInProgress, PersistedData) and `src/test/fcConfig.ts` (100 runs, 300 for cheap properties)
    - Keep new property-test generators in per-area files under `src/test/arbitraries/` so parallel tasks do not edit the same file
    - Use fictional students only ("Aina", "Daniel", "Mei Ling", "Ravi") in all fixtures
    - _Requirements: 18.1, 18.4, 18.6, 18.7, 2.1, 5.10, 10.15, 12.5, 19.2, 19.3_

  - [x] 1.2 Create the design tokens and base styles
    - Write `tokens.css`, `base.css`, and `stitch.css` with the palette and the `.stitched` seam motif from design.md
    - Add `:focus-visible` outline (3 px), the `.tap` 44 px utility, system font stacks only, and `prefers-reduced-motion` rules
    - No webfonts, no remote assets
    - _Requirements: 16.4, 16.5, 16.9, 17.1, 17.8, 17.9, 17.10, 5.11_

  - [x] 1.3 Implement the i18n module
    - Create `strings.en.ts` and `strings.bm.ts` (BM typed as `Record<StringKey, string>`), `t()` with fallback to the other language, `pick()` for bilingual content, `detectDefaultLanguage()`, and `I18nProvider`
    - Keep SPM, STPM, UPU, TVET, KSSM as literal text in both files
    - Use "awak" or "korang" in BM copy, never "kau", and never use an em dash
    - Add the Disclaimer text in both languages
    - _Requirements: 14.5, 14.7, 14.8, 14.10, 14.11, 14.12, 13.6_

  - [x] 1.4 Implement the Storage_Service
    - Create `idb.ts`, `localStore.ts`, a memory backend, `StorageService.ts`, `migrations.ts` (empty chain plus the hook), and `LoadOutcome` handling (`empty`, `ok`, `unreadable`)
    - Store one versioned JSON document under key `data` and the API key under a separate `secret:` key
    - Backend order: IndexedDB, then localStorage with prefix `rakan:`, then memory
    - Never write back when data is newer or a migration throws
    - _Requirements: 2.6, 2.7, 2.8, 2.9, 5.7_

  - [x] 1.5 Implement the ProfileStore and weak-topic derivation
    - Create `ProfileStore.ts` with `getState`, `subscribe` (`useSyncExternalStore` compatible), `setLanguage`, `appendChat` (cap 200), `recordQuizAttempt`, `addExamResult`, `saveExamInProgress`, `setGrade`, `importMathGradeFromLatestExam`, and settings and consent mutators
    - Create `weakTopics.ts` with `isWeak` and `computeWeakTopics`, deriving topic mastery from the Progress_Record (not persisted)
    - Notify listeners synchronously, debounce writes (about 250 ms, immediate for exam saves), set `storageStatus` on write failure and retry on the next mutation
    - Cap `quizAttempts` at 500 and `examResults` at 20
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.9, 2.11, 3.11, 3.12, 11.7, 14.6_

  - [x] 1.6 Build the Shell, router, and language toggle
    - Create the hash router, route guard (no profile redirects to `#/welcome`), bottom navigation with `aria-current="page"`, home screen caption, and placeholder screens for each route
    - Add `LanguageToggle` on every screen (44 px target) and set `document.documentElement.lang` (`ms` or `en`) on load and on change
    - Add `StatusBanner` with `useStatus()`, an error boundary with a kind message, and a `navigate()` context so features never import each other
    - Lazy-load `#/exam` and `#/board` with `React.lazy`
    - _Requirements: 1.1, 14.1, 14.2, 14.6, 16.11, 16.12, 17.5, 17.11, 2.8, 2.9, 3.10_

  - [x] 1.7 Write property test for persistence round trip
    - **Property 10: Persistence and export round trip (persistence half)**
    - Use `fake-indexeddb` and an `arbPersistedData` generator
    - **Validates: Requirements 2.6, 2.10**
    - _Requirements: 2.6, 2.10, 19.1_

  - [x] 1.8 Write property test for migration order
    - **Property 12: Migrations run once each, in ascending order**
    - Use a fake migration chain from v0 upward
    - **Validates: Requirements 2.7**
    - _Requirements: 2.7, 19.1_

  - [x] 1.9 Write property test for unreadable data
    - **Property 13: Unreadable data is left unchanged**
    - Cover newer version, throwing migration, and corrupt JSON
    - **Validates: Requirements 2.8**
    - _Requirements: 2.8, 19.1_

  - [x] 1.10 Write example tests for the storage wrapper
    - Cover the IndexedDB path, localStorage fallback when IndexedDB open fails, memory fallback, schema version stored, and clear-all
    - _Requirements: 2.6, 2.9, 19.1_

  - [x]* 1.11 Write property test for i18n fallback
    - **Property 38: i18n fallback never returns empty or a raw key**
    - **Validates: Requirements 13.6, 14.8**
    - _Requirements: 13.6, 14.8, 14.9_

  - [x]* 1.12 Write property test for default language detection
    - **Property 39: Default language detection**
    - **Validates: Requirements 14.7**
    - _Requirements: 14.7_

- [ ] 2. Onboarding, settings, export, import, and delete (~1 evening)
  - [ ] 2.1 Implement profile validation and the onboarding flow
    - Add `saveProfile` to the ProfileStore returning `Result<StudentProfile, ValidationError[]>` (name 1 to 30 chars after trim, form 4 or 5, at least one subject, language bm or en)
    - Build onboarding in at most 4 screens, including a "data stays in your browser" statement before submit, Matematik selectable and other subjects disabled with a "coming soon" label
    - On invalid input name each bad field and keep entered values. On storage failure stay on onboarding and show the try-again message
    - On success save the profile and open Rakan
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [ ]* 2.2 Write property test for profile validation
    - **Property 1: Profile validation matches the field rules**
    - **Validates: Requirements 1.2, 1.4, 1.6**
    - _Requirements: 1.2, 1.4, 1.6_

  - [ ] 2.3 Implement settings, export, import, and delete
    - Create `exportImport.ts`, `exportData`, `importData` (shape and version guard, migrations, reject higher versions), and `deleteAll` (IndexedDB, localStorage prefix, consent flags, secret)
    - Build the Settings screen: language, edit profile, demo short timer toggle, export download with a "copy as text" fallback, import with validation, and delete with a confirm step that keeps data on cancel
    - Return to onboarding after a confirmed delete
    - Exclude API keys and in-progress exam state from the export
    - _Requirements: 1.6, 5.1, 5.12, 5.13, 5.14, 5.15, 5.16, 2.10, 20.4_

  - [ ] 2.4 Write property test for export and import round trip
    - **Property 10: Persistence and export round trip (export half)**
    - **Validates: Requirements 5.12, 5.16**
    - _Requirements: 5.12, 5.16, 2.10, 19.1_

  - [ ] 2.5 Write property test that export never contains API keys
    - **Property 11: Export never contains API keys**
    - Also assert `deleteAll` leaves no stored key
    - **Validates: Requirements 5.7, 5.12, 5.14**
    - _Requirements: 5.7, 5.12, 5.14, 19.1_

  - [ ]* 2.6 Write component tests for onboarding and settings
    - Cover the 4-screen limit, field errors with values kept, language toggle on onboarding, delete confirm and cancel
    - _Requirements: 1.4, 1.7, 5.13, 5.15, 14.1_

  - [ ] 2.7 Checkpoint - Ensure all tests pass
    - Run `npm run lint`, `npm test`, and `npm run build`. Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Original Paper content and the Marker (~1 evening)
  - [ ] 3.1 Define content types and grade bands
    - Create `src/content/types.ts` (Question, SkemaPoint, Paper, Bilingual, `original: true` literal type) and `gradeBands.ts` (typed percentage to grade bands, illustrative)
    - _Requirements: 8.3, 10.7_

  - [ ] 3.2 Author the original Matematik Paper and question bank
    - Write 10 to 15 objective and 3 to 4 structured questions from scratch, covering at least 4 topic tags across Form 4 and Form 5, with fictional names and settings only
    - Give each question BM and EN text, marks, a skema (per-point `accepted` variants including decimal and fraction forms, `stripUnits` where needed), and a kind BM and EN explanation
    - Export the Paper from `matematik.paper.ts` (loaded lazily by Exam Mode) and share the question bank with Rakan quiz through a small bank module
    - Do not copy or closely paraphrase any past paper, trial paper, or book
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.9, 20.1_

  - [ ] 3.3 Implement the Marker
    - Create `features/exam/marker.ts` with `normalise`, `markQuestion`, `markPaper`, `gradeForPercent`, and `topicBreakdown`
    - Match per skema point, never award a point twice, let one answer segment satisfy at most one point, clamp marks to `[0, q.marks]`, and report unanswered questions
    - Keep it pure and synchronous, with no import of `core/ai`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.11, 10.12, 10.15_

  - [ ] 3.4 Write property test for shipped skema consistency
    - **Property 41: Every shipped question has a consistent skema**
    - Include content-integrity checks: counts, topic coverage, `original: true`, fictional-name allow list, non-empty bilingual fields
    - **Validates: Requirements 8.3, 8.8, 8.9, 8.10, 19.5**
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.8, 8.9, 8.10, 19.5_

  - [ ] 3.5 Write property test for marker bounds and determinism
    - **Property 24: Marker bounds and determinism**
    - **Validates: Requirements 10.12, 10.14**
    - _Requirements: 10.12, 10.14, 19.1_

  - [ ] 3.6 Write property test for case, spacing, and unit invariance
    - **Property 25: Marker ignores case, spacing, and listed units**
    - **Validates: Requirements 10.2, 10.3, 10.13**
    - _Requirements: 10.2, 10.3, 10.13, 19.5_

  - [ ] 3.7 Write property test for per-point awarding
    - **Property 26: Marks are awarded per point and never twice**
    - **Validates: Requirements 10.3, 10.4, 10.5**
    - _Requirements: 10.3, 10.4, 10.5, 19.5_

  - [ ] 3.8 Write property test for unanswered questions
    - **Property 27: Unanswered questions score zero**
    - **Validates: Requirements 10.11**
    - _Requirements: 10.11, 19.1_

  - [ ] 3.9 Write property test for exam totals and topic breakdown
    - **Property 28: Exam totals and topic breakdown are consistent**
    - **Validates: Requirements 10.5, 10.6, 10.7**
    - _Requirements: 10.5, 10.6, 10.7, 19.1_

  - [ ] 3.10 Write property test for grade mapping
    - **Property 29: Grade mapping is total and monotone**
    - **Validates: Requirements 10.7**
    - _Requirements: 10.7, 19.1_

  - [ ] 3.11 Write example tests for marker fixtures
    - Cover unit stripping, structured multi-point partial credit, one correct and one incorrect answer per skema point, and unanswered
    - _Requirements: 10.2, 10.3, 10.4, 10.11, 19.5_

- [ ] 4. Exam runner, timer, and results (~1 evening)
  - [ ] 4.1 Implement the timer
    - Create `features/exam/timer.ts` with `remainingMs`, `formatMmSs`, `hasExpired`, and `shouldWarn`, based on the start timestamp and an injectable `now`
    - _Requirements: 9.2, 9.3, 9.5, 9.8, 9.15_

  - [ ] 4.2 Write property test for the remaining time formula
    - **Property 18: Remaining time formula**
    - **Validates: Requirements 9.2, 9.8, 9.15**
    - _Requirements: 9.2, 9.8, 9.15, 19.6_

  - [ ] 4.3 Write property test for the warning firing once
    - **Property 20: Warning fires once**
    - **Validates: Requirements 9.5**
    - _Requirements: 9.5, 19.6_

  - [ ]* 4.4 Write property test for the time display format
    - **Property 19: Time display format**
    - **Validates: Requirements 9.3**
    - _Requirements: 9.3_

  - [ ] 4.5 Write example tests for the timer on a fake clock
    - Cover counting down, stopping at zero, a single submission at expiry, and resume at fixed timestamps
    - _Requirements: 9.2, 9.6, 9.10, 9.11, 19.6_

  - [ ] 4.6 Implement the runner logic
    - Create a pure `runnerLogic.ts` with the answers and navigation reducer, a `submittedRef`-style submit-once guard (manual, timeout, resume at zero), and the resume decision (offer resume when time remains, auto-submit at zero)
    - Keep answers, current index, and start timestamp outside i18n state
    - _Requirements: 9.4, 9.6, 9.7, 9.10, 9.11, 9.12, 14.3_

  - [ ] 4.7 Write property test for single submission
    - **Property 21: Submission happens exactly once**
    - **Validates: Requirements 9.6, 9.7, 9.11, 9.12, 19.6**
    - _Requirements: 9.6, 9.7, 9.11, 9.12, 19.6_

  - [ ] 4.8 Write property test for the resume decision
    - **Property 22: Resume decision**
    - **Validates: Requirements 9.10, 9.11**
    - _Requirements: 9.10, 9.11, 19.6_

  - [ ]* 4.9 Write property test for answers surviving navigation and language change
    - **Property 23: Answers survive navigation and language change**
    - **Validates: Requirements 9.4, 14.3**
    - _Requirements: 9.4, 14.3_

  - [ ] 4.10 Build the Results screen and mark-on-submit wiring
    - Create `exam/Results.tsx` and `grade.ts` use: run `markPaper` in a try/catch, call `ProfileStore.addExamResult`, and show per-question earned and missed points, explanations in the selected language (including unanswered and fully correct), per-topic breakdown, total, and estimated grade band
    - Use encouraging wording from i18n only
    - Show a "See my pathways" button that calls the Shell `navigate()`, with a guidance-only note of at most 120 characters beside it
    - On marker failure keep the answers, show a kind message, and offer retry
    - _Requirements: 10.1, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.16, 10.17, 13.3, 2.2, 2.3_

  - [ ] 4.11 Build the exam screens and runner UI
    - Create `ExamScreen` with Instructions (duration, question count, total marks, timer stopped until confirm), the Runner (fixed-header `role="timer"` at 1.5 times body size or more, any-order navigation, kept answers), submit confirmation (cancel keeps timer running), and a visually hidden `aria-live` region for the 5-minute warning and auto-submit
    - Run the timer with a 250 ms interval that recomputes from `Date.now()`, with a `visibilitychange` recompute
    - Save progress after each answer (debounced 300 ms) and every 10 s through `saveExamInProgress`, and show the kind banner on save failure
    - Lazy-load the Paper on mount with a retry message on failure that never starts the timer
    - Apply `settings.demoShortTimer` (60 s) without changing questions or skema
    - Write `exam.css` (paper background, square corners, serif system stack, no bubbles)
    - _Requirements: 8.6, 8.7, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13, 9.14, 16.8, 17.3, 20.4_

  - [ ]* 4.12 Write property test for exam results updating shared progress
    - **Property 30: Exam result updates shared progress**
    - **Validates: Requirements 2.2, 2.3, 7.7, 10.16, 20.5**
    - _Requirements: 2.2, 2.3, 7.7, 10.16, 20.5_

  - [ ]* 4.13 Write property test for demo timer not changing marking
    - **Property 40: Demo timer does not change marking**
    - **Validates: Requirements 20.4**
    - _Requirements: 20.4_

  - [ ]* 4.14 Write component tests for the exam flow
    - Use a fake clock and a canned answer set: instructions, warning region, auto-submit, results screen, retry on paper load failure
    - _Requirements: 8.7, 9.1, 9.5, 9.6, 10.5, 10.8_

  - [ ] 4.15 Checkpoint - Ensure all tests pass
    - Run `npm run lint`, `npm test`, and `npm run build`. Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Rakan chat UI, intent engine, and rules provider (~1 evening)
  - [ ] 5.1 Create the AI core interface and rules provider
    - Create `core/ai/types.ts` (ProviderId, `Intent` union, ReplyRequest, Reply, AIProvider; `Intent` lives here so `core` never imports a feature), `rulesProvider.ts` (returns the precomputed rule reply), and `generateReply.ts` with the rules provider as the default and an injectable `deps` parameter
    - _Requirements: 4.6, 4.7, 4.13_

  - [ ] 5.2 Implement the intent engine and chat input validator
    - Create `features/chat/intents.ts` with `classifyIntent` over a BM and EN keyword table, fixed priority order, and `unknown` for empty or whitespace input
    - Create `features/chat/input.ts` with the 1 to 500 character validator (trim, block above 500, keep typed text)
    - _Requirements: 4.1, 4.2, 3.3, 3.4, 3.5_

  - [ ] 5.3 Write original topic explanations
    - Create `content/topicExplanations.ts` with BM and EN explanations of 100 words or fewer for each topic in the question bank, original wording, fictional examples
    - _Requirements: 4.5_

  - [ ] 5.4 Implement reply templates
    - Create `features/chat/replies.ts` with `ruleReply(intent, ctx)` using fixed templates chosen by `hash(message) % variants.length` (no `Math.random`, no `Date.now`)
    - Cover greeting (with the student's name), quiz_request, revise_advice, exam_request, pathway_request (full Disclaimer or a board link), topic_help (explanation plus quiz offer), language_switch (side-effect descriptor), data_help, and unknown (lists the seven capabilities)
    - Use "awak" or "korang" in BM
    - _Requirements: 3.2, 3.14, 4.3, 4.4, 4.5, 4.12, 13.2_

  - [ ] 5.5 Build the Rakan chat screen
    - Create `ChatScreen` and `chat.css` (rounded bubbles, warm background) with a `role="log"` `aria-live="polite"` thread, alignment plus a "Rakan" or "Awak"/"You" label, the typing indicator (`role="status"`, removed in `finally`), the input with a character limit notice and focus kept on empty send, and the four quick-reply chips
    - "Quiz me" and "What should I revise?" append the chip text as a student message. "Start exam" and "See my pathways" call `navigate()`
    - Persist each message through the store, restore up to 200 on reload, keep messages in the language they were sent, and keep the input enabled at all times
    - Show the progress-may-not-be-saved banner on persistence failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 14.4, 16.7, 17.2_

  - [ ]* 5.6 Write property test for intent classification
    - **Property 4: Intent classification is total and single-valued**
    - **Validates: Requirements 4.1, 4.2**
    - _Requirements: 4.1, 4.2_

  - [ ]* 5.7 Write property test for chat message validation
    - **Property 2: Chat message validation**
    - **Validates: Requirements 3.3, 3.4, 3.5**
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ] 5.8 Write property test for rules provider determinism
    - **Property 5: Rules provider is deterministic and always replies**
    - **Validates: Requirements 4.3, 4.4, 4.12, 4.13**
    - _Requirements: 4.3, 4.4, 4.12, 4.13, 19.1_

  - [ ]* 5.9 Write property test for chat history restore
    - **Property 3: Chat history restore keeps the latest 200 in order**
    - **Validates: Requirements 3.11, 3.12**
    - _Requirements: 3.11, 3.12_

  - [ ]* 5.10 Write component tests for the chat screen
    - Cover bubble labels, live regions, typing indicator removal, empty send keeps focus, chips, and navigation chips
    - _Requirements: 3.1, 3.4, 3.6, 3.8, 3.10, 16.7_

  - [ ]* 5.11 Write example tests for intents and replies
    - Table of BM and EN phrases per intent, tie priority, 100-word limit on topic explanations, and BM wording ("awak" or "korang", no "kau")
    - _Requirements: 4.1, 4.5, 3.14_

- [ ] 6. Quiz flow, weak topics, and nudges (~1 evening)
  - [ ] 6.1 Write property test and examples for the Weak_Topic definition
    - **Property 14: Weak_Topic definition**
    - Include the boundary values 0.5 (not weak with 2 or more attempts) and 0.6 (not weak with fewer than 2 attempts)
    - **Validates: Requirements 2.3, 19.7**
    - _Requirements: 2.3, 19.7_

  - [ ] 6.2 Implement the quiz state machine
    - Create `features/chat/quiz.ts` as a reducer with `idle`, `choosing_topic`, `asking`, and `done` phases
    - Offer the weakest Weak_Topic first, ask questions in fixed bank order skipping asked ones, end after 5 questions or when none remain, accept "stop" (trimmed, case-insensitive), keep the question open on a whitespace answer, and list topics that have questions when the chosen one has none
    - Mark with the same `markQuestion` as Exam Mode and record one attempt per marked answer through the store
    - Show points earned and missed, marks, and the explanation, with praise of at most 2 sentences on full marks and encouragement with no scolding otherwise
    - _Requirements: 2.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

  - [ ] 6.3 Implement nudges and revise advice
    - Create `features/chat/nudge.ts` with `pickNudgeTopic` (lowest ratio, ties by topic name ascending) and a module-level once-per-session flag
    - Extend `replies.ts` so revise_advice lists up to 3 weak topics with percentages, and an empty weak list suggests "Start exam" and "Quiz me" chips
    - Offer a "Quiz me on this" chip on every nudge, and write nudge copy with no guilt, fear, or comparison wording
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ] 6.4 Wire the quiz and nudge into the chat screen
    - Connect quiz chips, the stop chip, and the "Quiz me on this" chip to the reducer
    - Show the nudge when Rakan opens, using weak topics read from the ProfileStore subscription so a fresh exam result changes what Rakan says
    - _Requirements: 6.1, 6.7, 7.1, 7.5, 7.7, 20.5_

  - [ ]* 6.5 Write property test for weak-topic ordering and the nudge pick
    - **Property 15: Weak topics are ordered and the nudge picks the first**
    - **Validates: Requirements 6.1, 7.1, 7.2, 7.3**
    - _Requirements: 6.1, 7.1, 7.2, 7.3_

  - [ ]* 6.6 Write property test for quiz invariants
    - **Property 16: Quiz invariants**
    - **Validates: Requirements 2.4, 6.2, 6.6, 6.8**
    - _Requirements: 2.4, 6.2, 6.6, 6.8_

  - [ ]* 6.7 Write property test for stop command matching
    - **Property 17: Stop command matching**
    - **Validates: Requirements 6.7**
    - _Requirements: 6.7_

  - [ ]* 6.8 Write example tests for quiz and nudge behaviour
    - Cover weakest topic offered first, ends after 5, stop, empty answer, no-questions topic, one nudge per session, tie by name, and chips present
    - _Requirements: 6.1, 6.6, 6.7, 6.8, 6.9, 7.1, 7.4, 7.5_

  - [ ]* 6.9 Write tone and copy scan tests for chat strings
    - Scan nudge, result, and quiz strings for guilt wording and the em dash character
    - _Requirements: 6.5, 7.6, 10.9, 14.11_

  - [ ] 6.10 Checkpoint - Ensure all tests pass
    - Run `npm run lint`, `npm test`, and `npm run build`. Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Pathway rules, eligibility engine, and board (~1 evening)
  - [ ] 7.1 Author the pathway rule data
    - Create `content/pathwayRules.ts` with simplified, hedged rules for Matrikulasi, Asasi, STPM, Diploma, TVET, and Foundation using `minGrade` and `minCount` conditions tagged `core` or `soft`
    - Give each rule `lastReviewed` (YYYY-MM-DD), a non-empty `sourceNote`, and BM and EN "usually needs" and next-step text
    - Show no official logos and imply no endorsement
    - _Requirements: 12.6, 12.7, 12.8, 20.1_

  - [ ] 7.2 Implement the Eligibility_Engine
    - Create `features/pathways/eligibility.ts` with `gradeRank`, `evaluatePathway`, `evaluateAll` (exactly six hints in fixed order), suggestions (smallest change to improve the level), `bestHint`, and `listOpenPathways`
    - Treat a missing subject as not met and name it in the reasons, keep levels monotone in grades, and make the engine total (an empty set returns six `check_closely` hints)
    - Use rule code only, with no `core/ai` import and no network
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.10, 12.11, 12.12, 12.13, 12.14_

  - [ ] 7.3 Write property test for six well-formed hints
    - **Property 33: Eligibility returns six well-formed hints**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4**
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 19.1_

  - [ ] 7.4 Write property test for eligibility determinism
    - **Property 34: Eligibility is deterministic**
    - **Validates: Requirements 12.5, 12.13**
    - _Requirements: 12.5, 12.13, 19.1_

  - [ ] 7.5 Write property test for monotonicity in grades
    - **Property 35: Eligibility is monotone in grades**
    - Use an `arbBetterGradeSet(base)` generator
    - **Validates: Requirements 12.14**
    - _Requirements: 12.14, 19.1_

  - [ ] 7.6 Write property test for suggestions
    - **Property 36: Suggestions improve or keep the level**
    - **Validates: Requirements 12.10**
    - _Requirements: 12.10, 19.1_

  - [ ]* 7.7 Write property test for best hint and open pathway listing
    - **Property 37: Best hint and open pathway listing**
    - **Validates: Requirements 12.11, 12.12**
    - _Requirements: 12.11, 12.12_

  - [ ] 7.8 Write example tests for pathways and rule data
    - One fictional student per pathway (Matrikulasi, Asasi, STPM, Diploma, TVET, Foundation) checking level and reason, plus an empty set and a missing subject
    - Check every rule has a `lastReviewed` date in `YYYY-MM-DD` format and a non-empty `sourceNote`, and that all six pathways are present
    - _Requirements: 12.4, 12.6, 12.15, 19.8_

  - [ ] 7.9 Build the board grade entry and what-if mode
    - Create `features/pathways/BoardScreen`, `GradeForm` (one `<select>` per subject for Bahasa Melayu, Bahasa Inggeris, Matematik, Sejarah, Sains with the 10 grades, 44 px targets), and a pure `whatIf.ts` state helper
    - What-if mode edits local predicted grades labelled "Predicted" and leaves the saved Grade_Set untouched. Turning it off discards them. With it off, edits call `setGrade` within 1 second
    - Add the import button (replaces only Matematik, kind message when no exam result exists) and the friendly empty-grades prompt with no hints
    - Create `board.css` and lazy-load rule data with the board chunk
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 2.5_

  - [ ] 7.10 Build pathway cards, detail panel, and the Disclaimer
    - Render six cards in a CSS grid (usable at 360 px) with an icon and a text label per hint level, and a detail panel showing usual requirements, reason, `lastReviewed`, next step, and what would change the hint
    - Add the `Disclaimer` component (`getDisclaimer(lang)` with fallback), shown unabridged on the board, on every detail view, and in the empty state, in a sticky strip that stays visible at 360 x 640 after hints render
    - Switching language re-renders in place without changing grades or the open detail view
    - Add the supportive message when no pathway is open (naming the best one) and the list of open pathways when viewing a different level
    - Use hedged wording only ("may be open", "usually needs")
    - _Requirements: 11.3, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12, 13.1, 13.4, 13.5, 13.6, 17.4, 15.4_

  - [ ]* 7.11 Write property test for grade import
    - **Property 31: Grade import replaces only Matematik**
    - **Validates: Requirements 2.5, 11.4, 11.5**
    - _Requirements: 2.5, 11.4, 11.5_

  - [ ]* 7.12 Write property test for what-if mode
    - **Property 32: What-if mode never changes saved grades**
    - **Validates: Requirements 11.6, 11.7, 11.8**
    - _Requirements: 11.6, 11.7, 11.8_

  - [ ]* 7.13 Write component tests for the board
    - Cover Disclaimer on the board, the detail view, and the empty state, the what-if toggle, the import button, language switch in place, and forbidden phrases
    - _Requirements: 11.6, 11.9, 12.7, 13.1, 13.5_

  - [ ]* 7.14 Write the single-flow integration test
    - Onboarding, a chat message, one quiz answer, the Paper with a fake clock and a canned answer set, the results screen, a Rakan nudge naming a weak topic, grade import, six hints and the Disclaimer, all with no network and no key
    - _Requirements: 20.3, 20.5, 2.5, 7.7_

  - [ ] 7.15 Checkpoint - Ensure all tests pass
    - Run `npm run lint`, `npm test`, and `npm run build`. Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Optional remote AI: providers, fallback, Pages Function, consent UI (~1 evening)
  - [ ] 8.1 Implement the payload builder, consent gate, and fallback
    - Extend `generateReply.ts` and add `buildRemotePayload` (question at most 500 characters, language, at most one topic, share fields only when opted in, skip the call above 1.8 KB)
    - Gate order: consent recorded, provider enabled, `navigator.onLine`, and a rephrasable intent (`topic_help`, `greeting`, `unknown` only)
    - Abort at 8000 ms with `AbortController`. Any failure, 429, timeout, or empty body returns the rules reply silently. Quiz marks, nudges, pathway replies, and the Disclaimer are always rules output
    - _Requirements: 4.8, 4.9, 4.10, 4.11, 5.4, 5.5, 5.6, 5.8, 5.9, 15.7_

  - [ ] 8.2 Implement the UserKey and Proxy providers
    - Create `userKeyProvider.ts` (constant provider URLs for the supported free-tier providers, key read from `loadSecret`, sent only to the chosen provider) and `proxyProvider.ts` (`POST /api/chat`, body at most 2 KB)
    - Add no paid service and no new non-free dependency
    - _Requirements: 4.8, 4.9, 5.7, 18.4, 18.5_

  - [ ] 8.3 Implement the Cloudflare Pages Function proxy
    - Create `functions/api/chat.ts`: reject non-POST, wrong content type, and bodies over 2048 bytes (413), validate a strict schema (`question` at most 500, `language`, optional `topic` at most 60), keep a fixed server-side system prompt, call the `AI` binding with a low `max_tokens`, map errors to 429 or 502, and never log request or response text
    - _Requirements: 5.9, 5.10, 18.5_

  - [ ] 8.4 Build the remote AI settings and consent UI
    - In Settings, add provider toggles (all off by default), the plain-language consent notice listing exactly what is sent and the receiving provider, confirm and dismiss behaviour, API key entry, share opt-ins for name, school, and grades (off by default), revoke, and a neutral "remote helper not reachable" status line
    - Wire the chat screen to build `deps` from settings so the default path stays rules only
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7, 5.8, 4.7, 4.10_

  - [ ] 8.5 Write property test for remote failure fallback
    - **Property 6: Remote failure falls back to the rules reply**
    - Use fake providers and a fake clock for rejection, timeout, 429, empty, and malformed bodies
    - **Validates: Requirements 4.10, 15.7, 19.4**
    - _Requirements: 4.10, 15.7, 19.1, 19.3, 19.4_

  - [ ] 8.6 Write property test for no consent or offline
    - **Property 7: No consent or offline means zero remote calls**
    - **Validates: Requirements 5.1, 5.4, 5.8, 15.7**
    - _Requirements: 5.1, 5.4, 5.8, 15.7, 19.1_

  - [ ]* 8.7 Write property test for minimal remote payload
    - **Property 8: Remote payload is minimal**
    - **Validates: Requirements 5.5, 5.6, 5.9**
    - _Requirements: 5.5, 5.6, 5.9_

  - [ ]* 8.8 Write property test for proxy rejection
    - **Property 9: Proxy rejects oversized or malformed bodies**
    - Use a fake `AI` binding and a console spy
    - **Validates: Requirements 5.9**
    - _Requirements: 5.9, 5.10_

  - [ ] 8.9 Write example tests for the fallback path
    - Fake UserKey and Proxy providers: failure, timeout, 429, success, consent missing, offline. After each, the next chat message still works and the input stays enabled
    - _Requirements: 4.10, 5.4, 15.7, 19.1, 19.3, 19.4_

  - [ ]* 8.10 Write component tests for the consent UI
    - Cover dismiss leaving the provider disabled, confirm recording consent, and revoke returning to rules only
    - _Requirements: 5.2, 5.3, 5.8_

  - [ ] 8.11 Checkpoint - Ensure all tests pass
    - Run `npm run lint`, `npm test`, and `npm run build`. Ensure all tests pass, ask the user if questions arise.

- [ ] 9. PWA, offline behaviour, and accessibility pass (~1 evening)
  - [ ] 9.1 Add the web manifest and icons
    - Create `public/manifest.webmanifest` (name, short name, `display: standalone`, theme colour, 192 and 512 icons plus one maskable) and link it from `index.html`
    - Draw original SVG icons and generate the PNGs with a small Node script that uses only built-in modules, so no new dependency is needed
    - _Requirements: 15.1, 17.8_

  - [ ] 9.2 Implement the service worker and precache plugin
    - Write `public/sw.js` (precache the shell, cache-first runtime caching for lazy chunks, network only for `/api/chat`, delete old caches on activate, offline navigation falls back to cached `index.html`)
    - Add a small Vite plugin that writes `dist/precache-manifest.json`
    - Create `src/app/registerSW.ts`: never call `skipWaiting()` or `clients.claim()`, never reload on `controllerchange`, and show no update prompt while an exam is in progress
    - _Requirements: 15.2, 15.3, 15.4, 15.8, 15.9_

  - [ ] 9.3 Add offline experience and lazy-chunk failure handling
    - Add `OfflineNotice` (online and offline events) and the "needs one online visit first" message when a lazy import rejects offline, with a link back to Rakan
    - Keep every rules-based Rakan feature working offline
    - _Requirements: 15.5, 15.6, 15.7, 15.11_

  - [ ] 9.4 Add the bundle size gate
    - Create `scripts/check-size.mjs` that gzips the entry chunks and fails above 200 KB, and run it after `vite build` in `npm run build`
    - Confirm exam and pathway content stay in lazy chunks
    - _Requirements: 15.10, 18.1, 18.2_

  - [ ] 9.5 Add the stitched-seam mode transition
    - Add the CSS-only wipe of 300 ms or less on mode change, with navigation not delayed, and no animation under `prefers-reduced-motion` (typing indicator becomes a static element)
    - _Requirements: 17.6, 17.7, 16.9_

  - [ ] 9.6 Run the accessibility pass
    - Check that every control has an accessible name from i18n, Tab and Enter or Space work with no keyboard trap, targets are at least 44 px, and no screen scrolls horizontally from 360 to 1280 px
    - Pair every colour-only state (correct, missed, selected, hint level, timer warning) with an icon or text
    - Verify the three mode skins keep body text contrast at least 4.5:1
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.10, 17.10_

  - [ ]* 9.7 Write the contrast test
    - Compute the WCAG ratio for each token pair per mode and assert at least 4.5 for text and 3 for large text, borders, and focus
    - _Requirements: 16.2, 17.10_

  - [ ]* 9.8 Write accessibility component tests
    - Check accessible names for every button and input, the `lang` attribute on load and on toggle, live regions present, and the language toggle on every screen
    - _Requirements: 16.6, 16.7, 16.8, 16.11, 16.12, 14.1_

  - [ ]* 9.9 Write tests for the service worker registration guard
    - Check there is no reload on `controllerchange` and no update prompt while `examInProgress` is set
    - _Requirements: 15.8, 15.9_

  - [ ] 9.10 Checkpoint - Ensure all tests pass
    - Run `npm run lint`, `npm test`, and `npm run build`. Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Submission: docs, deploy guide, Devpost checklist, final gates (~1 evening)
  - [ ] 10.1 Write the English README
    - Create `README.md` explaining the project, the three stitched parts and the shared profile, how to run it with `npm run dev`, `build`, `lint`, and `test`, the privacy approach (browser-only data, opt-in remote AI, no analytics), and that the full demo works offline with no API key
    - Include the pathway guidance-only note and no claim of official eligibility or endorsement
    - Use no em dashes
    - _Requirements: 18.9, 5.11, 13.1, 15.11_

  - [ ] 10.2 Write the English demo script
    - Create `docs/demo-script.md` listing each step in order with a target time per step and a total of no more than 180 seconds: onboarding, a Rakan quiz answer, the Paper with the 60 second demo timer, results, the updated Rakan nudge, the board with imported grade, hints, and the Disclaimer
    - Add a pre-demo setup note (first online visit to cache exam and board, then go offline, enable the demo timer)
    - _Requirements: 20.3, 20.4, 20.5, 20.6, 15.4_

  - [ ] 10.3 Write the Kiro usage write-up
    - Create `docs/kiro-usage.md` describing how Kiro was used: specs (requirements, design, tasks), steering files (tech, product, content-integrity), hooks if any, and how property-based tests came from the design correctness properties
    - Read `.kiro/` first so the write-up matches what exists in the repository
    - _Requirements: 20.6_

  - [ ] 10.4 Write the Cloudflare Pages deploy guide
    - Create `docs/deploy-cloudflare-pages.md` for the human to follow: build command `npm run build`, output directory `dist`, optional Workers AI binding named `AI` for `functions/api/chat.ts`, and a post-deploy smoke check
    - State that the deploy is run by the human and that no code or task pushes, deploys, or creates remotes
    - _Requirements: 18.3, 18.4, 18.5_

  - [ ] 10.5 Write the Devpost submission checklist
    - Create `docs/devpost-checklist.md` for the human: Frankenstein category, English project text, demo video of 3 minutes or less following the demo script, public repo link, live URL, screenshots of the three modes, the Kiro usage write-up link, and the submission deadline of Friday 4 December 2026
    - Note that the human performs the submission
    - _Requirements: 20.7, 20.6_

  - [ ] 10.6 Write the manual test checklist
    - Create `docs/manual-checklist.md` from the design Manual checklist: install as PWA and run the demo offline, first-visit lazy-content behaviour, new build during an exam, screen reader smoke test, 360 x 640 Disclaimer visibility, reduced motion, and a timed run of the demo script
    - _Requirements: 13.4, 15.3, 15.4, 15.5, 15.9, 15.11, 16.7, 16.8, 16.9, 20.3, 20.6_

  - [ ]* 10.7 Write the public copy scan test
    - Scan i18n strings, `content/`, `README.md`, and `docs/` for the em dash character, the word "kau", and the forbidden phrases ("you are eligible", "you will get in", and BM equivalents)
    - _Requirements: 12.7, 14.10, 14.11_

  - [ ] 10.8 Run the final gates and fix failures
    - Run `npm run lint`, `npm test` (once, not watch), and `npm run build` (including the size gate) and fix any failure
    - Confirm the demo script exists in `docs/` and the three commands exit with code 0
    - Do not deploy, push, or create remotes
    - _Requirements: 18.1, 18.7, 18.8, 20.7, 19.1_

  - [ ] 10.9 Final checkpoint - Ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. Required tests cover the Marker (3.4 to 3.11), the timer (4.2, 4.3, 4.5 and the submit and resume properties 4.7, 4.8), eligibility (7.3 to 7.6, 7.8), storage (1.7 to 1.10, 2.4, 2.5), and the Reply_Generator fallback (8.5, 8.6, 8.9), as the steering requires.
- Before any task is called done, run `npm run lint`, `npm test` (once, not watch), and `npm run build`.
- Each task references specific requirements for traceability. Property sub-tasks name the design property number and the requirements it validates.
- All test data uses original, fictional students. Tests need no network and no API key.
- The human runs the Cloudflare Pages deploy and the Devpost submission. No task deploys, pushes, or creates remotes.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "1.7", "1.8", "1.9", "1.10", "1.11", "1.12"] },
    { "id": 3, "tasks": ["1.6"] },
    { "id": 4, "tasks": ["2.1"] },
    { "id": 5, "tasks": ["2.2", "2.3"] },
    { "id": 6, "tasks": ["2.4", "2.5", "2.6"] },
    { "id": 7, "tasks": ["2.7"] },
    { "id": 8, "tasks": ["3.1"] },
    { "id": 9, "tasks": ["3.2", "3.3"] },
    { "id": 10, "tasks": ["3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "3.10", "3.11"] },
    { "id": 11, "tasks": ["4.1"] },
    { "id": 12, "tasks": ["4.2", "4.3", "4.4", "4.5", "4.6", "4.10"] },
    { "id": 13, "tasks": ["4.7", "4.8", "4.9", "4.11", "4.12", "4.13"] },
    { "id": 14, "tasks": ["4.14"] },
    { "id": 15, "tasks": ["4.15"] },
    { "id": 16, "tasks": ["5.1"] },
    { "id": 17, "tasks": ["5.2", "5.3"] },
    { "id": 18, "tasks": ["5.4", "5.6", "5.7"] },
    { "id": 19, "tasks": ["5.5", "5.8", "5.9", "5.11"] },
    { "id": 20, "tasks": ["5.10"] },
    { "id": 21, "tasks": ["6.1", "6.2"] },
    { "id": 22, "tasks": ["6.3"] },
    { "id": 23, "tasks": ["6.4", "6.5", "6.6", "6.7"] },
    { "id": 24, "tasks": ["6.8", "6.9"] },
    { "id": 25, "tasks": ["6.10"] },
    { "id": 26, "tasks": ["7.1"] },
    { "id": 27, "tasks": ["7.2"] },
    { "id": 28, "tasks": ["7.3", "7.4", "7.5", "7.6", "7.7", "7.8", "7.9"] },
    { "id": 29, "tasks": ["7.10", "7.11", "7.12"] },
    { "id": 30, "tasks": ["7.13", "7.14"] },
    { "id": 31, "tasks": ["7.15"] },
    { "id": 32, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 33, "tasks": ["8.4", "8.5", "8.6", "8.7", "8.8", "8.9"] },
    { "id": 34, "tasks": ["8.10"] },
    { "id": 35, "tasks": ["8.11"] },
    { "id": 36, "tasks": ["9.1", "9.2", "9.4"] },
    { "id": 37, "tasks": ["9.3"] },
    { "id": 38, "tasks": ["9.5"] },
    { "id": 39, "tasks": ["9.6"] },
    { "id": 40, "tasks": ["9.7", "9.8", "9.9"] },
    { "id": 41, "tasks": ["9.10"] },
    { "id": 42, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6"] },
    { "id": 43, "tasks": ["10.7"] },
    { "id": 44, "tasks": ["10.8"] },
    { "id": 45, "tasks": ["10.9"] }
  ]
}
```
