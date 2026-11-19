# Deploy to GitHub Pages (free)

The app is a static site, so it can run at `https://haziqhalifi.github.io/rakan-ulangkaji/`. The human runs this deploy. No script in this repository pushes or deploys.

## 1. Turn on Pages

In the repository, go to Settings, then Pages, and set Source to GitHub Actions.

## 2. Deploy

Push to `main`, or run the "Deploy to GitHub Pages" workflow by hand from the Actions tab. The workflow in `.github/workflows/pages.yml` runs lint and tests, builds with `BASE_PATH=/rakan-ulangkaji/`, copies `index.html` to `404.html`, and publishes `dist`.

## 3. Build locally for the subpath

```
BASE_PATH=/rakan-ulangkaji/ npm run build
```

Without `BASE_PATH` the base is `/`, which is what Cloudflare Pages and `npm run dev` use.

## What differs from Cloudflare

- Routing uses the URL hash (`#/rakan`), so no server rewrite rules are needed.
- The service worker is registered at `/rakan-ulangkaji/sw.js` with that scope, so the app still installs and works offline.
- GitHub Pages has no Pages Functions, so `/api/chat` is not available. Remote AI through the built-in helper needs the Cloudflare deploy. Rakan falls back to built-in replies without any error. A user's own API key still works.

For Cloudflare, see [deploy-cloudflare-pages.md](deploy-cloudflare-pages.md).
