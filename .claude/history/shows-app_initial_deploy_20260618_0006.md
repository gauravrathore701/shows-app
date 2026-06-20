# shows-app — Initial Deploy
**Date:** 2026-06-18 00:06

## What Was Built

A Next.js 15 personal media streaming app that reads from the external HDD (`/mnt/hdd`) and serves video files through the browser.

## Architecture

- **Framework**: Next.js 15 (App Router, no TypeScript, no Tailwind — plain CSS)
- **Port**: 4178
- **HDD mount**: `/mnt/hdd` (Seagate 500GB USB HDD, ext4)
- **URL**: `shows.cursedshrine.com`

## Pages

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Server Component | Shows grid — reads `/mnt/hdd` folders |
| `/show/[showName]` | Server Component | Episodes list — reads files in show folder |
| `/watch/[showName]/[episode]` | Client Component | Video player with HTML5 `<video>` |
| `/api/stream/[...path]` | Route Handler | HTTP Range-aware file streaming |

## File Filtering

- Shows page: reads directories in `/mnt/hdd`, skips `lost+found` and hidden dirs (`.` prefix)
- Episodes page: filters by video extension (mp4, mkv, avi, mov, webm), sorts alphabetically

## Video Streaming

`/api/stream/[...path]` handles HTTP Range requests (needed for seeking):
- With `Range` header → 206 Partial Content response, chunks 10MB at a time
- Without → full file stream with `Content-Length`
- Path traversal guard: rejects any path that doesn't start with `/mnt/hdd/`
- Node.js `ReadableStream` wraps `fs.createReadStream` for the Web API

## Deploy

- Systemd: `/etc/systemd/system/shows-app.service` (runs `next start -p 4178`, user: gaurav)
- Tunnel: added `shows.cursedshrine.com → http://localhost:4178` to `~/.cloudflared/config.yml`
- DNS: CNAME `shows → a9e04ab3-b606-439b-9de2-d80288c574ae.cfargotunnel.com` created via API (proxied)

## Current HDD Content

```
/mnt/hdd/
└── Hellsing Ultimate/
    └── Hellsing Ultimate Episode 1.mp4  (914 MB)
```
