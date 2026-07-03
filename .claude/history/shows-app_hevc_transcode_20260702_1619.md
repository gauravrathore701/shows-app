# HEVC / x265 Real-Time Transcoding

**Date:** 2026-07-02 16:19  
**Issue:** Adventure Time episodes encoded in H.265/HEVC (x265 tag) — browsers can't decode HEVC, so only audio played.

## Root Cause
Files named `... (1080p BluRay x265 ImE).mkv` use the HEVC video codec. Chrome/Firefox support the MKV container but not H.265 decoding → audio-only playback.

## Fix

### video-server.js
- Added `isHEVC()` detector: checks filename for `x265`, `hevc`, or `h.265` tags
- HEVC files → spawns `ffmpeg` to transcode: `HEVC decode → h264_v4l2m2m (Pi 5 hardware H.264 encoder) → fMP4 stream`
- Returns `Content-Type: video/mp4` with `Accept-Ranges: none` (streaming output)
- Automatic fallback to `libx264 ultrafast` if hardware encoder fails
- Duration cache via `ffprobe` for approximate seek support (byte offset → time ratio → FFmpeg `-ss`)
- Non-HEVC files: unchanged, raw byte-range serving as before

### app/watch/[showName]/[...path]/page.js
- Detects x265/hevc/h.265 in episode filename → sets `type="video/mp4"` on `<source>` tag
- Ensures browser hint matches actual server content type

## Limitations
- Seek is approximate (proportional byte → time estimate), not frame-perfect
- First playback has ~1-2s startup latency while FFmpeg initializes the transcode pipeline

## Services Restarted
- `shows-video.service` (video-server.js)
- `shows-app.service` (Next.js, after rebuild)

## Follow-up fixes (16:30–17:20)

**Attempt 1 failed:** `h264_v4l2m2m` hardware encoder errors on Pi 5 ("Could not find a valid device" — the Pi 5 has no H.264 encode block, unlike Pi 4). Also 1080p 10-bit software encode was only ~0.9x real-time → stalls. Switched to `libx264 ultrafast` + `scale=-2:720` + `yuv420p` (8-bit) = ~1.77x real-time.

**Attempt 2 failed — THE actual bug:** `ff.stdout.once('data', cb)` was used to defer response headers until FFmpeg produced output, but the 'data' listener **consumes** the first chunk (~64KB containing the fMP4 `ftyp`/`moov` initialization header). Browser received a stream starting at a raw `moof` fragment → unparseable → no video AND no audio.

**Fix:** write `firstChunk` to the response inside the `.once('data')` callback before `pipe()`. Verified via proxy chain: stream starts with `ftyp`, ffprobe reports h264 720p + aac.
