# Library intake — One Piece 1167-1171, Gladiator (2000), Troy (2004)

**Date:** 2026-08-01 23:40 IST

## Ask

Process `/mnt/hdd/Copy To Pi`: file the new One Piece episodes into the existing show folder,
set up the two new movies with metadata, and write a step-by-step process doc into the staging
folder.

## What was in staging

| File | Size |
|---|---|
| `AnimePahe_One_Piece_-_1167..1171_1080p_SubsPlease.mp4` (×5) | ~190-268 MB each |
| `Troy.2004.DC.1080p.BluRay.x264.AAC-ETRG/` | 3.08 GB + `English.srt` |
| `Gladiator (2000)/Gladiator.EXTENDED.2000.1080.BrRip.264.YIFY.mp4` | 1.72 GB + `.srt` |
| tracker `.txt`, YIFY `.jpg`, `Other/` | junk |

## Actions

### One Piece
Moved all five episodes to `/mnt/hdd/One Piece/`, renamed to the folder's existing convention
`1P Episode <n>.mp4`. Same filesystem, so `mv -n` is a rename — instant, no space consumed,
no overwrite risk. Folder went 6 -> 11 episodes. No metadata edit needed: episode count is read
live off the filesystem.

### Movies
Created `/mnt/hdd/Gladiator (2000)/` and `/mnt/hdd/Troy (2004)/` matching the established movie
layout (folder `Title (Year)`, video file named identically, `metadata.txt` alongside). Subtitles
moved in and renamed to match; they are inert — the app only counts the video extensions
`.mp4 .mkv .avi .mov .webm`, and the player has no external-subtitle wiring.

`chmod 777` on both new folders to match the other library dirs.

### metadata.txt written

```
# Gladiator (2000)
type=movie-hollywood
heroImage=https://media.themoviedb.org/t/p/w500/wN2xWp1eIwCKOD0BHTcErTBv1Uq.jpg
tags=action,drama,adventure,historical,epic,hollywood,roman
suggestionPoint=1

# Troy (2004)
type=movie-hollywood
heroImage=https://media.themoviedb.org/t/p/w500/a07wLy4ONfpsjnBqMwhlWTJTcm.jpg
tags=war,action,history,epic,hollywood,mythology,greek
suggestionPoint=1
```

Poster hashes pulled off TMDB's public pages (movie ids 98 and 652) — no API key involved:

```
curl -sL -A "Mozilla/5.0" "https://www.themoviedb.org/movie/98-gladiator" \
  | grep -o 'image.tmdb.org/t/p/w500/[^"]*\.jpg' | head -1
```

Rewritten to host `media.themoviedb.org` because that is the only entry in
`next.config.js` -> `images.remotePatterns`. Those URLs answer `301` and redirect to
`image.tmdb.org`; verified an existing working poster (Oppenheimer) behaves identically, so
the redirect is normal, not a fault.

Genres taken from the same TMDB pages — Gladiator: Action/Drama/Adventure; Troy: War/Action/History.
Titles and years confirmed there too. Title words deliberately kept out of `tags`, since the search
added earlier today already matches folder name + type + tags in one pass.

### Codec check

```
Gladiator (2000).mp4    h264,1920,816
Troy (2004).mp4         h264,1920,794
1P Episode 1171.mp4     h264,1920,1080
```

All h264 -> direct play. None hit the on-demand HEVC->HLS path, so no ~15s cold-start penalty.

### Process doc

Written to `/mnt/hdd/Copy To Pi/HOW_TO_ADD_MEDIA.txt` — 7 numbered steps covering the three
naming conventions, move-don't-copy reasoning, all four `metadata.txt` keys and what each one
drives, the keyless TMDB poster lookup, the codec check, the cache/restart step and verification.
Also records the One Piece gap and the leftover-junk cleanup command.

## Verification

```
shows-app.service           active
GET localhost:4180/         200
RSC payload                 "Gladiator (2000)", "Troy (2004)", One Piece "count":11
```

Restarted `shows-app.service` rather than waiting out the 5-minute in-memory folder cache in
`app/page.js`. UI only — `video-server` (4179) and `shows-proxy` (4180) untouched, so no
in-flight playback was interrupted.

## Cleanup pass (23:47, same session)

Gaurav confirmed the deletion and set the standing rule: **a movie folder holds only its video
file.** Removed:

| Path | |
|---|---|
| `Copy To Pi/Gladiator (2000)/` | 3 tracker `.txt` + 1 YIFY advert `.jpg` |
| `Copy To Pi/Troy.2004.DC.1080p.BluRay.x264.AAC-ETRG/` | 1 tracker `.txt` |
| `Gladiator (2000)/Gladiator (2000).srt` | 95 KB |
| `Troy (2004)/Troy (2004).srt` | 198 KB |

The subtitles were mine from the earlier step — the player has no external-subtitle support,
so they were dead weight. Both movie folders now hold exactly `<Title> (Year).<ext>` +
`metadata.txt`.

Library-wide sweep confirms nothing else strayed:

```
find /mnt/hdd -mindepth 2 -type f ! -path "*/lost+found/*" ! -path "/mnt/hdd/Copy To Pi/*" \
  ! -iname "*.mp4" ! -iname "*.mkv" ! -iname "*.avi" ! -iname "*.mov" ! -iname "*.webm" \
  ! -name "metadata.txt"
-> no output
```

Every other folder was already clean. `Copy To Pi` now holds only `HOW_TO_ADD_MEDIA.txt`.

`HOW_TO_ADD_MEDIA.txt` updated to match: the movie-layout section now states the
video-plus-metadata-only rule explicitly, Step 2 moves only the video and deletes the release
folder, and the stray-file `find` sweep is included as a verification command.

No service restart needed — deleting non-video files cannot change what the app enumerates.

## Left alone

- **One Piece 1165 is missing** — already absent before this run, not lost here. Folder now holds
  1160-1164, 1166-1171. Fetch with
  `python3 /home/gaurav/Projects/daily-script/download_one_piece.py 1165`.
