# Verify speaking practice with captions — verification 3

## Verdict

**FAIL — 3 findings, including 1 release-blocking claims finding, and 2
untested public claims.**

Verified on 6 September 2026 against
<https://speaking-subtitle-ladder.sociobot.in/>.

- Implementation reviewed: `0d8fe1dc1e40031ffadbe21407706b52e7b086b7`
- Documentation baseline: `1e2c8c4da18c4010469fe630fc1b92fd98228d60`
- Live build label: `build-1788671796366`

The commits after `0d8fe1d` change only reports and evidence. The live source
map matches all five TypeScript source files at `0d8fe1d` byte for byte. The
live service worker also matches that commit byte for byte, and the live CSS
asset name matches its clean build. This is the implementation under review.

## First screen before scrolling

- Job: **Practise speaking with your own captions.**
- Audience: **Independent language learners who want to hear one short clip,
  then speak it with less text.**
- First action: **Try it with sample data.** It says that it opens a ready
  German listening loop.

All three appear before scrolling in fresh 1440×900 desktop and 390×844 phone
contexts. On the phone, the action ends at 551 CSS pixels in an 844-pixel
viewport. Both contexts started at scroll position zero.

## Findings

### High — two public promises are missing from the claims contract

The practice page displays `Keyboard — Space play · R record · ← → loops`.
No entry in `.factory/claims.json` covers these shortcuts, and no tagged claim
test exercises them. An extra live check confirmed Space play/pause and R
record/save before a view change, but there is still no repeatable claim command
and the arrow-key behavior is untested as a public claim.

The audio chooser also states `MP3, M4A, WAV, OGG, or WebM`. The `timed-loops`
claim test imports only WAV. It does not prove MP3, M4A, OGG, or WebM in the
documented Chromium environment. The Terms page narrows support by browser, but
the chooser still presents five accepted formats.

These are two untested public claims. The claims contract says every such
promise must be listed and tested, so this finding blocks PASS even though all
13 declared claim commands pass.

Required repair: add one tagged sandbox claim for the displayed keyboard
shortcuts and complete observable coverage for every displayed audio format,
or narrow the public copy to the formats that are tested.

### Medium — the demo loses layout at 200% text size on a phone

At 390×844 with root text enlarged to 200%, `/demo/` measured 418 CSS pixels of
document width against a 390-pixel viewport. The page globally hides horizontal
overflow. The support-level rail exposes clipped letters from later rungs, and
the time, speed, and transport labels run together. The rest of the tested
routes remained 390 pixels wide under the same check.

This fails the attached requirement that text resize to 200% without loss.
Evidence: `/work/.evidence/verification-3/live-demo-text-200.png` and
`/work/.evidence/verification-3/text-resize.log`.

Required repair: let the demo workbench shrink to the viewport at enlarged text
and give the transport and rung controls a readable reflow layout.

### Medium — the 404 page omits the required site skeleton

An unknown live URL correctly returns HTTP 404 and shows a styled page with one
H1, one main landmark, and working links home and to the demo. The page has no
`header`, `nav`, or `footer`, though the site-structure contract requires the
shared header and footer on every route. It also omits the footer privacy,
terms, factory, and build information.

This is not a finding about the deliberate 404 status. It is a missing required
structure on that response. Evidence:
`/work/.evidence/verification-3/live-404-phone.png` and
`/work/.evidence/verification-3/routes-links.log`.

Required repair: keep the HTTP 404 response and styled recovery links, but use
the standard site header and footer.

## Declared claims

The checkout was a fresh detached checkout of `0d8fe1d`. It contained no
`dist/`. After the documented prerequisite `npm ci --ignore-scripts`, every
exact command in `.factory/claims.json` was run separately.

| Claim | Result |
| --- | --- |
| `sample-demo` | PASS |
| `isolated-demo` | PASS |
| `four-rungs` | PASS |
| `timed-loops` | PASS |
| `privacy-local` | PASS |
| `offline-reload` | PASS |
| `local-recording` | PASS |
| `backup-roundtrip` | PASS |
| `free-limits` | PASS |
| `one-time-unlimited` | PASS |
| `daily-license-check` | PASS |
| `delete-local-data` | PASS |
| `installable-pwa` | PASS |

Result: **13/13 declared claim commands passed.** The two missing public claims
in the first finding are not part of those 13 commands.

Evidence: `/work/.evidence/verification-3/claim-commands.log`.

## Product and recovery paths

- The one-click demo opened a realistic 20-second German lesson with target
  text and English meaning. The demo label remained visible after changing a
  level and after reset.
- Reset returned the lesson to Translation. Start for real cleared the demo
  namespace and opened an empty real library. The real database stayed at zero
  projects throughout the demo exercise.
- WAV/SRT import, exact 15-second input, invalid 14-second input, malformed
  captions, recovery with valid captions, 14/15-second loop edits, and Arabic
  RTL WebVTT all passed live.
- A microphone take saved and reopened. Backup export/import restored the
  project, progress, source audio, and take without a `data:` request or console
  error. Free clip/take limits and fixture-backed paid limit removal passed.
- Clearing local data after confirmation removed projects and takes. Invalid
  license restore showed `That license could not be activated (invalid).`
