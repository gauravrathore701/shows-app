# Video Player Seek Fix — 2026-06-18 07:32

## Problem
Seeking to a keyframe beyond 3-4 minutes in the video player caused the video to reset to the start.

## Root Cause
`app/api/stream/[...path]/route.js` capped all open-ended range requests at 10MB:
```js
const end = endStr ? parseInt(endStr, 10) : Math.min(start + 10 * 1024 * 1024 - 1, fileSize - 1);
```
When the browser sends `Range: bytes=X-` (no end specified) for a seek, the server returned only 10MB. After buffering those 10MB the browser stalled and reset.

Note: moov atom was already at the front of the file (offset 40), so faststart was not the issue.

## Fix
Removed the 10MB cap — open-ended range requests now serve from the requested byte to EOF:
```js
const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
```
The browser manages its own buffering and aborts the connection when it has enough data.

## Files Changed
- `app/api/stream/[...path]/route.js` — line 33

## Deployed
- `npm run build` → success
- `sudo systemctl restart shows-app`
