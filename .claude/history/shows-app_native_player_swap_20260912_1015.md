# shows-app — mkv playback fix + player swap (2026-09-12)

## Symptom
`/watch/Ben 10 Omniverse (2012)/Season 01/...S01E01.mkv` never played.
Raw stream URL in a plain tab played fine.

## Three real causes, in order found
1. **502 / truncated body** — `video-server.js` no-Range branch sent
   `Content-Length: fileSize` but piped only CHUNK (5 MiB) then
   `res.destroy()`. Short body behind Cloudflare = 502.
   Fix: stream the whole file.
2. **Wrong provider** — watch page handed vidstack a bare `.mkv` URL.
   Extension not in its video list, so it fell through to hls.js, which
   `fetch()`ed the full 179 MB as a manifest (twice, `sec-fetch-dest: empty`)
   and died. Proven by temp `[req]`/`[end]` logging.
3. **Player** — vidstack layout letterboxed the frame; Gaurav asked for the
   browser default player.

## Changes
- `video-server.js` — no-Range branch pipes the full file. Temp diagnostic
  logging added (`sec-fetch-dest`, bytes sent, aborted flag) — still in place.
- `app/watch/[showName]/[...path]/page.js` — vidstack `MediaPlayer` /
  `DefaultVideoLayout` replaced with native `<video controls>`. HLS sources
  attach via `hls.js` (lazy `import()`, same buffer tuning as before, now in
  `HLS_CONFIG`). Next-episode button moved from the control bar to the nav.
- `app/globals.css` — `.vds-player` rules replaced with a native-video cap of
  `calc(100vh - 56px)` and `.next-ep-button` styling.
- `hls.js@1.7.3` added to dependencies.

## Not done / open
- `@vidstack/react` is now unused but left in `package.json` — removal needs
  Gaurav's go.
- HE-AAC transcode gate was proposed and **not** applied; it was a wrong first
  diagnosis. Audio decodes fine natively.
- Temp `[end]` logging in `video-server.js` to be stripped on confirmation.

## Backups
- `video-server.js.bak-20260912`
- `app/watch/[showName]/[...path]/page.js.bak-20260912`
- `app/globals.css.bak-20260912`

## Verification
- `public no-range → 200, 179525602 bytes` (was 502, 0.3 kB)
- `npm run build` clean; watch route JS 117 kB → 2.85 kB
- `shows-app` / `shows-video` active, page 200
