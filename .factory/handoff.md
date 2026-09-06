# Subtitle Ladder repair 2 handoff

## Release decision

**PASS — release blockers are repaired.**

Verified 2026-09-06 against
<https://speaking-subtitle-ladder.sociobot.in/>.

- Deployed implementation: `0d8fe1dc1e40031ffadbe21407706b52e7b086b7`
- Deployment ID: `962c28f1-4692-48fd-964a-3edc34f8fb70`
- Documentation/evidence commit: `892fb3156efe46e299741c49c66f147f7aca03a5`
- Previous failed candidate: `6c39c170bda106406a51b24de9384b15df436a92`

The live footer reports build `0d8fe1d`, and the live CSS contains the final
hover-contrast repair. The later handoff/evidence commit is not a new product
artifact and was not redeployed.

## What changed

- Claim commands now build and serve the candidate themselves. All 13 commands
  work from a clean checkout with no `dist/`.
- Backup restore now decodes its own data URLs. It no longer calls
  `fetch(data:)`, so the strict CSP remains unchanged and exported audio and
  recordings restore correctly.
- Current and inactive ladder rungs retain readable text on hover in both
  themes. Axe checks the populated demo states, not just the landing page.
- Claims now cover the demo sandbox, four support levels, 15–60 second loops,
  user-audio privacy, offline reload, local recordings, backup round trips,
  free limits, paid limit removal, daily license checks, deletion, and PWA
  installation.
- Overbroad promises about unlimited browser storage and untestable future
  features were removed. Paid copy now says that browser/device storage limits
  still apply.
- Skip links and app view changes move focus to the correct destination.
  `/new/`, `/practice/`, and `/unlimited/` use browser history and restore with
  Back/Forward.
- Small navigation, footer, demo, and legal targets now meet the 44 px touch
  baseline.
- Every public route now includes Open Graph, Twitter, and Apple touch
  metadata. The product-specific 1200×630 social image and 180×180 icon are
  documented in `.factory/design.md`.
- The offline fallback uses an external cached stylesheet that satisfies CSP.
  Route titles, sitemap entries, service-worker shell entries, and the styled
  404 were updated for the new public URLs.
- First-screen and supporting copy use plain job, audience, and action words.
  The catalog line is verb-first and 91 characters.

## Earlier findings disposition

| Finding | Disposition and evidence |
| --- | --- |
| Missing claims contract | Resolved in the first repair; expanded to 13 outcome claims in this repair. |
| No one-click isolated demo | Resolved. `/demo/` loads the German sample, persistent demo label, Reset demo, and Start for real. Live testing found zero real projects before explicit import. |
| Metaphorical first screen | Resolved. The live H1 names the speaking job, the next sentence names independent learners, and the sample action is above the fold on phone and desktop. |
| 390 px overflow | Resolved. Fresh live mobile context has equal client and scroll width. The later mobile fact/artwork overlap was also repaired before the final deployment. |
| Demo offline reload failed | Resolved. A fresh live context reloads the German lesson offline and shows offline status. |
| Unversioned PWA cache | Resolved by build-versioned shell/runtime caches and covered by update-replacement and offline tests. |
| Missing CSP, permissions, immutable cache, manifest MIME | Resolved. Live response headers and hashed asset caching were checked after deployment. |
| No real 404 | Resolved. An unknown live URL returns HTTP 404 with one H1, main landmark, and links home and to the demo. |
| Nine clean-clone claim commands failed | Resolved. All 13 current commands pass separately from a clean clone of the deployed SHA with no prebuilt output. |
| Exported backups could not restore under CSP | Resolved. Live export/reset/import restored the sample audio and microphone take without a `data:` network request. |
| Demo rung hover contrast | Resolved for current and inactive rungs in light and dark; Axe reports no serious or critical issue in those states. |
| Missing or shallow promise coverage | Resolved with observable tests or narrower copy as listed above. |
| View focus and browser history | Resolved and covered by a keyboard/history browser test. |
| Mobile targets under 44 px | Resolved and measured at 390 px in the browser suite. |
| Missing social/install metadata | Resolved on all HTML entry points with product-specific assets. |

