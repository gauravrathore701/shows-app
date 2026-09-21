# Intake run — Cowboy Bebop + One Piece 1177-1178

Date: 2026-09-20 16:30 IST
Staging: /mnt/hdd/Copy To Pi
Process followed: Copy To Pi/HOW_TO_ADD_MEDIA.txt

## One Piece
- Moved `AnimePahe_One_Piece_-_1177/1178_1080p_SubsPlease.mp4`
  -> `/mnt/hdd/One Piece/1P Episode 1177.mp4`, `... 1178.mp4`
- Folder now holds 1160-1178 (1165 still missing, pre-existing gap).
- `episodes.txt` already had 1177; appended
  `1178=Protect History and the Future - Robin and Gaban Go on the Attack`
- Codec: both h264 1920x1080 -> direct play.
- metadata.txt untouched (episode count is read live).

## Cowboy Bebop (new)
- `/mnt/hdd/Cowboy Bebop/` — flat anime folder, no year in name to match
  the other flat anime (One Piece, Dororo, Hellsing Ultimate).
- 26 files renamed `[DB]Cowboy Bebop_-_NN_(...).mkv` -> `Cowboy Bebop NN.mkv`.
  Zero-padded 2 digits so the alphabetical sort matches session order.
- `episodes.txt` written, 26 lines, session (Blu-ray/canonical) order.
  NOTE: TMDB's season 1 list is ordered by ORIGINAL TV TOKYO AIR DATE, not by
  session number — the 12 TV-aired episodes (sessions 2,3,7,8,9,10,11,12,13,
  14,15,18) are listed first, then the rest ascending. Scraping TMDB episode
  numbers directly gives a wrong map. Titles cross-checked against TMDB
  (same 26 strings), ordering taken from session order, which is what the
  [DB] Blu-ray rip filenames use.
- metadata.txt:
  type=anime
  heroImage=https://media.themoviedb.org/t/p/w500/xDiXDfZwC6XYC6fxHI1jl3A3Ill.jpg
  tags=anime,space,western,noir,bounty-hunter,jazz,classic,seinen
  addedDate=2026-09-20
  suggestionPoint=0
- TMDB id 30991 confirmed via <title> = "Cowboy Bebop (TV Series 1998)".
  Poster NOT localised (default hash == ?language=en-US hash). URL returns 200.
- chmod 777 on the folder.
- Codec: hevc 1448x1080 10-bit -> HLS transcode on demand, ~15 s before the
  picture appears on first play/seek. Not a fault.

## Service
- `sudo systemctl restart shows-app.service` -> active, UI 200 on :4180.
- Verified: "Cowboy Bebop" card on home, episode titles render on
  /show/Cowboy%20Bebop, 1178 title renders on /show/One%20Piece.
- Library-wide stray-file sweep clean (only lost+found permission denied).

## Left alone — needs Gaurav's yes
6 now-empty release folders still in staging:
  db-bebop-of-the-cowboys-1080p
  Dune.2021.1080p.WEBRip.x264-RARBG
  Dune.Part.Two.2024...GalaxyRG[TGx]
  Dune.Prophecy.Season.1...[y2flix]
  Rick.and.Morty.SEASON.05...PSA
  Good Will Hunting
They hold only .srt/tracker .txt leftovers from earlier runs. Not deleted.
