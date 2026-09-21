# Chapter titles + episode sort toggle

Date: 2026-09-20 17:10 IST

## chapters.txt — new convention
`/mnt/hdd/<Show>/Manga/chapters.txt`, same shape as the video side's
episodes.txt:
  1179=Nerona Imu Descends
Read by `readChapterTitles()` in `app/lib/manga-server.js`; `listChapters()`
now returns `title` per chapter (null when the file or the line is missing,
so a show with no chapters.txt just shows "Chapter N").

The .cbz archives carry no ComicInfo.xml — checked all 15, they hold only
page images — so titles have to come from an external list.

Titles for 1179-1193 taken from the Wikipedia chapter list
(List of One Piece chapters (1016–current)). Note: the One Piece Wiki
(onepiece.fandom.com) answers 402 to WebFetch from this Pi, so Wikipedia is
the workable source.

## UI
- `ChaptersList.js` row label -> "Chapter 1179 - Nerona Imu Descends",
  falls back to "Chapter 1179" with no title.
- `MangaReader.js` takes `chapterTitle` and shows it in the sticky nav.
- `read/[showName]/[chapter]/page.js` passes it down.

## Episode sort toggle (earlier in the same session)
`EpisodesList.js` grew the same Newest/Oldest pill the chapter list has.
- choice stored per list in localStorage key `epSort`, keyed by `watchBase`
  for seasons and by show name for flat shows
- default stays oldest-first, so nothing moved for existing shows
- `fallbackNum` is computed BEFORE the reverse, so flipping the order does
  not renumber episodes that have no number in the filename
- applies to both flat shows and season pages, since both render this
  component

Backups: `backups/manga-server.js.bak-titles-20260920`,
         `backups/ChaptersList.js.bak-titles-20260920`,
         `backups/MangaReader.js.bak-titles-20260920`,
         `backups/EpisodesList.js.bak-epsort-20260920`

## Verified
- build clean, service active
- `/api/manga/One Piece` returns titles on all 15 chapters
- `/read/One Piece/1P Chapter 1189.cbz` -> 200
- show + season pages 200; sort control present in both page bundles