## Verification

Clean checkout at the deployed implementation:

```sh
npm ci --ignore-scripts
npm run test:claims -- --grep @claim:sample-demo
npm run test:claims -- --grep @claim:isolated-demo
npm run test:claims -- --grep @claim:four-rungs
npm run test:claims -- --grep @claim:timed-loops
npm run test:claims -- --grep @claim:privacy-local
npm run test:claims -- --grep @claim:offline-reload
npm run test:claims -- --grep @claim:local-recording
npm run test:claims -- --grep @claim:backup-roundtrip
npm run test:claims -- --grep @claim:free-limits
npm run test:claims -- --grep @claim:one-time-unlimited
npm run test:claims -- --grep @claim:daily-license-check
npm run test:claims -- --grep @claim:delete-local-data
npm run test:claims -- --grep @claim:installable-pwa
```

Result: **13/13 exact claim commands passed separately**. Each command built
its own production output.

Repository gates:

```sh
npm run check
npm audit --audit-level=high
```

Results: 10/10 Vitest tests, 18/18 Playwright tests, production build emitted
`dist/`, and npm reported zero vulnerabilities. The final main bundle is
40.11 kB raw / 14.31 kB gzip; CSS is 21.16 kB raw / 5.57 kB gzip.

Live verification:

- Fresh desktop and 390 px phone contexts identified the job, audience, and
  sample action before scrolling.
- The sample opened in one click, showed realistic populated practice, kept
  its demo label, reset, and left the real IndexedDB empty.
- A live demo backup containing audio and a microphone take restored after
  reset under the production CSP.
- Real WAV/SRT import, 14/15-second boundaries, invalid caption recovery,
  Arabic RTL WebVTT, microphone recording, refresh persistence, offline reload,
  reduced motion, focus/history, route titles, legal pages, and the 404 path
  passed browser checks.
- Practice made no third-party or write requests. Explicit license verification
  is the only allowed external product request.
- `/opt/fleet/lib/verify-url.sh` found HTTP 200, title, `lang`, one H1, main,
  labelled controls, alt text, and no load errors.
- Playwright Axe found no serious or critical issues in settled, hovered, light,
  or dark practice states.
- Live Lighthouse mobile: Performance 100, Accessibility 100, Best Practices
  100, SEO 100; FCP 0.9 s, LCP 1.1 s, CLS 0, TBT 0 ms.

Evidence is under `.factory/evidence/live-repair-2/`; local URL-verifier and
Lighthouse evidence is under `.factory/evidence/local-repair-2/` and
`.factory/evidence/lighthouse-local-repair-2.json`.

## Billing

The public offer remains **$12 USD once**. It removes the two-project and
ten-recording app limits; browser/device storage quotas still apply. The live
Sociobot checkout returns its hosted checkout redirect. Successful entitlement
behavior is tested with a recorded valid verification response; no purchase was
made during repair, so checkout redirection alone is not claimed as payment
proof. Public registration metadata is at
`/work/.evidence/billing-offer.json`.

## Known limits and next steps

- No release-blocking product defect remains from either verification report.
- A real paid transaction was not performed. The Sociobot billing operator
  remains responsible for payment-side registration and payment settlement.
- Lab INP is unavailable for this static load. Keyboard and pointer interaction
  paths are covered by Playwright, and TBT measured 0 ms.
- Machine translation, speech scoring, copyrighted media downloads, content
  catalogs, and cloud sync remain intentionally outside the researched scope.
- This is a static PWA with local IndexedDB, not a backend. Tenant isolation,
  server restart persistence, health endpoints, and product-side 429 handling
  are therefore not applicable.
