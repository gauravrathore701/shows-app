# Episode titles + Omniverse S01 completed — 2026-09-06 14:55

## Part 1 — Omniverse Season 01 sorted
Source: /mnt/hdd/Copy To Pi/S01_E01-E10-20260906T090656Z-1-001
10 .mkv, E01-E10.

Season 01 already held E02, E04, E07. Compared byte sizes
first — new and existing were identical (164/171/169 MB),
same release. So those three were SKIPPED, not overwritten,
and 7 files moved:
    E01, E03, E05, E06, E08, E09, E10
Season 01 is now 10/10. Omniverse total 32/80.

The 3 duplicate .mkv files are still sitting in staging.
Left in place — not deleted without asking.

## Part 2 — episode titles
New per-season config, Gaurav's request:
    <show>/Season NN/episodes.txt
    01=The More Things Change (1)
    02=The More Things Change (2)

Fetcher: .claude/tools/episode_titles.py
  - resolves the TMDB show id by matching the folder year
    against the page title (same approach as season_art.py)
  - parses data-episode-number + the anchor text
  - ?language=en-US on every fetch (IP localisation)
  - skips a season that already has episodes.txt unless
    --force; dry run unless --apply
Ran with --apply: 35 episodes.txt written, one per season
folder in the library. 100% coverage.

## App changes
app/show/[showName]/[season]/page.js
  - readTitles() parses episodes.txt
  - episode number now comes from the SxxEyy token in the
    FILENAME, not the list index. This matters: Omniverse
    S02 holds only E04, and the old index-based number
    labelled it "01". Every gapped season was mislabelled.
  - each episode gains epNum + title

app/components/EpisodesList.js
  - .ep-num badge uses epNum
  - .ep-name renders `Episode 01 - The More Things Change (1)`
    when a title exists, else falls back to the filename

Fallback is total: no episodes.txt, or a number with no
entry, and the old filename label is used.

## Verified
    npm run build -> Compiled successfully in 3.1s
    restart 14:55, all 3 services active
    RSC payload carries epNum + title, e.g.
      "epNum":"01","title":"The More Things Change (1)"
    client chunk carries the label:
      Episode ".concat(e.epNum," - ")
    https://shows.cursedshrine.com  200

The label renders client-side (EpisodesList is a client
component), so it is absent from server HTML by design.

## Files
    backups/season-page.js.bak-20260906
    backups/EpisodesList.js.bak-20260906
