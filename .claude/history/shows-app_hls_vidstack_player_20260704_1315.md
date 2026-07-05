# Path B: HLS backend + Vidstack player (real seeking, once and for all)

**Date:** 2026-07-04 13:15

## Goal
Replace native `<video>` + progressive fMP4 transcode (no seeking, cryptic errors,
freezes on HDD blip) with proper HLS streaming + a real player.

## Backend — segment-on-demand HLS (`video-server.js`)
New URL scheme (behind proxy 4180 → video-server 4179):
- `GET /<file>.mkv/index.m3u8` → VOD playlist. Segment list computed from ffprobe
  duration; `SEG=6`s each. `#EXT-X-PLAYLIST-TYPE:VOD` + `#EXT-X-ENDLIST` so the
  player knows full duration up front → real scrub bar.
- `GET /<file>.mkv/segN.ts` → transcodes ONLY `[N*6, N*6+6]` on demand:
  `ffmpeg -ss <start> -i <file> -t 6 -map 0:v:0 -map 0:a:0 -c:v libx264 ultrafast
  -crf 23 -pix_fmt yuv420p -vf scale=-2:720 -force_key_frames expr:gte(t,0)
  -c:a aac -b:a 128k -ac 2 -output_ts_offset <start> -f mpegts pipe:1`
  - `-map 0:a:0` picks first audio only → fixes E02's commentary-track ambiguity,
    skips PGS subs.
  - `-force_key_frames` at t=0 → each segment independently decodable (clean seek).
  - `-output_ts_offset <start>` → segment PTS aligns to timeline position
    (verified: seg50 start_time=299.98 ≈ 300s). Contiguous playback, accurate seek.
  - Segment fully buffered in RAM before responding: mid-transcode failure never
    yields a truncated/cached segment; clean retry-once on HDD dropout (5s delay).
  - Segments `Cache-Control: public, max-age=86400` (self-contained) → re-watch /
    seek-back is instant. Playlist `no-store`.
- Legacy progressive `serveTranscoded` kept as fallback for direct .mkv hits.
- Non-HEVC files unchanged (native byte-range, real seek already worked).

## Frontend — Vidstack (`app/watch/.../page.js`)
- **Player: `@vidstack/react`** with `DefaultVideoLayout`. NOTE: npm `latest`
  dist-tag is stuck on ancient **0.6.15** (peer react ^18, only `.`/`./icons`
  exports, needs maverick.js/vidstack peers). The real current release is
  **1.15.6** — native React 19 support, has `./player/layouts/default` +
  `./player/styles/*`. Pinned `@vidstack/react@1.15.6` (installed with
  `--legacy-peer-deps` only because of an unrelated tree quirk).
- HEVC → `{src: '<file>/index.m3u8', type: 'application/x-mpegurl'}` (Vidstack
  lazy-loads hls.js from CDN for MSE playback on Android Chrome).
- Non-HEVC → direct file URL, native.
- CSS: `.vds-player` capped at 85vh, monochrome `--media-brand` accent.

## Verification (headless Chromium via CDP, through public Cloudflare URL, real login)
- Duration 715s shown immediately; playback starts 1280×720, no error.
- **Seek to 300s → resumed playing at 302.8→305.8s** (cold seek ~15s to transcode
  target segments; cached segments instant). Random-access seeking now works —
  was impossible on the old progressive stream.

## Known / follow-ups
- Cold-seek latency ~15s (segment transcode). Could shrink with smaller SEG or a
  small read-ahead; acceptable for now.
- Temp user `rex_probe_e02` still in Atlas (no delete endpoint).
- HDD dropouts now 25 in ~27h and climbing — HLS survives single blips via
  per-segment retry, but the drive still needs a powered hub / cable / health check.
