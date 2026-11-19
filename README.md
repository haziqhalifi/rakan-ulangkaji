# Rakan Ulangkaji

A bilingual (Bahasa Melayu / English) study buddy for Malaysian SPM students: chat, a timed exam paper, and a pathway board, all sharing one profile.

## The three stitched parts

1. **Rakan chat.** A WhatsApp-style study buddy that answers questions, quizzes you, and sends gentle nudges.
2. **Exam mode.** A formal, timed, SPM-style paper with original questions, a countdown, and marking against an answer scheme (skema) with explanations.
3. **Pathway board.** Enter predicted or actual grades and see routes that may be open: Matrikulasi, Asasi, STPM, Diploma, TVET, Foundation.

Exam results update your profile, which changes what Rakan says and what the board shows.

Built for the **Frankenstein** category of Kiroween 2026: three normally separate experiences stitched into one app.

## Tech stack

- Vite, React, TypeScript (strict)
- Vitest and fast-check for tests, ESLint for linting
- Plain CSS, no UI kit
- PWA: installable and works offline
- Browser-only storage. No accounts, no backend database, no analytics
- Optional AI behind one provider interface: deterministic `rules` (default, works offline), user-supplied key, or a Cloudflare Pages Function proxy. Marking and eligibility never use AI.

## Zero-cost hosting

Static site on the Cloudflare Pages free tier. Build command `npm run build`, output directory `dist`. No paid services.

## How Kiro was used

Kiro drove the planning and build. See:

- [`.kiro/steering/`](.kiro/steering/) for product, tech, content and tone rules
- [`.kiro/specs/rakan-ulangkaji-mvp/`](.kiro/specs/rakan-ulangkaji-mvp/) for requirements, design and tasks
- [`.kiro/hooks/`](.kiro/hooks/) for lint, test, copy-check and spec-sync hooks
- [`docs/kiro-usage-log.md`](docs/kiro-usage-log.md) for a dated log of Kiro features used

## Local development

```bash
npm install
npm run dev          # start Vite
npm run build        # typecheck and build to dist/
npm run preview      # serve the built site
npm test             # run Vitest once
npm run lint         # ESLint
npm run copy:check   # check copy for em dashes and banned words
```

## Links

- Live URL: _coming soon_
- Demo video: _coming soon_

## Disclaimers

- All exam questions are original and written for this project. None are copied from past papers, trial papers or commercial books.
- Pathway information is guidance only. Requirements change every year. Always check official sources such as UPU and the institution's website. This project is not endorsed by MOE, UPU or any institution.

## Licence

[MIT](LICENSE)
