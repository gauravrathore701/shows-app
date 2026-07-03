# Multi-Season Show Support

**Date:** 2026-07-02 12:32  
**Trigger:** Adventure Time (2010) added — contains Season 00–10 subfolders, not flat episode files.

## Changes Made

### Detection Logic
A show is "seasonal" if its root folder contains no video files directly, but has subdirectories that do contain video files. Flat shows (all others) work exactly as before.

### Files Modified
- `app/page.js` — episode count now recurses into subdirectories for seasonal shows (totals all eps across all seasons)
- `app/show/[showName]/page.js` — detects seasonal vs flat; renders season cards grid for seasonal shows
- `app/components/EpisodesList.js` — added `watchBase` prop (defaults to `/watch/<showName>` for flat shows); `showName` prop now doubles as the localStorage key for last-watched tracking

### Files Created
- `app/show/[showName]/[season]/page.js` — season detail page, lists episodes, links to seasonal watch route
- `app/watch/[showName]/[season]/[episode]/page.js` — watch page for seasonal content; breadcrumb: Show › Season › Episode; nav buttons: All Episodes, Seasons, Library

### URL Flow
```
/ → /show/Adventure Time (2010) → /show/Adventure Time (2010)/Season 01 → /watch/Adventure Time (2010)/Season 01/episode.mkv
```

### Stream API
No changes needed — existing `/api/stream/[...path]` already handles nested paths.

### Last Watched Tracking
- Flat shows: key = `showName`, value = `episodeName`
- Seasonal shows: key = `showName/season`, value = `episodeName`
