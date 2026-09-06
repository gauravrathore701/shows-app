# Next-episode autoplay — 2026-09-05

## Request
Gaurav: Netflix-style "next episode" that appears in the last
10 seconds of any episode-based series.

## Files
- **new** `app/api/episodes/[...path]/route.js`
- `app/watch/[showName]/[...path]/page.js`
- `app/globals.css` (backup `app/globals.css.bak-20260905`)

## Why a new API route
The watch page is a client component that knows only its own
path — it has no idea what the sibling episodes are. The season
page reads the directory server-side, so the new route does the
same thing and returns the sorted list:

```
GET /api/episodes/<show>          flat show
GET /api/episodes/<show>/<season> seasonal
-> { "episodes": ["...mkv", ...] }
```

Same source of truth as the season page: `fs.readdirSync`,
filtered by the video extension regex, `.sort()`. Traversal is
rejected with `path.resolve` plus a `HDD_ROOT + path.sep` prefix
check, so `..%2F..%2Fetc` returns 400 rather than a listing.

## Behaviour
- The next episode is resolved once per episode, on mount. If the
  current file is not in the list (renamed or removed) or it is
  the last one, no card ever appears.
- Movies are excluded — `isMovie` short-circuits before the fetch.
- The countdown is driven by `onTimeUpdate` from the playhead, not
  a timer: scrubbing backwards hides the card, scrubbing forwards
  brings it straight back. Threshold is `NEXT_UP_SEC = 10`.
- **`ended` is what actually advances**, not the countdown. Some
  files stop a beat early and the last `timeupdate` can land past
  the end, so the card is only the visible part of the mechanism.
- `goNext()` calls `push(true)` before navigating, so the finished
  episode is marked watched instead of sitting at 99% in the list.
  An `advanced` ref makes it idempotent — the button and `ended`
  cannot both fire a navigation.
- Cancel hides the card for the rest of the episode and blocks the
  auto-advance; playback is untouched.

## Implementation note
`goNext` is declared *after* `push`, deliberately. Declaring it
earlier and listing `push` in its dependency array evaluates
`push` while it is still in the temporal dead zone, which throws
at render.

## Verification
- `npm run build` clean; `/api/episodes/[...path]` in the route
  table.
- Started a throwaway `next start -p 4185` against the fresh
  build: the season listing returned the real sorted episode
  list, and the traversal probe returned 400. That server was
  killed afterwards and port 4185 is free.
- The live service on 4178 has NOT been restarted, so this is not
  in front of users yet.

## Not done
- `shows-app` service not restarted — needs Gaurav's go.
- Not tested with a real playthrough to the final 10 seconds.
