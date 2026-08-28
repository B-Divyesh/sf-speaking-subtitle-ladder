# Subtitle Ladder

Practise speaking with your own captions. Subtitle Ladder is for independent
language learners who want to repeat one short audio clip with less text each
time.

Try the ready German lesson at [the demo](/demo/). It opens with sample data in
the isolated `demo:subtitle-ladder` browser database. Reset demo clears that
sample database. Start for real clears it before returning to your separate library.

The lesson has four rungs: translation, target text, masked words, and no text.
You can make a microphone take and export a JSON backup. Audio and recordings
are stored in this browser. The sample lesson works offline after its first
visit. The $12 one-time unlimited option uses Sociobot checkout.

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
npm run build
npm run test:e2e
```

Run every visitor-claim check with:

```sh
npm run test:claims -- --grep @claim:<id>
```

The static deployment command is `npm run build`. It writes `dist/`, with
`dist/index.html` at its root. The product is a PWA and uses IndexedDB for
projects and recordings. `/privacy/` and `/terms/` explain the local storage,
license, and content-rights rules.

License: [MIT](LICENSE).
