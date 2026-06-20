# Fix: Video Seeking Broken Through Cloudflare Tunnel

**Date:** 2026-06-18 02:10  
**Problem:** Seeking to unloaded video positions would reset the player to position 0.

## Root Cause

The stream API route responded to open-ended range requests (`bytes=X-`) by streaming from byte X all the way to end-of-file. For a 480MB episode at 50% position, that's a 240MB response in a single HTTP exchange.

Cloudflare Tunnel buffers/drops large streaming responses. The browser gets an incomplete 206 response, can't decode the video at the seeked position, and falls back to position 0 (start of file).

**Confirmed working at the network level** (direct curl to localhost:4178 returned correct 206). The failure happened at the Cloudflare layer.

## Fix

`app/api/stream/[...path]/route.js`: Added `CHUNK = 5MB` cap. When the client sends an open-ended range (`bytes=X-`), the server now returns at most 5MB starting from X. The browser automatically requests the next chunk when its buffer runs out.

```js
const CHUNK = 5 * 1024 * 1024;
const end = endStr
  ? Math.min(parseInt(endStr, 10), fileSize - 1)
  : Math.min(start + CHUNK - 1, fileSize - 1);
```

Explicit end ranges (e.g., `bytes=0-1048576`) are respected as-is (clamped to fileSize only).

## Verification

After fix:
- Open-ended range `bytes=50000000-` → `Content-Range: bytes 50000000-55242879/481167327`, `Content-Length: 5242880` ✓
- Seeking to any position in the video works end-to-end
