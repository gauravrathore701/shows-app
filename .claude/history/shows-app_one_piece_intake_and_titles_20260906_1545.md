# One Piece intake + titles for flat shows — 2026-09-06 15:45

## Files sorted
Source: /mnt/hdd/Copy To Pi/One Piece/  5 x .mp4
    AnimePahe_One_Piece_-_1172_1080p_SubsPlease.mp4
    ... 1173, 1174, 1175, 1176
Renamed to the library convention used by the existing
files and moved to /mnt/hdd/One Piece/:
    1P Episode 1172.mp4  ... 1176
No clashes. Library now holds 16 episodes: 1160-1176,
with 1165 still missing (it was already absent).

One Piece is a FLAT show — no Season folders, absolute
episode numbers. metadata.txt says type=anime.

## Titles
TMDB tv/37854 numbers One Piece episodes ABSOLUTELY inside
its seasons (season 22 covers 1089-1155, season 23 covers
1156-1181), so no per-season offset maths was needed.

Scraped all 23 seasons, merged, wrote
    /mnt/hdd/One Piece/episodes.txt
1181 lines, keyed by absolute number:
    1=I'm Luffy! The Man Who Will Become the Pirate King!
    ...
    1172=Monsters Appear in Elbaph - "What I Fear Most"
Note 1181 has no real title on TMDB yet — it stores the
placeholder "Episode 1181".

## App change — flat shows can now show titles
app/show/[showName]/page.js
  - readTitles(dir) added (same parser as the season page)
  - episodeNumber(filename, i) added: prefers SxxEyy, else
    falls back to the LAST number in the name, which is
    what absolute-numbered anime uses
    ("1P Episode 1172.mp4" -> 1172)
  - the flat branch now attaches epNum + title

EpisodesList needed no change — it already renders
`Episode <num> - <title>` when a title exists.

## Verified
    npm run build -> Compiled successfully in 3.4s
    restart 15:45, all 3 services active
    /show/One Piece payload:
      "epNum":"1160","title":"An Encounter on a
        Snowfield - Loki, the Accursed Prince"
    https://shows.cursedshrine.com  200

## Staging
    /mnt/hdd/Copy To Pi/  now only HOW_TO_ADD_MEDIA.txt
    (the emptied "One Piece" folder was left in place)

## Backup
    backups/show-page.js.bak2-20260906

## Follow-up 15:52 — episode 1165 + placeholder titles

### 1165 added
The file was sitting loose at the top of Copy To Pi, not
inside the One Piece subfolder, which is why the earlier
loop missed it:
    /mnt/hdd/Copy To Pi/
      AnimePahe_One_Piece_-_1165_1080p_SubsPlease.mp4
 -> /mnt/hdd/One Piece/1P Episode 1165.mp4
Library is now 1160-1176 with NO gaps — 17 episodes.
Its title was already in episodes.txt:
    1165=A Welcome with Friends' Cups and
         Intruders Seeking Loki

### Where "Episode 1181" came from
Gaurav was right to challenge it. TMDB pre-creates slots
for scheduled-but-unaired episodes and labels them
"Episode <n>" until a title is published. Verified on
tv/37854 season 23:
    1176  aired  August 30, 2026
    1177  titled (airs today, 6 Sep 2026)
    1178  Episode 1178   September 13, 2026
    1179  Episode 1179   September 20, 2026
    1180  Episode 1180   September 27, 2026
    1181  Episode 1181
So they are future episodes, not bad data — but storing
them is pointless and would render "Episode 1181 -
Episode 1181".

### Fixed both places
- Stripped 1178, 1179, 1180, 1181 from
  /mnt/hdd/One Piece/episodes.txt (now 1177 lines,
  last real title 1177).
- episode_titles.py now skips any title matching
  ^Episode \d+$, so future runs never write placeholders
  for any show.

## Follow-up 15:56 — staging emptied
Confirmed 0 files under Copy To Pi/One Piece/ and 17
episodes in the library (1160-1176, no gaps), then removed
the folder with `rmdir` — empty-only, so it would have
failed rather than taking anything with it.

/mnt/hdd/Copy To Pi/ now contains only HOW_TO_ADD_MEDIA.txt.
Disk: 236G free of 458G.
