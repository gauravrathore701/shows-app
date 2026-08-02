# Library ordering — newest upload first, with two pinned shows

**Date:** 2026-08-02 00:04 IST

## Ask

Order every section of the library by upload date, newest first, with Adventure Time and
One Piece held at the top. Write the upload date into `metadata.txt` if needed.

## Picking the date source

Neither timestamp alone was right, so both were compared per folder:

| Show | mtime | ctime |
|---|---|---|
| Oppenheimer (2023) | 2023-11-23 | 2026-06-20 |
| Blade Runner 2049 | 2024-01-29 | 2026-06-20 |
| Columbus (2017) | 2021-06-06 | 2026-07-18 |
| Troy (2004) | 2026-08-01 | 2026-08-01 |

`mtime` carries over from wherever the file was originally downloaded — Oppenheimer's says
2023-11-23, which is the release, not the day it reached this Pi. **`ctime` is when the file was
written to this disk**, which is the upload date being asked for.

`ctime` is fragile though — any later `chmod` or move resets it. So it was read once and frozen
into `metadata.txt` as `addedDate`; the app reads the file, never the filesystem timestamp.

## Changes

### All 18 `metadata.txt` files

Added a fifth key, `addedDate=YYYY-MM-DD`, taken from the ctime of the newest video file in
each folder.

`suggestionPoint` was repurposed from a general curation score into a **pin weight**, and reset:

```
Adventure Time (2010)  100
One Piece               99
everything else          0
```

This flattens the previous hand-set values (Raakh 6, Aamis 5, Maharaj 4, Hellsing 3, Fences 2).
That was deliberate — leaving them non-zero would have overridden the date ordering and
contradicted the ask. Any of them can be re-pinned by setting a value above 0.

### `app/page.js`

Parses `addedDate`, defaulting to `''`. New three-level sort:

```js
.sort((a, b) =>
  b.suggestionPoint - a.suggestionPoint ||
  b.addedDate.localeCompare(a.addedDate) ||
  a.name.localeCompare(b.name)
);
```

Dates are `YYYY-MM-DD`, so string compare is chronologically correct — no `Date` parsing needed.
A folder with no `addedDate` sorts below every dated one, then alphabetically.

The sort lives in `loadShows()`, which every tab filters from, so **all sections inherit the
ordering** with one change. `ShowsBrowser` filters with `Array.filter`, which preserves order.

## Result

```
Adventure Time (2010)                 pinned 100
One Piece                             pinned  99
Gladiator (2000)                      2026-08-01
Troy (2004)                           2026-08-01
Columbus (2017)                       2026-07-18
The Boys (2019)                       2026-07-18
Raakh (2026)                          2026-07-01
Maharaj (2024)                        2026-06-21
500 Days of Summer (2009)             2026-06-20
Aamis (2019)                          2026-06-20
Blade Runner 2049                     2026-06-20
Blue Valentine (2010)                 2026-06-20
Fences (2016)                         2026-06-20
GOTS3                                 2026-06-20
Manchester by the Sea (2016)          2026-06-20
Oppenheimer (2023)                    2026-06-20
Puss in Boots - The Last Wish (2022)  2026-06-20
Hellsing Ultimate                     2026-04-04
```

The 2026-06-20 block is the original library import — all one day, so they tie and fall through
to alphabetical.

## Verification

`npm run build` clean. `shows-app.service` restarted -> `active`. Order above read straight out of
the rendered RSC payload, not inferred.

## Doc updated

`/mnt/hdd/Copy To Pi/HOW_TO_ADD_MEDIA.txt` — Step 3 now documents five keys, states the
three-level sort order, records the current pins, and gives the `find -printf "%CY-%Cm-%Cd"`
one-liner for reading a new folder's `addedDate`, with the ctime-vs-mtime warning.
