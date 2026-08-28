# Independent verification 2 — FAIL

**Candidate:** `6c39c170bda106406a51b24de9384b15df436a92`

**Live URL:** <https://speaking-subtitle-ladder.sociobot.in/>

**Verified:** 2026-08-28

**Decision:** **FAIL — do not release.**

The live deployment matches the candidate. This is not a deployment-only
failure. The one-click demo and the core lesson flow work, but required claim
commands fail from a clean clone, an exported backup cannot be restored, the
demo has a serious contrast defect, and several visitor-facing promises are not
covered by the claim contract.

## Release-blocking findings

### Blocker — every listed claim command fails from the clean clone

The repository was clean and exactly at the candidate commit before install.
`.factory/claims.json` exists, but its nine exact commands all failed when run
before any build, as the work order requires. `playwright.config.ts` starts
`npm run preview`, while the clean clone has no `dist/`. Vite preview therefore
serves no app and the assertions cannot find the page.

| Claim | Clean-clone result | First failed assertion |
| --- | --- | --- |
| `sample-demo` | FAIL | `getByLabel('Demo mode')` not found |
| `isolated-demo` | FAIL | root H1 not found |
| `four-rungs` | FAIL | `getByLabel('Demo mode')` not found |
| `timed-loops` | FAIL | `getByLabel('Demo mode')` not found |
| `privacy-local` | FAIL | `getByLabel('Demo mode')` not found |
| `offline-reload` | FAIL | `getByLabel('Demo mode')` not found |
| `local-recording` | FAIL | `getByLabel('Demo mode')` not found |
| `export-backup` | FAIL | `getByLabel('Demo mode')` not found |
| `one-time-unlimited` | FAIL | `getByLabel('Demo mode')` not found |

After `npm run build`, the full 13-test Playwright suite passed, including all
nine tagged claim tests. That confirms an undeclared build prerequisite; it
does not change the required clean-clone result. Any failing claim command is a
release blocker under the supplied acceptance contract.

### High — an exported backup cannot be imported

On the live site, the demo exported
`subtitle-ladder-backup-2026-08-28.json` (427,873 bytes). After choosing Start
for real and importing that exact file:

- the UI said `That file is not a valid Subtitle Ladder backup.`;
- the real `subtitle-ladder` IndexedDB still contained zero projects; and
- Chromium logged a CSP error blocking `fetch(data:audio/wav;base64,...)`.

The cause is concrete: `src/main.ts` restores blobs with `fetch(dataUrl)`, but
the deployed CSP's `connect-src` permits only self, the Sociobot API, and pilot
API—not `data:`. Export alone is tested; export/import round-trip is not. This
breaks the required user-owned backup and recovery path.

### High — the live demo has a serious color-contrast violation

Playwright Axe 4.10 reports `color-contrast` with serious impact when the
current Translation rung is hovered:

- light: coral `#c93f2b` on citron `#dceb54`, **3.79:1**;
- dark: coral `#ff765f` on citron `#dceb54`, **2.00:1**;
- required for the 16 px bold text: **4.5:1**.

The affected selector is
`button[data-stage="0"] > span:nth-child(2) > strong`. The repository's Axe
checks miss this because they scan the landing page after leaving demo mode,
not the active/hovered demo ladder.

### High — the claims inventory and tests do not cover all promises

The supplied claims contract says every visitor-facing promise must be listed
and observably proved. The following are missing or under-tested:

- `Import a backup` has no claim or round-trip test, and the feature fails live.
- Setup says `Audio is never uploaded.` The `privacy-local` test only exercises
  bundled demo audio; it does not import user audio or exclude same-origin
  upload requests.
- Privacy says a license is sent for verification `at most once per day`. No
  claim entry contains or tests that quantitative promise. Independent live
  testing did observe one request followed by no request on reload.
- The upgrade screen promises `Every future local feature in this edition`, an
  untestable future claim.
- `one-time-unlimited` only checks price text and checkout URL. It does not
  verify a license, removal of the two-clip/ten-recording limits, or entitlement.
  `Unlimited storage` is also broader than the implementation, which removes
  app count limits but still depends on finite browser quota.

