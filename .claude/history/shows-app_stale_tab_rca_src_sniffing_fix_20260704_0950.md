# E02 "unable to play" on Android Chrome — RCA: stale frozen tab with pre-fix JS

**Date:** 2026-07-04 09:50

## RCA
User's screenshot (Android Chrome, 09:45) showed the **broken-media icon at 0:00**
— Chrome's "source rejected" state, which happens *before any network request*.
Video-server logs confirmed: zero requests around 09:45. Meanwhile the same page,
loaded fresh in headless Chromium through the public URL, played E02 fine.

Explanation: the user has 33 open tabs; the watch tab predates the Jul 2 16:20
build. Old bundle set `<source type="video/x-matroska">` for .mkv files —
Chrome's canPlayType rejects that MIME instantly → broken icon, no request.
Android Chrome freezes/restores tabs with their old JS, so every retry in that
tab replayed the July 2 bug. All server-side fixes since were invisible to it.

## Changes
1. **`app/watch/[showName]/[...path]/page.js`** — removed the `<source type=...>`
   element entirely; `src` now set directly on `<video>`. Without a `type`
   attribute the browser always fetches and sniffs the container, so a wrong
   MIME guess can never block playback again. Removed now-unused isHevc/mimeType.
2. **`video-server.js`** — added per-request log line (timestamp, filename,
   Range header, user-agent) and FFmpeg completion log, so future reports can be
   correlated with actual requests (this round the server was blind).
3. Next app rebuilt; `shows-app.service` + `shows-video.service` restarted.

## Verification
CDP-driven real watch page via https://shows.cursedshrine.com: E02 plays to 13s+,
1280×720, no MediaError. Request logging confirmed in journal (also revealed
Chrome issues two parallel stream requests per player — two FFmpeg spawns; known,
acceptable for now).

## User action required
Close the old Adventure Time tab (or hard-refresh it). Frozen tab keeps pre-fix JS.

## Ongoing hardware concern
4th HDD dropout at 09:40 (sda offline → ext4 recovery). Frequency increasing.
