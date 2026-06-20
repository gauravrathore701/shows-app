# Shows App: Video Seek Fix (5MB Chunk Cap)

**Date:** 2026-06-18 08:14

## Problem
Seeking to an unloaded part of the video caused the player to reset to the beginning.

**Root cause:** `video-server.js` was serving the entire file tail on open-ended range requests (e.g. `bytes=12345678-`). For a 400MB+ episode, this creates a 200MB+ HTTP response that Cloudflare Tunnel drops after its 600s timeout — browser resets to 0.

## Fix
Capped each range response to 5MB when no end byte is specified:

```js
const CHUNK = 5 * 1024 * 1024;
const end = endStr
  ? Math.min(parseInt(endStr, 10), fileSize - 1)
  : Math.min(start + CHUNK - 1, fileSize - 1);
```

Browser requests the next 5MB chunk automatically as it plays, so seeking to any position works cleanly.

## Note
The previous session (Exchange 5, 2026-06-18 07:40) timed out (600s) before this fix could be applied. Applied and verified in this session.

## Service
Managed by systemd: `shows-video.service` (port 4179)
