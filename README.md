# Shows App

A personal media streaming library that reads video files from a USB HDD and streams them directly in the browser. Supports movies, TV series, and anime — organised by category using metadata files.

**Live URL:** https://shows.cursedshrine.com

---

## Features

- Streams MKV/MP4/AVI/MOV/WebM from `/mnt/hdd` via HTTP Range API
- Category tabs: All · Series · Hollywood · Bollywood · Anime
- Poster images loaded from TMDB for each title
- Fully seekable video playback (Cloudflare-safe chunked streaming)
- Mobile-friendly responsive layout

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | JavaScript |
| Streaming | HTTP Range requests via Next.js API route |
| Hosting | Raspberry Pi → Cloudflare Tunnel |

## Project Structure

```
shows-app/
├── app/
│   ├── page.js                    # Library home with category tabs
│   ├── show/[showName]/page.js    # Episode list for a show
│   ├── watch/[showName]/[episode] # Video player page
│   ├── api/stream/[...path]/      # Range-aware streaming API
│   ├── globals.css
│   └── layout.js
├── next.config.js                 # Allows media.themoviedb.org images
└── package.json
```

## HDD Folder Structure

Each show/movie lives in its own folder on `/mnt/hdd`:

```
/mnt/hdd/
└── Movie Name (Year)/
    ├── Movie Name (Year).mkv
    └── metadata.txt              # type + heroImage URL
```

**metadata.txt format:**
```
type=movie-hollywood              # or: series, movie-bollywood, anime
heroImage=https://media.themoviedb.org/t/p/w500/POSTER.jpg
```

## Running Locally

```bash
npm install
npm run dev       # dev on :4178
npm run build && npm run start
```

## Deployment

```bash
sudo systemctl status shows-app
sudo systemctl restart shows-app
```

Port `4178` → Cloudflare Tunnel → `shows.cursedshrine.com`.