These are independently release-blocking under the claims skill even if the
clean-clone runner is repaired.

## Other defects

### Medium — keyboard focus and browser history do not follow view changes

- Tab first reaches Skip to practice with a visible 3 px outline, but Enter
  leaves `document.activeElement` on `<body>` instead of moving focus to main.
- Keyboard activation of Use my audio renders the setup H1, then leaves focus
  on `<body>` rather than the new H1.
- Setup keeps the root URL and does not push history. From a fresh root visit,
  browser Back from setup goes to `about:blank`, not the app home view.

This violates the attached keyboard and site-structure requirements for skip
links, view focus, announcements, and back/forward behavior.

### Medium — several mobile touch targets are below 44 px

At 390 px, measured visible targets included:

- wordmark link: 129×38 px;
- footer Privacy: 50×21 px;
- footer Terms: 41×21 px;
- demo Reset demo: 100×40 px;
- upgrade inline terms/privacy links: 15 px high.

The page has no horizontal overflow, but these targets miss the 44×44 px
baseline.

### Medium — required social/install metadata is absent

The shipped route heads have title, description, canonical, SVG favicon, lang,
and theme color. They do not include Open Graph metadata, Twitter card
metadata, a 1200×630 social image, or an Apple touch icon link required by the
site-structure contract.

## First-read test

**PASS.** Cold at the live root, without prior storage:

- What it does: `Practise speaking with your own captions.`
- For whom: independent language learners who want short listening and
  speaking practice with less text.
- What to click first: `Try it with sample data`, with the adjacent explanation
  `Open a ready German listening loop.`

The action opens `/demo/` in one click. The first demo screen already contains
the German lesson and persistent demo banner.

## Candidate and deployment identity

The live artifact is the candidate's product code:

- live CSS is `main-Dq79wEnW.css`, exactly the clean build's CSS hash;
- live JS and clean-build JS are byte-identical after normalizing only the
  timestamp `BUILD_ID` and its resulting source-map filename;
- the live source map's `sourcesContent` exactly matches all five candidate
  source files (`captions.ts`, `db.ts`, `license.ts`, `demo.ts`, `main.ts`);
- live and candidate `sw.js` SHA-256 are both
  `bd0fa096eb1b0f92029eccd67546d87317d83bc7edcabc4c38c060ebb7f2d42d`.

The footer reports deployment build `build-1787912711102`. The differing local
asset hash is solely the default timestamp build ID.

## Clean checkout and repository gates

| Check | Result |
| --- | --- |
| Initial git state | clean, `main`, exact candidate |
| `npm ci` | PASS; 60 packages added, 61 audited, 0 vulnerabilities |
| Nine exact `.factory/claims.json` commands before build | **FAIL; 0/9** |
| `npm test` | PASS; 8/8 Vitest tests |
| `npm run build` | PASS; TypeScript and Vite production build |
| `npm run test:e2e` after build | PASS; 13/13 |
| `npm run check` | PASS after `dist/` exists; 8 unit + build + 13 browser |
| `npm audit --audit-level=high` | PASS; 0 vulnerabilities |
| Lint | no lint script exists |

Production output is within budget: JS 38.32 kB raw / 13.84 kB gzip; CSS
20.98 kB raw / 5.50 kB gzip; mobile hero WebP 28.61 kB; desktop hero WebP
75.64 kB. `dist/` is produced.

## Independent live product exercise

Passed behaviors:

- Demo opened a ready 20-second German loop, showed its translation, progressed
  through Translation, Target text, Masked words, and No text, and Reset demo
  restored it.
- Fake microphone permission produced `Take 1` and stored it locally.
- Demo export downloaded a correctly named JSON file. Restore failed as noted
  above.
- A 20-second WAV plus German and English SRT files created a practice clip.
  Translation and target stages rendered, and a 14-second boundary edit gave
  `Use a loop between 15 and 60 seconds within the audio.`
