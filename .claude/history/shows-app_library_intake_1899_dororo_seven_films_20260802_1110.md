# Library intake — 1899, Dororo + 7 films

**Date:** 2026-08-02 11:10 IST
**Trigger:** Gaurav dropped 9 titles in `/mnt/hdd/Copy To Pi` and asked for the standard
intake per `HOW_TO_ADD_MEDIA.txt`, with `addedDate` forced to the day before yesterday.

## What landed

| Folder | type | count | notes |
|---|---|---|---|
| `1899` | series | 8 | `Season 01/`, files renamed `1899 S01E01 - The Ship.mkv` … |
| `Dororo` | anime | 24 | flat; original `NN - Title.mkv` names kept |
| `Children of Men (2006)` | movie-hollywood | 1 | |
| `Dead Poets Society (1989)` | movie-hollywood | 1 | folder renamed, apostrophe dropped |
| `Me Before You (2016)` | movie-hollywood | 1 | year added |
| `Love Untangled (2025)` | movie-hollywood | 1 | Korean; tagged `korean,k-movie` |
| `The Garden of Words (2013)` | movie-anime | 1 | article + year added |
| `Weathering with You (2019)` | movie-anime | 1 | |
| `Your Name (2016)` | movie-anime | 1 | year added |

All nine got `addedDate=2026-07-31` (day before yesterday), `suggestionPoint=0`,
TMDB `heroImage` on `media.themoviedb.org`, and `chmod 777`.

## Code change — new `movie-anime` type

Three Shinkai films are anime *and* single-file movies. The two existing behaviours
conflicted: `type=anime` puts them in the Anime tab but opens a one-item episode list;
`type=movie-*` opens the player directly but the tab filter was an exact string match,
so they would appear only under All.

Resolved by letting a tab cover several types:

- `app/page.js` — `TAB_TYPES` values are arrays now; `anime: ['anime', 'movie-anime']`.
  `TYPE_ICON` gained `'movie-anime': '🎌'`.
- `app/components/ShowsBrowser.js` — filter went from `s.type === typeFilter` to
  `typeFilter.includes(s.type)`.

`cardHref()` needed no change — it already matches on the `movie-` prefix.

## Folder naming

Renames were not cosmetic. `app/watch/[showName]/[...path]/page.js` decides a folder is
a movie with `!isSeasonal && epTitle === decodedShow`, so the video filename minus its
extension has to equal the folder name exactly. Folders arriving as `Your Name`,
`Me Before You`, `Love Untangled 2025`, `Garden of Words` would have broken that test.

Also corrected `Dead Poet's Society` → `Dead Poets Society` (the real title has no
apostrophe; confirmed on TMDB 207).

Season folders use `Season 01`, zero-padded — matches Adventure Time and The Boys, and
keeps `Season 10` from sorting ahead of `Season 2` under the plain alphabetical sort in
`app/show/[showName]/page.js`.

## TMDB lookup gotcha

`themoviedb.org/search` from this Pi is unusable — searching "Dororo" returned Zorro,
Donor and Doors and never the show, and pages come back with Hindi titles because TMDB
localises on server IP. Used a site-restricted web search for the id, then verified each
one by fetching the page and reading `<title>`. All nine poster URLs confirmed `200`.

## Codecs

h264: 1899, Children of Men, Dead Poets Society, Weathering with You, Your Name
hevc: Dororo (all 24), Me Before You, Love Untangled, The Garden of Words

The hevc titles take the HLS transcode path — roughly 15 s before playback starts.

## Verification

```
build                                    clean
shows-app.service                        active
GET /                                    200
GET /show/1899                           200
GET /show/1899/Season%2001               200
GET /show/Dororo                         200
GET /watch/Your%20Name%20(2016)/...      200
GET /api/stream/... (Range: 0-1023)      206
9 poster URLs                            200
stray-file sweep                         clean
```

Rendered payload confirms all 9 present with correct counts and types, ordered
Adventure Time → One Piece → Gladiator/Troy → the nine → Columbus/The Boys.

## Docs

`/mnt/hdd/Copy To Pi/HOW_TO_ADD_MEDIA.txt` updated: corrected the season-folder naming
(the doc said `Season 1`, disk uses `Season 01`), documented `movie-anime` and the full
tab→type mapping, added the TMDB-id verification step, and appended a run log.

Free space after: 291 GB of 458 GB.
