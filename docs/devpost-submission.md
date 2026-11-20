# Devpost submission: Rakan Ulangkaji

Draft text for the Kiroween 2026 Devpost form. Everything here was checked against the repository on Thu 19 Nov 2026.

## Project name

Rakan Ulangkaji

## Tagline

A study-buddy chat, a timed SPM exam hall and a pathway planner, stitched together by one on-device profile. It works offline and needs no key.

<!-- Tagline length: 143 characters (limit 200). -->

## Category

Frankenstein.

Rakan Ulangkaji joins three things that normally live in separate apps: a WhatsApp-style study-buddy chat, a formal timed SPM exam hall with marking against a skema (answer scheme), and a post-SPM pathway planner. One shared profile, stored on the student's device, is the body that holds them together. An exam result changes what Rakan says in chat and what the pathway board shows.

The brain is a rule engine, with an optional LLM that may only phrase chat replies. The whole demo works offline.

## Inspiration

SPM students in Malaysia often revise on a phone, on patchy data. The tools they use are split up. One app chats, another holds past papers, and a third place, if they find it at all, explains what their grades might lead to.

We wanted to see what happens when those three share one memory. If a student does badly on indices in a timed paper, the chat buddy should know. If the same paper gives a Matematik grade, the pathway board should be able to use it.

I also wanted something free to run, light on data and kind in tone.

## What it does

- **Rakan chat.** A WhatsApp-style buddy. It answers questions about the topics in the app, runs short quizzes, and sends at most one gentle nudge per app session about the student's weakest topic.
- **Exam mode.** A timed Matematik practice paper with 16 original questions (12 objective, 4 structured) worth 27 marks. It has a countdown, resume after a refresh, auto-submit at zero, and marking per skema point. Results show marks by topic, the correct option letter for objective questions, a short explanation for each question and an estimated grade.
- **Pathway board.** The student enters grades, or turns on "What if mode" to try predicted grades without saving them. The board shows hints for Matrikulasi, Asasi, STPM, Diploma, TVET and Foundation, with the reasons and what may change each hint. It can import the grade from the latest exam.
- **Shared profile.** Profile, grades, progress and chat history stay in the browser. Settings has "Download my data" and "Delete my data".
- **Two languages.** The interface and content work in Bahasa Melayu and English, with a toggle.
- **Offline.** After one online visit, the app installs as a PWA and runs without a network.

Marking and pathway hints are plain rules in code. An LLM never decides them. Pathway hints use hedged wording such as "May be open" and always show a guidance-only disclaimer.

Scope is small on purpose. Matematik is the only subject with a paper, covering four topics: indices and sets (Form 4), variation and matrices (Form 5).

## How we built it

- **Front end.** Vite, React and TypeScript in strict mode. Plain CSS, no UI kit. Exam and board content load lazily to keep the bundle small.
- **Storage.** Browser only. IndexedDB with a versioned schema and a migration hook, and export, import and delete actions. No accounts and no backend database.
- **PWA.** A web manifest and a hand-written service worker, with a precache list generated at build time.
- **AI layer.** One provider interface with three providers. `rules` is deterministic and is the default. `userKey` uses a free-tier key that the student pastes in, kept in the browser. `proxy` is an optional Cloudflare Pages Function that calls the Workers AI free tier. Any failure, timeout or rate limit falls back to `rules`. Remote AI is off by default, and the app lists exactly what would be sent before the first remote call.
- **Tests.** Vitest, Testing Library and fast-check property tests. `npm test` runs 326 tests in 41 files, with no network and no API key. Tests cover marking, the timer, eligibility rules, storage, the fallback path and a scan of public copy. Each skema in the shipped paper is also checked for consistency.
- **Hosting.** The live site is built and deployed to GitHub Pages by a GitHub Actions workflow that runs lint, tests and the build. The same code also builds for Cloudflare Pages, which is where the optional proxy would run. On GitHub Pages the proxy is not available, and Rakan uses the built-in rules.
- **Cost.** Zero. Every dependency and service is free or open source.

## How we used Kiro

We built the project end to end with Kiro CLI 3.5.0 in headless mode (`--no-interactive`, `--trust-all-tools`, `--v3`). Every prompt is saved in [`kiro-prompts/`](../kiro-prompts/), and each run is recorded in [`docs/kiro-usage-log.md`](kiro-usage-log.md).

