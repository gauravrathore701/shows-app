# Movies open the player directly, skipping the episode list

**Date:** 2026-08-02 00:25 IST

## Ask

A movie folder always holds exactly one video, so clicking a movie card should land on the
player instead of a one-item episode list.

## Approach

Two options were on the table:

1. Link the card straight at `/watch/...`.
2. Redirect `/show/<movie>` to the player.

Went with **1 only**. A server `redirect()` on `/show/<movie>` would trap the back button —
back from the player lands on `/show/`, which immediately redirects forward to the player again.
`/show/<movie>` is left working as a plain one-item list; it is now only reachable by typing the
URL, which is a harmless fallback.

## Changes

### `app/page.js`

`loadShows()` now captures the single video filename:

```js
const videoFile = directVideos.length === 1 ? directVideos[0].name : null;
```

Returned on each show object. Note it is populated for *any* single-video folder, not only
movies — the movie check happens at link time, so a one-episode series still gets its list.

### `app/components/ShowsBrowser.js`

```js
function cardHref(show) {
  if (show.type?.startsWith('movie-') && show.videoFile) {
    return `/watch/${encodeURIComponent(show.name)}/${encodeURIComponent(show.videoFile)}`;
  }
  return `/show/${encodeURIComponent(show.name)}`;
}
```

Matches `movie-` as a prefix so it covers both `movie-hollywood` and `movie-bollywood`.
Falls back to the show page if `videoFile` is somehow missing, so a malformed folder degrades
rather than producing a broken link.

### `app/watch/[showName]/[...path]/page.js`

The watch page is a client component and has no access to `type`. Rather than plumbing a query
param through (which would need `useSearchParams` + a Suspense boundary), it derives the fact
from the naming convention already enforced on disk — a movie is stored as
`<Title (Year)>/<Title (Year)>.<ext>`:

```js
const isMovie = !isSeasonal && epTitle === decodedShow;
```

Verified this holds for **all 12** movie-type folders before relying on it.

With that, three bits of now-nonsense UI are suppressed for movies:

- Breadcrumb was rendering `Gladiator (2000) › Gladiator (2000)`, the first crumb linking to the
  episode list. Now a single unlinked crumb.
- `watch-ep-name` duplicated the show name directly beneath it. Hidden.
- The `☰ All Episodes` button pointed at the one-item list. Removed; only `⌂ Library` remains.

Seasonal shows are untouched — they keep `☰ All Episodes` and `📺 Seasons`.

## Verification

Routing, read from the rendered payload:

```
Adventure Time (2010)      series            list
One Piece                  anime             list
Gladiator (2000)           movie-hollywood   DIRECT->player
Columbus (2017)            movie-hollywood   DIRECT->player
Maharaj (2024)             movie-bollywood   DIRECT->player
The Boys (2019)            series            list
GOTS3                      series            list
Hellsing Ultimate          anime             list
...
```

All 11 movie-type entries route direct; all 7 series/anime keep the list.

Live route checks:

```
GET /watch/Gladiator%20(2000)/Gladiator%20(2000).mp4        200
GET /api/stream/Gladiator%20(2000)/... (Range: 0-1023)      206
```

206 confirms the byte-range stream path works end to end, not just that the page renders.

`npm run build` clean. `shows-app.service` restarted -> `active`.

## Depends on

The naming rule `<Title (Year)>/<Title (Year)>.<ext>`, documented in
`/mnt/hdd/Copy To Pi/HOW_TO_ADD_MEDIA.txt`. If a movie is ever filed with a video name that
differs from its folder name, the card still opens the player (that path uses `videoFile`, not
the name match), but the watch page will show the old episode-style breadcrumb and the
`All Episodes` button.
