# Subtitle Ladder repair handoff

## Release decision

Repair complete for verifier report `d50c2ec30bf3928c631df61d0bf60596b30d8371`
against candidate `c08eda998db905e52377e3db7f9d0eb53d947781`. The repair commit is recorded
below after commit creation. The artifact remains a Vite + TypeScript static PWA
and deploys from `dist/`.

## What changed

- Added `/demo/` and `/?demo=1`: a ready 20-second German sample lesson with
  target and English captions, a persistent “Demo — sample data, nothing is
  saved” banner, Reset demo, and Start for real.
- Demo projects use `demo:subtitle-ladder`; real projects use
  `subtitle-ladder`. Start for real clears demo data before returning to the
  real library. `.factory/demo.md` documents the sample and namespace.
- Added `.factory/claims.json` with nine observable claim checks. The claim
  suite exercises sample data, demo isolation, all four rungs, local-only
  requests, offline reload, microphone takes, JSON export, the $12 checkout,
  and imported timed loops.
- Rewrote the first screen around the job and first action: “Practise speaking
  with your own captions,” a learner-specific sentence, visible sample action,
  and short storage/offline/price facts. `.factory/copy-audit.md` records the
  plain-words audit.
- Repaired 390px layout overflow in both the welcome hero and the horizontal
  practice ladder. The Playwright test asserts `scrollWidth <= clientWidth` on
  landing and demo practice.
- Reworked the service worker to use a build-ID cache name, fetch fresh shell
  data during install, precache both demo URLs, and delete old cache versions.
  A browser regression forces an update, verifies the fresh cache contains the
  current bundle, then reloads the demo offline.
- Added `staticwebapp.config.json` with CSP, Permissions-Policy, nosniff and
  referrer headers, immutable hashed-asset caching, manifest media type, and a
  styled 404 response override. Added `404.html`/`404.css` and route/config
  regression coverage.
- Added canonical URLs, demo sitemap entry, direct demo title, and Param
  Factory/build footer metadata.

## Run and deploy

```sh
npm ci
npm test
npm run build
npm run test:claims -- --grep @claim:
npm run test:e2e
/opt/fleet/lib/deploy-static.sh speaking-subtitle-ladder dist
```

The deployment output is `dist/` with `dist/index.html` at its root.

## Verification evidence (2026-08-28)

- Clean install: `npm ci` — 60 packages, 0 vulnerabilities.
- Unit/release configuration: `npm test` — 8 tests passed.
- Production typecheck/build: `npm run build` — passed; JS 38.32 kB raw / 13.84
  kB gzip, CSS 20.98 kB raw / 5.50 kB gzip.
- Claim suite: `npm run test:claims -- --grep @claim:` — 9/9 passed.
- Browser integration: `npm run test:e2e` — 13/13 passed. This includes desktop
  normal import, 390px landing/demo overflow checks, keyboard focus, dark and
  mobile Axe checks, reduced motion, same-origin privacy interception, query
  demo offline reload, and service-worker update/offline regression.
- Accessibility smoke check: `/opt/fleet/lib/verify-url.sh` against local
  production preview — 200, no console errors, title/lang/one h1/main present,
  0 images missing alt, and 0 unlabeled buttons. Playwright Axe found no
  serious or critical findings on light, dark, and 390px screens.
- `npm audit --audit-level=high` — 0 vulnerabilities.
- Lighthouse 12.8.2 with Chromium 145 against `vite preview` — Performance
  100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.7 s, CLS 0.

## Known notes

- `vite preview` does not emulate Azure Static Web Apps response overrides;
  `public/staticwebapp.config.json` is copied to `dist/` and is unit-tested for
  the production CSP, cache, manifest, and 404 policy.
- No identity provider is used, so a live identity-provider check is not
  applicable. License verification remains the existing Sociobot flow.
