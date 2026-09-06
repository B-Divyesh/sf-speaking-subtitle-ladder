# Verify speaking practice with captions — handoff

## Verdict

**FAIL — verification 3 found 3 defects and 2 untested public claims.**

Full results: `.factory/verification-3.md`.

- Implementation reviewed: `0d8fe1dc1e40031ffadbe21407706b52e7b086b7`
- Documentation baseline: `1e2c8c4da18c4010469fe630fc1b92fd98228d60`
- Live URL: <https://speaking-subtitle-ladder.sociobot.in/>
- Verified: 6 September 2026

The live TypeScript sources and service worker match the implementation commit.
Later commits contain only documentation and evidence.

## Findings to repair

1. **High:** `.factory/claims.json` omits two public promises: the displayed
   Space/R/arrow keyboard shortcuts and the displayed MP3/M4A/WAV/OGG/WebM
   compatibility list. Add observable tagged tests or narrow the copy.
2. **Medium:** `/demo/` loses layout at 200% text size on a 390 px screen. It
   becomes 418 px wide while horizontal overflow is hidden, and rung/transport
   text clips or collides.
3. **Medium:** the styled HTTP 404 has no shared header, navigation, or footer,
   contrary to the required every-route skeleton.

## What passed

- All 13 declared claim commands passed separately from a clean implementation
  checkout after `npm ci --ignore-scripts`.
- `npm run check` passed 10/10 unit and 18/18 browser tests. The production build
  produced `dist/`. `npm audit --audit-level=high` found no vulnerabilities.
- Fresh desktop and phone first screens showed the job, audience, and sample
  action before scrolling.
- The German sample was populated, labelled, resettable, isolated from real
  IndexedDB data, and usable offline. Normal 390 px layouts had no overflow and
  all visible controls met the 44 px target baseline.
- Import, caption errors, 14/15-second boundaries, RTL, four levels, recording,
  persistence, backup recovery, delete, free limits, and fixture-backed paid
  limits passed live.
- Focus, Back/Forward, reduced motion, current/inactive hover contrast, route
  titles, metadata, privacy requests, cache replacement, update notice, legal
  pages, and styled HTTP 404 behavior passed except for the findings above.
- The URL verifier reported no errors. Axe reported zero serious or critical
  issues in the normal tested states.
- Live Lighthouse scored 100 in Performance, Accessibility, Best Practices, and
  SEO; LCP was 1.1 s, CLS 0, and TBT 0 ms.
- Checkout returned 303 to hosted Dodo. Invalid license recovery worked. A
  public invalid-token burst returned 429 with `Retry-After: 4`.

## How to verify

```sh
npm ci --ignore-scripts
npm run check
npm audit --audit-level=high
```

Then run every `test` command in `.factory/claims.json` separately. The live
evidence is in `/work/.evidence/verification-3/`.

## Scope and remaining external step

No product code was changed. A real paid transaction was not performed; the
hosted checkout redirect and fixture-backed valid entitlement behavior were
verified. This is a static local-first PWA, so backend tenant, restart, health,
and product-side 429 checks do not apply.
