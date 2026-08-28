# Subtitle Ladder

Subtitle Ladder is an installable, offline-first practice tool for independent
spoken-language learners. Bring a short recording you own or may use plus SRT or
WebVTT captions. The app makes 15–60 second loops and guides you through the same
sound with progressively less support:

1. translation;
2. target-language text;
3. masked words;
4. no text.

At every rung you can record a spoken echo or retell. Audio, captions, progress,
and recordings remain in browser storage. There is no speech score, automatic
translation, content catalogue, or commercial-media downloader.

Live product: <https://speaking-subtitle-ladder.sociobot.in>

## Who it is for

It is for learners who already have a legal source recording and want a small,
repeatable listening-and-speaking routine instead of another course or subtitle
browser. Unicode captions and explicit left-to-right/right-to-left controls are
supported.

## Run locally

Requires Node.js 20 or later.

```sh
npm install
npm run dev
```

Vite prints the local development URL. Microphone recording requires localhost or
HTTPS and browser permission.

## Test and build

```sh
npm test
npm run build
npm run test:e2e
```

The exact deployment build command is `npm run build`. Static output lands in
`dist/`, with `dist/index.html`, `dist/privacy/index.html`, and
`dist/terms/index.html`. Playwright 1.58.2 is pinned; its Chromium browser is used
for the end-to-end, microphone, axe accessibility, 390px mobile, and explicit
offline tests.

## Data and backups

Projects and recordings are stored in IndexedDB. Settings and the optional
Sociobot license token are stored in local storage. “Export backup” creates a JSON
file containing all project metadata and local media blobs; “Import backup”
restores it. Backups can be large because they include the learner’s audio.

The free edition includes the complete method, two saved clips, ten recordings,
offline use, and export/import. A $12 one-time license removes the count limits.
Checkout and verification use the Sociobot billing API; no payment provider is
embedded and no product ID is hardcoded. Override the billing origin for staging:

```sh
VITE_BILLING_BASE=https://pilot-api.sociobot.in npm run build
```

## PWA behavior

The hand-written service worker precaches the versioned app shell and generated
art, discovers Vite’s hashed JS/CSS assets, serves same-origin assets cache-first,
and uses network-first navigation with an offline fallback. Updates are offered in
an in-app toast rather than forcing an in-progress practice to reload.

## Privacy and content rights

There is no analytics, advertising, runtime CDN, third-party font, or media
upload. Learners must use only audio and captions they created, own, licensed, or
are otherwise permitted to use. See `/privacy/` and `/terms/` in the built app.

## Project notes

- Visual system and generated-image provenance: `.factory/design.md`
- Build verification and known gaps: `.factory/handoff.md`
- License: MIT
