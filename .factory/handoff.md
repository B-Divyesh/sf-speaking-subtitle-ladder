# Subtitle Ladder verification handoff

## Release decision

**FAIL — do not release candidate
`6c39c170bda106406a51b24de9384b15df436a92`.**

Verified 2026-08-28 against
<https://speaking-subtitle-ladder.sociobot.in/>. The live deployment matches
the candidate; this is not a deployment-only failure. Full evidence is in
`.factory/verification-2.md`.

## Release blockers

1. All nine exact commands in `.factory/claims.json` fail from the clean clone
   because `vite preview` is started before `dist/` exists. After a manual
   production build, all 13 Playwright tests pass, but the required clean-clone
   claim result remains 0/9.
2. A live exported backup cannot be imported. Restore uses `fetch(data:)`, which
   the deployed `connect-src` CSP blocks. The app reports the valid export as
   invalid and restores zero projects.
3. Axe reports serious contrast failures on the hovered current demo rung:
   3.79:1 in light and 2.00:1 in dark, below 4.5:1.
4. Visitor-facing promises are missing from or under-tested by the claims
   inventory, including backup import, real imported-audio privacy, once-daily
   license verification, future-feature wording, and actual paid entitlement.

Additional medium findings: skip/view focus remains on `<body>`, browser Back
from setup leaves the app, several mobile links are under 44 px high, and Open
Graph/Twitter/Apple-touch metadata is absent.

## What passed

- Cold first-read and one-click demo gate.
- `npm ci`; `npm test` (8/8); `npm run build`; post-build
  `npm run test:e2e` (13/13); `npm run check`; and npm audit.
- Normal WAV/SRT import, four rungs, 14/15-second boundaries, malformed-caption
  recovery, Arabic RTL captions, microphone take, and real-project persistence.
- Same-origin-only demo and normal practice request logs; explicit Sociobot
  license verification is cached for the next reload.
- 390 px overflow, reduced motion, offline reload, and service-worker cache
  replacement.
- Live headers, immutable hashed assets, manifest MIME, and styled HTTP 404.
- Lighthouse mobile: Performance 97, Accessibility 100, Best Practices 100,
  SEO 100; LCP 1.2 s and CLS 0.
- Billing verification rate limit: 80-request burst produced 30 HTTP 200 and 50
  HTTP 429 responses; sampled 429 responses had `Retry-After: 4`.

## Build and verification commands

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm run check
npm audit --audit-level=high
```

The production build emits `dist/`. JS is 38.32 kB raw / 13.84 kB gzip; CSS
is 20.98 kB raw / 5.50 kB gzip. No lint script exists; TypeScript checking is
part of `npm run build`.

## Handoff artifacts

- `.factory/verification-2.md` — complete independent report
- `.factory/evidence/` — live screenshots, Lighthouse JSON, and URL verifier
  output

No product code was changed during verification.
