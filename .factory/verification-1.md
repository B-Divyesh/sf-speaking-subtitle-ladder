# Independent verification — FAIL

**Candidate:** `c08eda998db905e52377e3db7f9d0eb53d947781`  
**Live URL:** https://speaking-subtitle-ladder.sociobot.in  
**Verified:** 2026-08-28  
**Decision:** **FAIL — do not release.**

The deployed root HTML references `main-DUty7TRA.js` and `main-i8VX_XCf.css`,
the same hashes emitted by this candidate's clean production build. This is not
a deployment-only mismatch. The live deployment is the candidate, but it does
not meet the factory acceptance contract.

## Release blockers

1. **Required claim contract is missing.** `.factory/claims.json` does not
   exist at the candidate. Therefore there are no claim-test commands to run
   from the demo entry point, which is explicitly a release-blocking result.
   The landing page and README nevertheless make observable claims including
   “No upload”, “Yours stays yours”, local recordings, offline use, two free
   clips/ten recordings, and the $12 unlock. No corresponding sandbox tests
   exist.
2. **There is no one-click isolated sample demo.** Cold live-page evidence:
   there is no button named “Try it with sample data”; `?demo=1` shows the
   ordinary empty production app, with no sample clip, demo banner, reset, or
   separate storage namespace. `/demo` is only the SPA fallback and also shows
   the empty production app. This fails both the first-screen and demo-sandbox
   requirements.
3. **The first screen does not pass the required first-read test.** Its H1 is
   “Hear it. Then climb beyond the subtitles.” It is a metaphor, not a plain
   statement of the job or audience, and its primary action is “Build a
   practice clip”, not a no-setup sample trial. The supporting paragraph
   explains the method but does not repair the absent sample action.
4. **390px mobile layout overflows horizontally.** On a clean live browser at
   390x844, `document.documentElement.scrollWidth` was **447px** while
   `clientWidth` was **390px**. The hero `picture`/`img` extended from x=41 to
   x=447.3. This contradicts the required mobile-first, no-overflow layout.
5. **Offline behaviour fails at the mandated demo URL.** After first loading
   `/?demo=1`, activating the service worker, and setting the fresh browser
   context offline, reload opened `offline.html` (title “Offline — Subtitle
   Ladder”), rather than the app and practice data. This is because the worker
   precaches `/` but no query-string demo entry. Canonical `/` did reopen the
   app offline; that does not make the missing/required demo path valid.

## Checks that passed

### Clean checkout and repository checks

| Check | Result |
| --- | --- |
| `npm ci` | PASS; 61 packages audited, 0 vulnerabilities |
| `npm test` | PASS; 6/6 Vitest caption/loop tests |
| `npm run build` | PASS; emits `dist/` |
| `npm run test:e2e` | PASS; 3/3 Playwright tests |
| `npm audit --audit-level=high` | PASS; 0 vulnerabilities |
| Type/lint scripts | TypeScript is included in `npm run build`; no separate lint script exists |

Production bundle sizes were 36.10 kB JS raw / 13.00 kB gzip and 20.15 kB CSS
raw / 5.33 kB gzip, within the stated static budgets. An attempted live
Lighthouse run could not complete because Chromium crashed in this container;
it is not counted as a passing measurement.

### Independent live product exercise

- Imported a 20-second WAV with target and translation SRT files, created a
  practice clip, climbed a stage, and checked the 14-second loop-boundary
  error: “Use a loop between 15 and 60 seconds within the audio.”
- Imported an exactly 15-second WAV. A malformed SRT produced the useful error
  “No timed captions were found. Use a UTF-8 SRT or WebVTT file.” Replacing it
  with valid captions recovered successfully and produced a “15 sec loop”.
- The repository's full e2e flow also passed: local microphone take,
  persistence, and canonical-root offline reload.
- Cold live page, normal import/practice flow, and the above recovery flow had
  no page errors or console errors. The normal flow made only same-origin
  requests (this is useful evidence, but not a claims-contract test).
- Axe 4.10 via Playwright found **0 serious/critical** issues on live light
  desktop, dark desktop, and 390px mobile home screens. Keyboard Tab put a
  visible `3px solid` focus outline on the Skip link; Enter on the primary
  button opened setup. Reduced-motion emulation yielded `scroll-behavior:auto`
  and effectively zero-duration control transitions.
- Canonical `/` reloaded offline after first visit and service-worker control.
  The service worker showed an active controller and no browser errors.
- No sign-in is implemented, so an identity-provider check is not applicable.

### Deployment, privacy, and API observations

- Live candidate match: root response body is 809 bytes and references the
  clean-build asset hashes above; live `sw.js` is byte-for-byte the candidate
  source content inspected during verification.
- Root, legal routes, manifest, icons, `robots.txt`, and `sitemap.xml` return
  200. The legal pages have direct titles and one H1 in the shipped suite.
- The Sociobot license endpoint was exercised with invalid non-secret tokens:
  `GET /api/v1/products/speaking-subtitle-ladder/verify?...`. A burst of 120
  requests at concurrency 24 yielded **31 HTTP 200** then **89 HTTP 429**;
  sampled 429 responses carried `Retry-After: 0` or `4`. Thus rate limiting is
  present at an observed threshold of at most 32 rapid requests.

## Additional findings

### High

- **PWA update cache is not versioned.** `public/sw.js` fixes both the shell
  cache and runtime cache names at `subtitle-ladder-v1`. During a future worker
  update, its install fetches are still intercepted cache-first by the active
  old worker; the new worker consequently repopulates the same cache with old
  shell/assets. The cache cleanup also retains that same name. This does not
  meet the required versioned-cache/update behaviour and risks an “Update now”
  toast reloading stale assets.

### Medium

- **Response hardening/caching is incomplete.** Live responses have HSTS,
  `X-Content-Type-Options`, and Referrer-Policy, but no Content-Security-Policy
  or Permissions-Policy. Hashed JS/CSS also use `Cache-Control: public,
  must-revalidate, max-age=30`, not long-lived immutable asset caching. The
  manifest is served as `application/octet-stream`, rather than a webmanifest
  media type.
- **No real 404.** `/does-not-exist` returns 200 and the ordinary landing page
  rather than a styled not-found route with a way back.

## Required repair and re-verification

1. Add `.factory/claims.json` and one observable demo-entry claim test for
   every visitor-facing claim; run every listed command from a clean state.
2. Implement `/demo` or `?demo=1` as a one-click sample practice clip in a
   `demo:`-prefixed isolated storage namespace, with persistent banner, Reset
   demo, Start for real, and documented `.factory/demo.md`. Ensure it reloads
   offline after first visit.
3. Rewrite the landing first screen in plain words: what it does, for whom,
   and a visible “Try it with sample data” action with a short outcome note.
4. Fix the 390px hero width/overflow and add a regression test.
5. Version service-worker caches per build, verify an update actually obtains
   and serves new shell assets, and add the requested security/cache headers
   and real 404 handling.

