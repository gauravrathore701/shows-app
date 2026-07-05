# S01E02 "still unable to play" — browser-level verification (server side confirmed working)

**Date:** 2026-07-04 09:50

## What was tested (deepest verification yet)
User reported E02 still won't play after the HDD-dropout fix. This round tested with
a REAL browser engine, not curl:

1. **No server errors**: shows-video journal clean since 09:25 restart; no new sda
   dropouts in dmesg. The server never saw a failing request.
2. **Headless Chromium + `<video>` harness** (`/tmp/vidtest.html`):
   - via local proxy (4180): plays — 1280×720, playhead advances, buffers ahead.
   - via public URL (Cloudflare tunnel): plays identically.
3. **The REAL watch page via CDP** (`/tmp/cdp_watch_test2.mjs`): registered temp user
   `rex_probe_e02` (Rust auth API), logged in through the public site, planted the JWT
   in localStorage, loaded the actual /watch/... page in headless Chromium. AuthGate
   passed, video element mounted, E02 played to t=10s+, no MediaError.
4. **Deployed bundle verified fresh**: `.next` BUILD Jul 2 16:20 includes the
   HEVC→video/mp4 `<source type>` fix.

## Key measurement
**Startup latency ~10-15s before first frame** (TTFB 0.7s but transcode streams 3MB
in ~8s; browser buffers several seconds of 720p before rendering). A user may read
this long black-screen/spinner as "not playing".

## Conclusion
Every reachable layer plays E02. Remaining variables are client-side, needing user
input: which device/browser (iOS/Safari would genuinely fail — the transcode path
serves 200+chunked with `Accept-Ranges: none`, and Safari requires Range/206;
proper fix for Safari = HLS output), stale cached tab, or giving up during the
~15s spinner.

## Cleanup notes
- Temp user `rex_probe_e02` (password `probe-only-delete-me`) left in Mongo Atlas
  `user_auth.users` — no delete endpoint exists; harmless, remove manually if desired.
- Test artifacts in /tmp only; headless Chromium processes and profiles cleaned up.