- Malformed captions gave `No timed captions were found. Use a UTF-8 SRT or
  WebVTT file.` and recovered after a valid file was chosen.
- A 14-second WAV was rejected with `Choose audio that is at least 15 seconds
  long.` An exact 15-second WAV then succeeded.
- Arabic Unicode captions rendered at the Target text rung with `dir="rtl"`.
- A real project persisted in `subtitle-ladder` across reload and reopened.
- Root and demo at 390 px both measured 390 px scroll width / 390 px client
  width. Desktop, mobile, dark theme, and reduced motion rendered coherently.
- No console/page errors occurred in cold load, normal import/practice, demo
  rung progression, recording, or offline flows. The backup restore path is the
  exception and emitted the CSP errors described above.

## Privacy, network, headers, and billing

- The full sample flow made 16 requests, all to
  `https://speaking-subtitle-ladder.sociobot.in`. The normal user-audio import
  flow was also same-origin only. No analytics, CDN font, Azure/OpenAI, or
  third-party runtime request was observed.
- An invalid `?license=` was stripped from the URL, stored locally, and sent
  once to `api.sociobot.in`; the invalid verdict was cached and reload made no
  second verification request.
- Root responses include CSP, HSTS, Permissions-Policy, Referrer-Policy, and
  `X-Content-Type-Options`. Hashed JS/CSS use one-year immutable caching;
  `sw.js` uses `no-cache`; the manifest has
  `application/manifest+json`; unknown routes return a styled HTTP 404.
- Checkout responds 303 to the hosted Dodo checkout through the Sociobot API.
- Fresh rate-limit test: 80 verification requests in five concurrent batches
  produced 30 HTTP 200 and 50 HTTP 429 responses. Every sampled 429 carried
  `Retry-After: 4`. The observed rapid-window allowance was 30 successful
  requests; concurrency caused the first completed 429 to appear at submitted
  request 21.
- There is no sign-in, so Entra tenant verification is not applicable.

## PWA and offline behavior

- Manifest contains standalone display, versioned start URL, theme/background
  colors, and 192/512 icons with maskable purpose.
- After first demo visit the active controller was
  `/sw.js?v=build-1787912711102`, with cache
  `subtitle-ladder-shell-build-1787912711102`.
- Offline reload retained the ready German lesson and displayed the offline
  status.
- A forced live worker update to
  `/sw.js?v=independent-qa-final` activated, removed the old cache, left only
  `subtitle-ladder-shell-independent-qa-final`, and the demo still reloaded
  offline.

## Accessibility and performance evidence

- `/opt/fleet/lib/verify-url.sh`: HTTP 200, title/lang/one H1/main present,
  no missing alt, no unlabeled buttons, no load errors.
- Axe: zero serious/critical on the settled root in light and dark and on setup,
  upgrade, and privacy. The active demo hover defect above is serious.
- Reduced motion computed `scroll-behavior: auto` and `0.01 ms` transition
  duration.
- Lighthouse 12.8.2 mobile: Performance 97, Accessibility 100, Best Practices
  100, SEO 100; FCP 1.0 s, LCP 1.2 s, CLS 0, TBT 210 ms. Lab INP was not
  measured.

## Evidence artifacts

- `.factory/evidence/live-cold-desktop.png`
- `.factory/evidence/live-demo-offline.png`
- `.factory/evidence/live-normal-practice.png`
- `.factory/evidence/live-mobile-390-dark.png`
- `.factory/evidence/lighthouse-live.json`
- `.factory/evidence/verify-url-live/verify.json`

## Required repair before re-verification

1. Make every exact claim command build or serve its own candidate artifact in
   a clean clone, then rerun all nine separately.
2. Add a real export/import round-trip claim test and repair restoration without
   weakening CSP unnecessarily.
3. Fix current/hover rung contrast in both themes and run Axe on demo practice
   states, including hover/focus.
4. Inventory and either test or remove every unlisted/overbroad promise.
5. Repair skip-link/view focus, internal history, mobile target sizes, and the
   required social/install metadata.
