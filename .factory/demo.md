# Subtitle Ladder demo sandbox

Open `/demo/` (or `/?demo=1`) for the one-click sample lesson. It starts a
20-second German listening loop, with target and English translation captions,
at the first support rung.

The demo uses the IndexedDB database `demo:subtitle-ladder` and demo-prefixed
local-storage settings. It never reads or writes the real `subtitle-ladder`
database. The persistent banner identifies the mode, offers **Reset demo**, and
links to **Start for real**. Resetting discards the demo database and recreates
the shipped sample. The sample is synthesized in the app bundle, so it remains
available after `/demo/` has loaded once and the service worker controls it.
