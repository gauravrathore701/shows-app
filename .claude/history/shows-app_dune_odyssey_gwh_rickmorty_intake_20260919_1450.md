# Library intake: Odyssey, Dune x3, Good Will Hunting, Rick and Morty S05 — 2026-09-19 14:50

Six titles moved out of `/mnt/hdd/Copy To Pi` into the library,
following `Copy To Pi/HOW_TO_ADD_MEDIA.txt`.

## Movies (type=movie-hollywood)
- `The Odyssey (2026)/The Odyssey (2026).mkv` — tmdb movie/1368337, hevc
- `Dune (2021)/Dune (2021).mp4` — tmdb movie/438631, h264
- `Dune - Part Two (2024)/...mkv` — tmdb movie/693134, h264
- `Good Will Hunting (1997)/...mkv` — tmdb movie/489, **av1**

Colon in "Dune: Part Two" written as " - ", matching
`Puss in Boots - The Last Wish (2022)`.

## Series (type=series)
- `Dune - Prophecy (2024)/Season 01/` — 6 eps, tmdb tv/90228, h264
- `Rick and Morty (2013)/Season 05/` — 10 eps, tmdb tv/60625, hevc

Episode files named `<Show> S05E01 - <Title>.mkv` (1899 shape).
Also wrote `episodes.txt` (`NN=Title`) in each season folder — that
convention postdates HOW_TO_ADD_MEDIA.txt but the app reads it in
`app/api/episodes/[...path]/route.js` and every other seasonal show
has one. Dune Prophecy titles scraped off the TMDB season page;
Rick and Morty titles came out of the release filenames.

## Posters
All six checked with the localisation diff from the guide. Dune (2021)
and Dune: Part Two came back LOCALISED without `?language=en-US`, so the
English hashes were used. All six URLs answer 200 on
media.themoviedb.org.

## addedDate
2026-09-19 for everything except Rick and Morty = 2026-09-06, the day
its release folder actually landed in staging.

## Codecs
h264 direct-plays. hevc (Odyssey, Rick and Morty) transcodes to HLS,
~15s before first playback. **av1 (Good Will Hunting) is new to this
library** — `video-server.js` only treats h264 as browser-native
(`BROWSER_VIDEO`), so it transcodes, and av1 software decode on the Pi
is far heavier than hevc. Untested, may need a one-off re-encode to
h264.

## Not done
- Staging leftovers (648 KB of .srt, tracker .txt, RARBG .exe and the
  6 empty release dirs) left in place — waiting on Gaurav's yes.
- `Troy (2004)` was already in the library from 2026-08-01, untouched.

## Also seen
`/mnt/hdd` (sda) threw an I/O error at 14:45:24, USB-reset and
remounted clean at 14:45:29. `sdb1` (`/mnt/external_hdd`) errored in the
same event and is NOT mounted now.

Verified: `shows-app.service` restarted, port 4180 = 200, all six cards
render on the home page.
