# Shows App — Last Watched Feature

**Date:** 2026-07-01 22:40

## What changed

Added per-show "last watched" tracking via localStorage.

### New file
- `app/components/EpisodesList.js` — client component; reads `lastWatched` from localStorage on mount, highlights the matching episode with a "Last Watched" badge

### Modified files
- `app/show/[showName]/page.js` — replaced inline episode list with `<EpisodesList>` client component
- `app/watch/[showName]/[episode]/page.js` — saves `{ [showName]: episode }` to `lastWatched` in localStorage on mount; also removed leftover `color: #b48cff` inline style
- `app/globals.css` — added `.ep-last-badge` and `.ep-last-watched` styles

## localStorage structure
```json
{
  "One Piece": "One Piece Episode 1165.mkv",
  "GOTS3": "Game of Thrones S03E02.mkv"
}
```
Key: `lastWatched`, stored in browser until manually cleared.

## How it looks
"Last Watched" pill appears on the right side of the episode card for the most recently watched episode of each show.
