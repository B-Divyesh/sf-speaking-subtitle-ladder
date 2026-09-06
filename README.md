# Subtitle Ladder

Practise speaking with your own captions. Subtitle Ladder is for independent
language learners who want to repeat one short audio clip with less text each
time.

Try the ready German lesson at [the demo](/demo/). It opens with sample data in
the isolated `demo:subtitle-ladder` browser database. Reset demo clears that
sample database. Start for real clears it before returning to your separate library.

Each loop has four support levels: translation, target text, masked words, and no text.
Audio with UTF-8 SRT or WebVTT captions creates 15–60 second loops, including
RTL text. Imported audio and microphone takes stay in browser storage during
practice. The app does not send them to third parties. A JSON backup exports
and restores clips, audio, progress, and takes.

The free version stores up to two clips and ten microphone takes. A valid $12
one-time license removes those app count limits. Device and browser storage
limits still apply. Checkout and license checks use Sociobot. The sample lesson
reloads offline after its first visit, and the app can be installed as a PWA.

Claims and their browser regression tests are listed in
`.factory/claims.json`. Demo details are in `.factory/demo.md`.

## Run

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

## Verify and build

```sh
npm test
npm run test:e2e
npm run build
```

Each browser command builds its own production artifact. Run every
visitor-claim check from a clean checkout with:

```sh
npm run test:claims -- --grep @claim:<id>
```

The static deployment command is `npm run build`. It writes `dist/`, with
`dist/index.html` at its root. The product is a PWA and uses IndexedDB for
projects and recordings. `/privacy/` and `/terms/` explain the local storage,
license, and content-rights rules.

License: [MIT](LICENSE).
