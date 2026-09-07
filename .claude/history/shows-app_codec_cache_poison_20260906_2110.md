# Black player — a cached WRONG codec answer — 2026-09-06 21:10

## The evidence that cracked it
Gaurav's Network tab showed the browser fetching the RAW
file twice (second one failed) and NEVER requesting
index.m3u8. Server log agreed — only [req] lines, no [hls]
line except the ones my own curl produced.

So the client had decided useHls = false, while curl to the
same URL got {"hls":true}. The difference was the browser
cache.

## Root cause — two bugs compounding
video-server.js

1. probeMedia() cached FAILURES:
       } catch { info = null; }
       probeCache.set(filePath, info);
   One ffprobe failure — exactly what the USB dropouts at
   13:57 and 15:52 caused — poisoned that file for the
   life of the process.

2. needsTranscode() then falls back to the filename:
       if (!info) return isHEVC(filePath);
   "Ben 10 S02E01.mkv" carries no x265/hevc tag, so it
   answered FALSE for a file that is hevc + 10-bit + opus.

3. codec.json shipped that guess with
       Cache-Control: public, max-age=86400
   so the browser kept the wrong answer for 24 hours. Every
   reload since asked for the raw HEVC file, which no
   browser can decode. Black player, and no amount of
   reloading could clear it.

curl never saw it because curl has no cache.

## Fix
video-server.js
  - cache the probe only when it succeeded:
        if (info) probeCache.set(filePath, info);
  - codec.json now sends max-age=86400 ONLY when ffprobe
    answered, and 'no-store' when the value is a filename
    guess. Response also carries "probed": true|false so
    the guess is visible rather than silent.

app/watch/[showName]/[...path]/page.js
  - fetch(codec.json, { cache: 'no-store' }) so any answer
    already poisoned in a browser cache is bypassed.

## Verified
    node --check video-server.js  ok
    npm run build  Compiled in 6.7s
    restart shows-video + shows-app, all 3 active
    codec.json ->
      {"hls":true,"probed":true,"vcodec":"hevc",
       "pixFmt":"yuv420p10le","acodec":"opus"}
      cache-control: public, max-age=86400
    https://shows.cursedshrine.com  200

## Note for Gaurav
The file was always fine. Verified again: 174,310,685
bytes, full read at GB/s, ffprobe clean, ffmpeg decodes.
The failure was a stale ANSWER about the file, not the
file.

Because the old header had a 24h life, a browser that
already cached it may still hold it. The client now sends
no-store, so simply loading the page again picks up the
correct answer — no hard refresh needed.

## Backups
    backups/video-server.js.bak2-20260906
    backups/page.js.bak4-20260906
