# Codec-probe based HLS routing (fixes Dororo / untagged HEVC mkv)

Date: 2026-08-05 21:35

## Symptom

Dororo episodes never loaded in the player. Other shows were fine.

## Root cause

"Does this file need transcoding?" was decided from the **filename** in two
places — `isHEVC()` in `video-server.js` and the same regex in the watch page:

```
/x265|hevc|h\.?265/i
```

Dororo files are named `01 - The tale of Daigo.mkv` — no tag — but are actually:

```
video  hevc, yuv420p10le (Main 10)
audio  opus
```

So the watch page requested the progressive URL and the server streamed the raw
Matroska. No browser decodes HEVC 10-bit + Opus in mkv → blank player. Every
untagged HEVC file in the library had the same problem, not just Dororo.

Second (LAN-only) fault: the HLS paths live on video-server (4179) and only the
proxy (4180) routes to it. Opening the app directly on `192.168.1.2:4178` hit
Next's own `/api/stream` route, which had no `index.m3u8` / `segN.ts` handling.

## Fix

**video-server.js**
- `probeMedia(filePath)` — cached ffprobe (json) for vcodec / pix_fmt / acodec.
- `needsTranscode(filePath)` — true unless video is `h264`, pix_fmt is 8-bit
  (`yuv420p`/`yuvj420p`), and audio is `aac`/`mp3`. Falls back to the old
  filename regex only if ffprobe fails.
- New route `/<file>/codec.json` → `{hls, vcodec, pixFmt, acodec}`, cached 1d.
- Legacy progressive path now gated on `needsTranscode()` instead of `isHEVC()`.

**app/watch/[showName]/[...path]/page.js**
- Fetches `codec.json` and picks HLS vs direct from the answer; filename regex is
  only the fallback if that request fails. Player renders after the answer
  arrives so it never starts loading the wrong source.

**app/api/stream/[...path]/route.js**
- Forwards `index.m3u8`, `segN.ts`, `codec.json` to video-server:4179, so direct
  4178 (LAN) behaves like the 4180 proxy.

## Verified

```
Dororo ep1 codec.json
  {"hls":true,"vcodec":"hevc",
   "pixFmt":"yuv420p10le","acodec":"opus"}
Hellsing .mp4   hls:false (h264/aac) — no
                needless transcode
Boys x265 mkv   hls:true (as before)
seg0.ts         200, 3449048 bytes
                (4179, 4180 and 4178)
watch page      200
```

`next build` run; `shows-video` + `shows-app` restarted.

## Note

Transcode is CPU-bound on the Pi — first segment of an HEVC file takes ~10-15s
before playback starts. That is unchanged behaviour, just now applied to files
that previously failed outright.
