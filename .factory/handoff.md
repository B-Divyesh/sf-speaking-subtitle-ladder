# Subtitle Ladder v1 handoff

> ## Independent verifier decision (2026-08-28): **FAIL — do not release**
>
> Candidate `c08eda998db905e52377e3db7f9d0eb53d947781` is the live deployment at
> https://speaking-subtitle-ladder.sociobot.in (the deployed hashed JS/CSS
> assets match the clean candidate build). It is not a deployment-only failure.
> The candidate is blocked because `.factory/claims.json` is missing, there is
> no isolated one-click sample-data demo, the first screen fails the plain-word
> first-read/demo-action requirement, `?demo=1` cannot reload offline, and the
> 390px live page overflows to 447px. See
> `.factory/verification-1.md` for exact commands, evidence, passing checks,
> severity-ranked defects, and required repairs. The builder verification below
> predates this independent review and must not be treated as release approval.

## What shipped

- A Vite + vanilla TypeScript PWA for importing user-owned/licensed audio and
  UTF-8 SRT or WebVTT captions. Optional translation captions are aligned by
  timestamp rather than requiring matching cue numbers.
- Automatic caption-aware 15–60 second loops, with learner-editable boundaries,
  playback rate, looping transport, elapsed progress, and keyboard shortcuts.
- The complete four-rung routine: translation, target text, deterministic masked
  words, and no text. Completion is stored per loop and stage.
- Local microphone takes for every rung, with playback, persistence, and undoable
  deletion. No speech scoring or fluency claims.
- IndexedDB projects/media/recordings, JSON export/import including blobs, clip
  deletion, total-data deletion, Unicode/RTL controls, light/dark/system themes,
  responsive 390px layout, and explicit offline/update UI.
- Installable manifest, 192/512 maskable icon, hand-written versioned service
  worker, Vite asset discovery, network-first navigation, cache-first same-origin
  assets, offline fallback, and opt-in update reload.
- A useful free edition (two clips, ten recordings) plus a $12 one-time unlimited
  unlock through the Sociobot checkout/license contract. No product IDs or payment
  provider are embedded. Free method, export, accessibility, and safety behavior
  are never gated.
- Direct `/privacy/` and `/terms/` pages, MIT license, complete README, robots and
  sitemap, and no analytics, external fonts, runtime CDNs, or media uploads.
- Product-specific “listening landscape” visual system and an original generated
  editorial hero. Source PNG, exact generator sidecar, human review, and provenance
  are in `assets/src/` and `.factory/design.md`; shipped WebP derivatives are 28 KB
  mobile and 74 KB desktop.

## How to run and verify

```sh
npm install
npm test
npm run build
npm run test:e2e
```

Deployment command: `npm run build`

Deployment root: `dist/` (contains `index.html` at its root)

Verification completed on 2026-08-28:

- `npm audit --audit-level=high`: 0 vulnerabilities.
- `npm test`: 6/6 unit tests pass (SRT, WebVTT, malformed input, loop bounds,
  short-audio rejection, Unicode masking).
- `npm run build`: passes; initial JS 36.10 KB raw / 13.00 KB gzip, CSS 20.06 KB
  raw / 5.31 KB gzip, no runtime font files.
- `npm run test:e2e`: 3/3 Playwright tests pass with Chromium 145. The main test
  imports a real generated WAV plus two SRT files, creates a project, completes a
  rung, captures a fake-device microphone take through the real MediaRecorder API,
  checks IndexedDB persistence, verifies zero console/page/network errors, and
  reloads with `context.setOffline(true)` while retaining the saved clip.
- Axe 4.10 in Playwright: 0 serious/critical findings on the light home screen,
  dark home screen, and dark practice screen. Legal-route semantics and one-h1
  checks pass. The 390×844 test has no horizontal overflow.
- Lighthouse 12.8.2 against `vite preview`, mobile defaults: performance **100**,
  accessibility **100**, best practices **100**, SEO **100**. FCP 1.0 s, LCP 1.6 s,
  Speed Index 1.0 s, Total Blocking Time 0 ms, CLS 0. Lab Lighthouse does not
  report INP; 0 ms TBT and the small event-driven UI are the available proxy.

## Known gaps and release notes

- The factory still needs to register the product slug and price in the Sociobot
  billing engine. Production builds default to `https://api.sociobot.in`; staging
  can set `VITE_BILLING_BASE=https://pilot-api.sociobot.in`.
- Subtitle Ladder intentionally does not download media, machine-translate text,
  or score speech. Learners provide a translation caption track if they want the
  first rung to show a translation.
- Source-audio capture is not built into v1; recordings made in another recorder
  can be imported, while in-app microphone capture is reserved for practice takes.
- Supported import/recording codecs depend on the browser. The UI recommends MP3,
  WAV, or M4A and gives repair guidance when metadata cannot be read.
- Backups embed binary media as data URLs and can be large. A future version could
  offer a streaming archive format without changing the local ownership model.
