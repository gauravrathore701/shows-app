# E:\ batch intake — 17 titles — 2026-10-25 12:00

Gaurav picked titles from the PC E:\ scan (/tmp/e_scan.tsv, 519 videos).
Pulled 66 files over the direct cable into `Copy To Pi/e_batch` (size-checked
vs the PC listing; first run's `awk -v` mangled `\` paths, fixed with ENVIRON),
plus 2 PC-side conversions, then `/tmp/intake.sh` moved + wrote metadata.

Converted on the PC (libx264 veryfast crf21, AAC stereo 192k, faststart):
Jai Bhim (hevc+eac3 → h264, 2h31m, 1.75 GB), Cocktail (mpeg4 avi + ac3 →
h264, 2h25m, 0.93 GB). Outputs left in D:\Claudy Rex Work Directory\render\h264.

Anime (flat, "NN - Title.mkv", type=anime, no year in folder):
Your Lie in April 22 (ep19 name fixed "Goodbye.mkv Hero" → "Goodbye Hero"),
Anohana 11, Given 10 (ep 03 absent on PC), The Promised Neverland 12
(titles = official date codes, from Wikipedia season 1).
All four HEVC 10-bit (3 with Opus) → HLS transcode on the Pi; offered PC
re-encode (~3 h), awaiting Gaurav.

Movies: Given The Movie (2020) + Vampire Hunter D - Bloodlust (2000)
movie-anime; Rockstar (2011), The Kashmir Files (2022), Jai Bhim (2021),
Cocktail (2012) movie-bollywood; Eternal Sunshine (2004), In Bruges (2008),
American Psycho (2000), Another Round (2020), The Grand Budapest Hotel (2014,
"Budapest.mp4" — 99 min matched GBH not Budapest 2018), Pans Labyrinth (2006,
apostrophe dropped like Dead Poets), The Lighthouse (2019) movie-hollywood.

TMDB ids verified by <title>; all 17 posters English (contact sheet checked).
addedDate 2026-10-25, chmod 777. Verified: 17 cards on home, Range 206 on
each. Staging e_batch now holds only empty dirs (left; not deleted).
PC originals untouched. Free space 164 GB.
