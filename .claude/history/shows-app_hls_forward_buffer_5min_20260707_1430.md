# shows-app: HLS forward buffer raised from ~30s to ~5 min

**Date:** 2026-07-07 14:30
**Request:** Player only loads ~10s then waits for the next batch; should keep receiving chunks continuously, 2–5 min ahead.

## Root cause
The vidstack player had no hls.js buffer config, so hls.js defaults applied: `maxBufferLength: 30` (seconds ahead) and `maxBufferSize: 60MB` byte cap. hls.js stops fetching once either is hit and only resumes when playback drains the buffer — the observed "load a bit, then wait" pattern. Segment size (SEG=6s in video-server.js) was not the issue and is unchanged.

## Change
`app/watch/[showName]/[...path]/page.js` — added `onProviderChange` handler (with `isHLSProvider` from `@vidstack/react`) that sets hls.js config:
- `maxBufferLength: 300` — target ~5 min buffered ahead
- `maxMaxBufferLength: 600`
- `maxBufferSize: 200MB` — default 60MB byte cap would otherwise kick in first at ~5 min of 720p
- `backBufferLength: 90` — evict media >90s behind playhead (Android Chrome memory; rewind re-fetches, segments are browser/server cached)

## Server impact
None needed. hls.js fetches fragments sequentially (one ffmpeg at a time per viewer); Pi transcodes 720p ultrafast faster than real-time, so the buffer steadily fills and the pipeline stays continuously busy instead of idling.

## Scope note
Applies to HEVC/x265 files (the HLS path). Non-HEVC files are served directly with byte-range; their buffering is browser-controlled and unchanged.

## Deploy
`npm run build` + `sudo systemctl restart shows-app` — active, / returns 200.

## Revert
Remove the `onProviderChange` prop and handler, rebuild, restart.