- Browser Back restored the previous view and focused its H1. The skip link
  moved focus to main. Reduced motion produced `scroll-behavior: auto` and a
  near-zero transition duration.
- Fresh demo reload worked offline with the sample and offline status. A forced
  worker revision showed the update toast, activated after `Update now`, and
  kept the sample usable.

The source browser suite ran against the live origin. Seventeen of eighteen
tests passed unchanged. The install test reached its final assertion after
proving the live manifest, icons, standalone mode, and active worker, then
expected its hard-coded local scope `http://127.0.0.1:4173/`. The observed live
scope was correctly `https://speaking-subtitle-ladder.sociobot.in/`. A separate
live-origin assertion passed. This mismatch is test-environment-specific, not
a product defect.

## Accessibility, mobile, privacy, and performance

- The URL verifier found HTTP 200, a useful title, `lang="en"`, one H1, a main
  landmark, alt text, labelled buttons, and no load errors.
- Playwright Axe found zero serious or critical issues on desktop root, phone
  root, phone demo, and light/dark demo states with current and inactive rung
  hover. The 200% text finding remains because Axe does not detect that reflow
  defect.
- Normal 390-pixel root and demo layouts had no horizontal overflow and no
  visible link or button below 44×44 CSS pixels.
- The demo flow made 11 requests, all same-origin GET requests. No analytics,
  third-party script, font, advertising, or media upload request appeared.
- Security headers include CSP, Permissions-Policy, HSTS, Referrer-Policy, and
  `X-Content-Type-Options`. Hashed assets are immutable for one year, the
  manifest has the correct MIME type, and the service worker is not cached.
- Fresh live Lighthouse mobile scores were Performance 100, Accessibility 100,
  Best Practices 100, and SEO 100. FCP was 0.9 s, LCP 1.1 s, CLS 0, and TBT
  0 ms. Initial transfer was 57.2 kB, including 14.6 kB script, 5.8 kB CSS, and
  28.7 kB image data.

## Routes, links, and billing boundary

`/`, `/demo/`, `/new/`, `/unlimited/`, `/privacy/`, `/terms/`, the manifest,
icons, social image, robots file, sitemap, and offline page returned 200. All
same-origin links found on those pages returned 200. Mail links were valid.
Every application route had its route-specific title, one H1, one main
landmark, Open Graph image, Twitter card, and Apple touch icon.

The live checkout endpoint returned 303 to the hosted Dodo checkout. No payment
was made. A 60-request invalid-license burst produced 30 HTTP 200 and 30 HTTP
429 responses; every 429 sample had `Retry-After: 4`. No credential was used or
recorded. A settled real charge remains an external billing-system step, not an
untested product claim: the public product behavior tested here is checkout
redirection and the effect of a valid license.

This is a static PWA. Backend tenant isolation, server restart persistence,
health endpoints, and product-side request throttling are not applicable.

## Repository gates

| Check | Result |
| --- | --- |
| `npm ci --ignore-scripts` | PASS; 60 packages, 0 vulnerabilities |
| 13 exact claim commands | PASS; 13/13 |
| `npm run check` | PASS; 10/10 unit and 18/18 browser tests |
| `npm audit --audit-level=high` | PASS; 0 vulnerabilities |
| `npm run build` | PASS as part of each browser run; `dist/` produced |

The clean output contained 40,110 bytes of main JavaScript and 21,156 bytes of
CSS before gzip. No product code was changed during verification.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Claims file absent | Resolved. Thirteen declared claim entries and tagged tests exist and pass. The new claims-inventory gap is listed above. |
| One-click demo absent | Resolved. One click opens populated sample practice. |
| First screen used metaphor and lacked audience/action clarity | Resolved. Job, audience, and sample action are visible before scrolling. |
| 390 px horizontal overflow and later fact/art overlap | Resolved at normal text size on root and demo. The separate 200% text issue is listed above. |
| Demo offline reload failed | Resolved in a fresh offline context. |
| Service-worker caches were unversioned | Resolved. Version replacement and update toast passed. |
| CSP, Permissions-Policy, immutable caching, and manifest MIME were missing | Resolved in live response headers. |
| Unknown routes returned the app with HTTP 200 | Resolved. Unknown routes now return a styled 404. The new skeleton omission is listed above. |
| Claim commands failed before a manual build | Resolved. All 13 commands build and serve their own output. |
| Backup restore failed under CSP | Resolved by live round-trip evidence. |
| Hovered rung contrast failed | Resolved in light and dark Axe checks. |
| Backup, imported-audio privacy, daily verification, and entitlement claims were shallow or absent | Resolved for those named promises. The new keyboard and format omissions are listed above. |
| View focus and browser history failed | Resolved in live keyboard/history checks. |
| Mobile targets were below 44 px | Resolved on normal 390 px layouts. |
| Social and install metadata were missing | Resolved on all application entry routes. |

## Evidence

Detailed command logs, screenshots, headers, Lighthouse JSON, route crawl, live
source comparison, and browser measurements are in
`/work/.evidence/verification-3/`. The required report copy is
`/work/.evidence/qa-report.md`.