- **Steering.** Four files in `.kiro/steering/`: `product`, `tech`, `copy-and-tone` and `content-integrity`. They fix the product scope, the stack, the voice (including "awak" or "korang" in Bahasa Melayu) and the rules for original questions, skema format, privacy and the pathway disclaimer.
- **Spec mode.** We ran Kiro with `--mode spec`, requirements first. It produced 20 requirements in EARS style, a design with numbered correctness properties (41 of them), and a plan of 10 tasks.
- **Spec task execution.** Each of the 10 tasks was one headless run. A small shell loop checked build, lint and tests after each run, and made one commit per task.
- **Properties to tests.** Each design property became a fast-check test, tagged with its property number.
- **Hooks.** Four hooks in `.kiro/hooks/`:
  - `copy-guard` blocks em dashes and the banned informal pronoun in copy.
  - `lint-on-save` runs ESLint with fix on saved TypeScript files.
  - `test-on-save` runs the marking, eligibility and storage tests after a save in `src/core`.
  - `spec-sync` is a Stop hook that ticks finished tasks in `tasks.md` and appends to the usage log. We observed it firing at the end of the scaffold run, where it correctly ticked nothing because the task was not finished.
- **Deployment and fixes.** Kiro also wrote the GitHub Pages deployment config (base path, service worker and precache changes, the workflow). After a smoke test of the live site, Kiro fixed two small bugs: singular and plural mark counts, and showing the correct option letter in the results.
- **Credits.** The whole build used about 110 Kiro credits.

Judges can find the full record in the [`.kiro/`](../.kiro/) folder: steering, the spec (requirements, design, tasks) and hooks.

## Challenges we ran into

- **Keeping AI away from marking.** It is tempting to let a model explain and mark answers. We kept marking and eligibility as deterministic rules, tested with property tests, and gave the model only the job of phrasing chat replies.
- **Honest pathway hints.** Entry rules change every year and differ by institution. We store the rules as dated data, use hedged wording and show the disclaimer on every board view.
- **Offline first.** The service worker only caches what it has seen, so the app must be opened once online before it works offline. We made that clear in the UI and in the demo script.
- **GitHub Pages sub-path.** The site is served under `/rakan-ulangkaji/`, which touched the router, the service worker and the precache list.
- **Original content.** Writing a fresh paper with a consistent skema takes care. A test checks that every shipped question has a consistent skema.
- **Tone.** The copy rules ban em dashes and one informal pronoun. The copy-guard hook caught slips early.

## Accomplishments that we're proud of

- One profile really does connect the three parts. A finished paper updates weak topics, Rakan nudges about the weakest one, and the board can import the Matematik grade.
- The full demo runs with no key and no network.
- 326 passing tests, including 40 distinct numbered properties from the design, none needing network access.
- A privacy model without compromises for the MVP: no analytics, no third-party scripts or fonts, remote AI opt-in with a plain-words notice, and export and delete actions.
- The Kiro workflow is documented and repeatable. Every prompt and every run is in the repository.

## What we learned

- A written spec with numbered properties gives a headless agent something to be checked against. The gates after each run (build, lint, tests) show whether a task really finished.
- Steering files keep tone and scope stable across many separate runs.
- Small hooks are useful. A copy check on save catches problems before review.
- Rules first, model second makes a product that is cheaper, faster and easier to trust.
- Smoke-testing the deployed site found bugs that unit tests did not.

## What's next

- More subjects and more papers, starting with Bahasa Melayu, Sejarah and Sains.
- More topics and more questions for Matematik.
- Review of the pathway rules against official sources, with the review date updated each time.
- A proper accessibility pass with real screen readers and low-end phones.
- Feedback from real students and teachers before adding anything else.

## Built with

Kiro, Kiro CLI, Vite, React, TypeScript, Vitest, fast-check, Testing Library, ESLint, IndexedDB, Service Worker, PWA, CSS, GitHub Actions, GitHub Pages, Cloudflare Pages Functions, Cloudflare Workers AI

## Links

- Repo: https://github.com/haziqhalifi/rakan-ulangkaji
- Live: https://haziqhalifi.github.io/rakan-ulangkaji/
- Demo video: https://youtu.be/COlHKoUSwy0

## Disclosure

- This is a new project, started and built on 19 Nov 2026 during the Kiroween submission period. No prior code was reused.
- All exam questions are original. None are taken from MOE or Lembaga Peperiksaan papers, trial papers or commercial books.
- All students in the demo and in the tests are fictional.
- Pathway hints are guidance only. Requirements change every year. Always check official sources such as UPU and the institution's website. This project is not endorsed by MOE, UPU or any institution.
