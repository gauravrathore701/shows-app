# Shows App — Cloudflare Tunnel + Mobile Video Seek Fix
**Date:** 2026-06-18 09:39 IST

## Problems

1. **502 Bad Gateway on shows.cursedshrine.com** — cloudflared was using a dead token for tunnel `e84674a7-19e9-42eb-ba64-ab8c251dfa54` (deleted from Cloudflare dashboard).
2. **shows-proxy.service was disabled** — nothing was listening on port 4180, which the tunnel routes to.
3. **Video not working on mobile (Android Chrome)** — video server returned `206` for initial no-Range requests. Mobile browsers require `200` to confirm range support and get total file size.

## Fixes

### 1. Switched cloudflared to config-file tunnel
- Old: `/etc/systemd/system/cloudflared.service` used `--token <dead-token>`
- New: Uses `--config /home/gaurav/.cloudflared/config.yml` with tunnel `a9e04ab3`
- Changed `User=` to `gaurav` so cert path resolves correctly
- Bumped `TimeoutStartSec` from 15s → 60s
- Re-enabled: `systemctl enable cloudflared`

### 2. Started shows-proxy.service
- `shows-proxy.service` was disabled; enabled + started it
- This proxy on port 4180 routes `/api/stream/*` → video-server (4179), rest → Next.js (4178)

### 3. Fixed video-server.js initial response
- File: `/home/gaurav/Projects/shows-app/video-server.js`
- Change: For no-Range initial requests, return `200 OK` with full `Content-Length` (total file size) + `Accept-Ranges: bytes`
- Stream only 5MB of body, then `res.destroy()` to close connection
- Browser detects premature close, gets file size + range support confirmed, uses Range requests for playback/seeking
- Range requests still return `206` with 5MB chunks as before

## Architecture (post-fix)
```
Browser → Cloudflare Tunnel → shows-proxy (4180)
  ├── /api/stream/* → video-server (4179) — 5MB chunked range responses
  └── /* → shows-app Next.js (4178)
```

## Services (all enabled + active)
- `shows-app.service` — Next.js on 4178
- `shows-video.service` — video-server.js on 4179
- `shows-proxy.service` — proxy-server.js on 4180
- `cloudflared.service` — tunnel using ~/.cloudflared/config.yml
