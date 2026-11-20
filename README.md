# Rakan Ulangkaji

A bilingual (Bahasa Melayu / English) study buddy for Malaysian SPM students: chat, a timed exam paper, and a pathway board, all sharing one profile.

## The three stitched parts

1. **Rakan chat.** A WhatsApp-style study buddy that answers questions, quizzes you, and sends gentle nudges.
2. **Exam mode.** A formal, timed, SPM-style paper with original questions, a countdown, and marking against an answer scheme (skema) with explanations.
3. **Pathway board.** Enter predicted or actual grades and see routes that may be open: Matrikulasi, Asasi, STPM, Diploma, TVET, Foundation.

Exam results update your profile, which changes what Rakan says and what the board shows.

Built for the **Frankenstein** category of Kiroween 2026: three normally separate experiences stitched into one app.

## Shared profile

One student profile and progress record, stored in the browser, feeds all three parts. A finished exam attempt saves a Matematik grade and weak topics. Rakan then nudges you about a weak topic, and the board can import that grade to show updated hints. The parts are not separate pages with separate data.

## Works offline, no key needed

The full demo runs with no network and no API key. Rakan replies with a deterministic built-in rules provider by default. After the first online visit caches the app, you can install it as a PWA and use it offline.

## Privacy

- Profile, grades, progress and chat history stay in your browser storage. There is no backend database.
- No analytics, trackers or third-party fonts and scripts.
- Remote AI is opt-in and off by default. Before the first remote call the app tells you in plain words what will be sent. Only the current question and minimal context are sent. Your own API key stays in this browser and goes only to the provider you chose.
- Settings has "export my data" and "delete my data" actions.
- Marking and pathway hints are always rule-based. AI never decides them.

## Tech stack

- Vite, React, TypeScript (strict)
- Vitest and fast-check for tests, ESLint for linting
- Plain CSS, no UI kit
- PWA: installable and works offline
- Browser-only storage. No accounts, no backend database, no analytics
- Optional AI behind one provider interface: deterministic `rules` (default, works offline), user-supplied key, or a Cloudflare Pages Function proxy. Marking and eligibility never use AI.

## Zero-cost hosting

Static site on the Cloudflare Pages free tier. Build command `npm run build`, output directory `dist`. No paid services. See [`docs/deploy-cloudflare-pages.md`](docs/deploy-cloudflare-pages.md). A GitHub Pages option (no remote AI) is in [`docs/deploy-github-pages.md`](docs/deploy-github-pages.md).

## How Kiro was used

Kiro drove the planning and build. See:

- [`.kiro/steering/`](.kiro/steering/) for product, tech, content and tone rules
- [`.kiro/specs/rakan-ulangkaji-mvp/`](.kiro/specs/rakan-ulangkaji-mvp/) for requirements, design and tasks
- [`.kiro/hooks/`](.kiro/hooks/) for lint, test, copy-check and spec-sync hooks
- [`docs/kiro-usage.md`](docs/kiro-usage.md) for the write-up of how Kiro was used
- [`docs/kiro-usage-log.md`](docs/kiro-usage-log.md) for a dated log of Kiro features used

## Local development

```bash
npm install
npm run dev          # start Vite
npm run build        # typecheck, build to dist/, check bundle size
npm run preview      # serve the built site
npm test             # run Vitest once
npm run lint         # ESLint
npm run copy:check   # check copy for em dashes and banned words
```

## More docs

- [`docs/demo-script.md`](docs/demo-script.md): the 3 minute demo
- [`docs/manual-checklist.md`](docs/manual-checklist.md): checks that tests cannot cover
- [`docs/devpost-checklist.md`](docs/devpost-checklist.md): submission steps

## Links

- Live URL: https://haziqhalifi.github.io/rakan-ulangkaji/ (GitHub Pages, deployed by `.github/workflows/pages.yml`)
- Demo video: https://youtu.be/COlHKoUSwy0

## Disclaimers

- All exam questions are original and written for this project. None are copied from past papers, trial papers or commercial books.
- Pathway information is guidance only. Requirements change every year. Always check official sources such as UPU and the institution's website. This project is not endorsed by MOE, UPU or any institution.

## Licence

[MIT](LICENSE)
