# Deploy to Cloudflare Pages (free tier)

The human runs this deploy. No code, script or task in this repository pushes, deploys or creates remotes.

## 1. Create the project

1. Push the repository to a public Git host yourself.
2. In the Cloudflare dashboard, go to Workers & Pages, then Create, then Pages, then connect to Git.
3. Pick the repository.

## 2. Build settings

| Setting | Value |
|---|---|
| Framework preset | None (or Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 20 or newer (set `NODE_VERSION` if needed) |

`npm run build` typechecks, builds, and runs the bundle size gate. `public/_redirects` handles single page routing.

## 3. Optional: Workers AI binding

The app works fully without this. To enable the built-in helper for opt-in remote replies:

1. Open the Pages project, then Settings, then Bindings (Functions).
2. Add a Workers AI binding with the variable name `AI`.
3. Redeploy so `functions/api/chat.ts` can use it.

The function caps request size, does not log prompts, and returns an error the app handles by falling back to built-in replies. Workers AI has a free daily allowance. Check Cloudflare's current limits.

## 4. Post-deploy smoke check

1. Open the live URL in a fresh browser profile. Onboarding appears.
2. Finish onboarding, then open Exam and Pathways once so they are cached.
3. Reload with the network off. The app still opens and Rakan still replies.
4. Check the install prompt or the browser's "Install app" option.
5. Open Pathways and confirm the "Guidance only" disclaimer shows.
6. Only if you added the `AI` binding: in Settings, opt in to the built-in helper, ask Rakan a topic question, and confirm a reply. With the binding missing or the network off, Rakan should still reply with built-in text.
7. In DevTools, Network tab: confirm no calls to third-party hosts before you opt in to remote AI.

## 5. After deploy

Put the live URL in `README.md` and in the Devpost form.
