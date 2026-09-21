# Manga tab + CBZ reader

Date: 2026-09-20 16:55 IST

## Files filed
15 chapters out of `/mnt/hdd/Copy To Pi` ->
`/mnt/hdd/One Piece/Manga/1P Chapter 1179.cbz` .. `1193.cbz`
(names normalised, "(Digital)" suffix dropped). Folder chmod 777.
Nothing deleted; archives untouched inside.

## New convention
  /mnt/hdd/<Show>/Manga/<anything>.cbz
The folder is invisible to the video code: page.js only counts video
extensions, and the season scan now excludes the name `Manga` explicitly.
A show with a Manga/ folder grows an Episodes / Manga toggle; a show with
only manga and no videos also works (episode list renders empty).

## Code
NEW `app/lib/manga-server.js`
  - `unzip` shell-out, no npm dep, nothing extracted to disk
  - `listChapters` (number parsed off the filename, numeric sort)
  - `chapterPages` — entry listing cached by path+mtime+size; filters to
    image extensions, drops directory entries, sorts pages numerically on
    the BASENAME so a wrapper folder cannot reorder them
  - `readPage` — `unzip -p` to stdout; entry name always comes from the
    cached listing, never from the URL
  - `sniff()` — magic-byte content type. The 1191+ releases name pages
    `.png` while the bytes are JPEG, so the extension is not trusted.
NEW `app/api/manga/[...path]/route.js`
  - `/api/manga/<show>`                   -> chapter list
  - `/api/manga/<show>/<file.cbz>`        -> { pages: n }
  - `/api/manga/<show>/<file.cbz>/<n>`    -> page image, 0-based,
    immutable cache header (archives never change once filed)
NEW `app/components/MediaTabs.js`   Episodes / Manga toggle, choice
    remembered per show in localStorage (`mediaTab`)
NEW `app/components/ChaptersList.js` chapter rows, reuses .episode-card;
    newest-first by default with a sort flip
NEW `app/components/MangaReader.js` vertical scroll reader, lazy images,
    IntersectionObserver tracks the visible page, prev/next chapter,
    fixed page counter, "Continue from page N" jump
NEW `app/lib/mangaProgress.js` reading position in localStorage
    (`mangaProgress`). Video progress is server-side via mecca-api; manga
    has no server store yet, so this is per-browser only.
NEW `app/read/[showName]/[chapter]/page.js` reader route
EDIT `app/show/[showName]/page.js` imports MediaTabs + listChapters,
    excludes `Manga` from the season scan, renders the toggle when
    chapters exist
EDIT `app/globals.css` +60 lines: .chapter-toolbar, .chapter-sort,
    .tab-count, .reader*, all on existing theme variables

Backups: `backups/show-page.js.bak-manga-20260920`,
         `backups/globals.css.bak-manga-20260920`

## Verified
- `next build` clean; `shows-app` restarted, active
- chapter list API: 15 chapters, sizes correct
- 1179 (pages inside a wrapper folder): 15 pages, page 0 = PNG 1403x2048
- 1191 (pages at archive root, .png names holding JPEG): 12 pages,
  page 0 served as image/jpeg via the sniffer
- page 14 -> 200, page 15 -> 404 (bounds)
- `..%2F..%2Fetc%2Fpasswd` -> 404 (entry must be in the listing)
- `/read/One Piece/1P Chapter 1193.cbz` -> 200
- Cowboy Bebop show page unchanged, no Manga tab
- Show pages sit behind the client AuthGate, so curl only sees the flight
  payload — chapter props confirmed present there, DOM checks need a browser

## Not done
- Reading position is browser-local. Cross-device resume would need a
  manga collection behind mecca-api, same path as watch_progress.
- Seasonal shows (The Boys, Dune Prophecy) render seasons and would ignore
  a Manga/ folder — only flat shows get the toggle today.
- No manga cards on the home page; entry point is the show page toggle.
