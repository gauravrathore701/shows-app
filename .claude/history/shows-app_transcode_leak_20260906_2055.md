# Black player — runaway transcodes starved the Pi — 2026-09-06 20:55

## Symptom
Watch page loaded, title and controls correct, video area
black. Console showed two errors, both red herrings:
    Failed to load resource:
      net::ERR_BLOCKED_BY_CLIENT
      static.cloudflareins...
    Uncaught TypeError: Cannot read properties of
      undefined (reading 'startTime')
      at et.reportAllChanges
Those are Cloudflare Web Analytics' beacon being blocked
by Brave shields, and its web-vitals code then failing.
Nothing to do with shows-app.

## Actual cause
    load average 14.80 on 4 cores
    two ffmpeg at ~178% CPU each, 128s elapsed
      -c:v libx264 -preset ultrafast ... -f mp4 pipe:1

Those are the RAW fallback transcodes, spawned by the two
[req] fetches at 20:47:21. The client later switched to
HLS — [hls] playlist logged at 20:48:56 — but not one
seg*.ts was ever requested, because the two orphans had
taken the whole machine. Segment transcode could not get
CPU, so hls.js sat with a playlist and no media. Black.

## Why the orphans survived
Both transcode paths already had
    res.on('close', () => ff.kill('SIGKILL'))
but the response travels
    browser -> cloudflared -> proxy(4180) -> video-server
A browser abort does not reliably reach the video server:
proxy-server.js only registers its own res 'close' handler
after upstream headers arrive, and cloudflared can hold
the socket. So 'close' never fired.

## Fix — video-server.js, BOTH paths
serveHlsSegment() and serveTranscoded() now also watch
progress, not just socket close:

    const IDLE_KILL_MS = 120_000;
    let lastWrite = Date.now();
    ff.stdout.on('data', () => { lastWrite = Date.now(); });
    const idleTimer = setInterval(() => {
      if (Date.now() - lastWrite > IDLE_KILL_MS) { ... }
    }, 15_000);
    idleTimer.unref?.();
    ff.on('close', () => clearInterval(idleTimer));

If not one byte is consumed for 120s the far end is gone
and the transcode is waste — SIGKILL and destroy the
response. 120s is deliberately generous: a paused player
that has buffered ahead legitimately stops reading, and
must not be killed.

### One mistake made and corrected
The first attempt used req.on('aborted', ...) as a second
signal. Neither serveHlsSegment(filePath, index, res) nor
serveTranscoded(filePath, fileSize, res, rangeHeader)
takes req — that would have thrown ReferenceError on the
first abort. Restored from backup and reapplied without
it. The identical tail in both functions also meant the
first patch silently hit only one of the two; the redo
counted the call sites (2) and patched both.

## Immediate recovery
Killed PIDs 83355 and 83356 by hand — orphaned, no client
attached, self-healing on next request.
    load 14.80 -> 8.88 -> settling

## Verified after restart
    shows-video / proxy / app  active
    codec.json 200
    index.m3u8 200
    seg0.ts    200 in 1.44s  (was 4.4s under load)
    https://shows.cursedshrine.com  200
    0 ffmpeg lingering

## Backup
    backups/video-server.js.bak-20260906
