---
inclusion: always
---

# Tech

## Stack

- Vite + React + TypeScript (strict mode).
- Vitest for unit tests, ESLint for linting.
- Plain CSS or CSS modules. No heavy UI kit.
- PWA friendly: web manifest and service worker so the app installs and works offline.
- Brand-new code only. Do not copy from other repos.

## Folder structure

```
src/
  app/            shell, routing, layout, language toggle
  features/
    chat/         Rakan chat UI and reply logic
    exam/         timer, paper runner, marking
    pathways/     grade input, eligibility rules, board
  core/
    profile/      shared student profile and progress
    storage/      IndexedDB / localStorage wrapper
    ai/           provider interface, providers, fallback
    i18n/         BM/EN strings and helpers
  content/        original questions, skema, pathway data (typed JSON/TS)
  styles/
functions/        Cloudflare Pages Functions (optional AI proxy)
public/           manifest, icons
docs/             public English docs
.kiro/steering/
```

Features import from `core`, never from each other. Cross-feature data flows through the profile.

## Commands

- `npm run dev` start Vite.
- `npm run build` typecheck and build to `dist/`.
- `npm run lint` ESLint.
- `npm test` Vitest (run once, not watch, in CI and agents).

Run lint, tests, and build before calling a task done.

## Hosting

Static site on Cloudflare Pages free tier. Build command `npm run build`, output `dist`. No Vercel, no Supabase, no paid services. Do not deploy, push, or create remotes unless the user asks.

## Storage

Browser only. Use a small wrapper in `core/storage` (IndexedDB preferred, localStorage acceptable). Version stored data and include a migration hook. Provide export and "clear my data" actions.

## AI provider abstraction

- One interface in `core/ai`, for example `generateReply(request): Promise<Reply>`.
- Providers: `rules` (deterministic, always available), `userKey` (user supplies a free-tier key, kept in browser storage only), `proxy` (Cloudflare Pages Function calling Workers AI free tier).
- Default is `rules`. The full demo must work offline with no key.
- If a remote call fails, times out, or is rate limited, fall back to `rules` silently and keep the UI usable.
- AI may phrase chat replies and explanations. Marking and eligibility must stay deterministic and rule-based, never decided by an LLM.
- The proxy must not log prompts, and must cap request size.

## Testing

- Unit test marking, timer logic, eligibility rules, storage wrapper, and the fallback path.
- Tests must not need network or API keys.
- Test data uses original, fictional students.

## Zero-cost rules

- Every dependency and service must be free and open source or free tier.
- No telemetry or analytics by default.
- No global package installs. Use project-local dev dependencies only.
- Keep the bundle small. Lazy load exam and pathway content.
