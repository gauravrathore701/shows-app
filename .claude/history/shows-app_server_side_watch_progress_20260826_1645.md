# shows-app — Server-side watch progress

**Date:** 2026-08-26 16:45 IST

## Why
The 2026-07-01 "Last Watched" badge was `localStorage`-only, so logging in
on another device forgot everything. Progress is now per-account and
server-held, and it remembers the position inside the episode, not just
which episode.

## Chain
```
browser -> /api/progress (Next)
        -> :4181/api/progress (mecca)
        -> :4183/progress (Rust auth)
        -> Mongo user_auth.watch_progress
```

## New files
- `app/lib/progress.js` — client helpers: `getToken` (reads the existing
  `shows_auth` JWT), `fetchProgress`, `saveProgress`, plus `readLocal` /
  `writeLocal` which keep the old `lastWatched` key as an offline mirror.
  `saveProgress` uses `keepalive: true` so a save survives tab close.
- `app/api/progress/route.js` — GET + POST proxy to mecca, forwards the
  `Authorization` header. Base URL overridable via `MECCA_API_URL`.

## Modified
- `app/components/EpisodesList.js` — paints the localStorage guess first,
  then overwrites it with the server answer (server is cross-device truth).
  Adds a thin progress bar on part-watched episodes and a ✓ on finished
  ones. Badge now comes from the API's newest-first ordering.
- `app/watch/[showName]/[...path]/page.js` — fetches progress before
  rendering the player, seeks to the saved position on `canplay`, and saves
  every 15s of playback plus on pause, end, `pagehide`, `visibilitychange`,
  and unmount. Resume is skipped under 30s in or past 95% through.
- `app/globals.css` — `.ep-progress`, `.ep-progress-fill`, `.ep-done`.

## Design note
Position and duration are read off the **native `<video>` element**
(`provider.video`, captured in `onProviderChange`) rather than vidstack's
player state or event-detail objects — that keeps the feature decoupled
from vidstack's API shape across upgrades.

## Keys
`show` is the watch key — `"One Piece"` flat, `"GOT/Season 03"` seasonal —
matching what `EpisodesList` already receives as `showName`. `path` is the
episode filename.

## Verified
Production build clean, service restarted, UI 200 through the 4180 proxy.
Save + read-all + read-one exercised end-to-end through the Next route and
through the 4180 proxy; unauthenticated request returns 401.

---

## Fix — 2026-08-26 17:00 IST: player stuck loading

**Symptom:** after the first deploy, the watch page spun forever and
`shows-video` logged zero requests — the browser never asked for the file.

**Cause:** the first version gated rendering of `<MediaPlayer>` on a
`resumeReady` state that only flipped inside the progress request's `.then`.
Anything that stopped that promise from resolving — and any render path that
reached the gate before it did — left the player unmounted, so playback never
started. Blocking playback on an unrelated API was the wrong shape regardless.

**Change:** removed `resumeReady` and the gate. The player renders exactly as
it did before this feature. Resume is now applied by whichever of the two
events lands last — `canplay` or the progress response — via `seekToResume()`
guarded by `resumed` / `canPlayed` refs. A slow or dead progress API now costs
a resume, never playback.

Also added `onProviderSetup={captureVideo}` alongside `onProviderChange`:
`provider.video` is not populated until the provider is set up, so the earlier
single capture could leave the `<video>` ref null.

Rebuilt and restarted; watch page and `codec.json` both 200 through the 4180
proxy.
