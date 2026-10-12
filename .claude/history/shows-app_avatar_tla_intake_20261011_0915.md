# Avatar The Last Airbender — intake into the shows library

Date: 2026-10-11 09:15 IST

## What happened before this run

A pull of the release from the PC on 2026-10-10 17:19 wrote into
`/home/gaurav/Projects/` (SD card) instead of `/mnt/hdd`, and was cut short by
a Pi hard-reset at 17:20. At 08:00 on 2026-10-11 `routines/git_sync.sh` found a
dir with no `.git` in `~/Projects`, ran `git init` + commit, and duplicated the
mp4 files into `.git` — 8.6 GB on the SD card, 18 of 20 videos truncated or
zero-byte. Nothing was pushed (no remote was created). Gaurav approved deleting
that folder; nothing else was touched.

## Pull

`routines/pull_avatar.sh` — resumable, size-verified per file against a manifest
read off the PC (`routines/avatar_manifest.tsv`, 94 files / 15.7 GB).

- source: `E:\Copy To Pi\Avatar The Last Airbender - The Complete Series 1080p [HEVC AAC] - SEPH1`
- transport: one `sftp -b` batch over eth0 (negotiated 1000 Mb/s), each `get`
  prefixed with `-` so a single failure does not abort the batch
- staging dest: `/mnt/hdd/Copy To Pi/` (app SKIPs this dir, so partial files
  never appear in the UI)
- result: 94 complete / 0 incomplete in ~3 min

The USB HDD dropped and ext4-recovered again at ~09:02 (JMicron UAS enclosure,
`usb 2-1: reset SuperSpeed USB device`). Re-running the script after the remount
re-verified all 94 files intact. Worth looking at a `usb-storage.quirks` entry to
disable UAS for this enclosure — second drop in two days.

## Filing (per HOW_TO_ADD_MEDIA.txt)

`/mnt/hdd/Avatar The Last Airbender (2005)/`

- `Season 01` 20, `Season 02` 20, `Season 03` 21 mp4 — zero-padded names
- `mv -n` within the same filesystem, so instant and no extra space used
- two release suffixes stripped: `Jet fin.mp4` → `Jet.mp4`,
  `The Great Divide nw_new.mp4` → `The Great Divide.mp4`
- `metadata.txt`: `type=series`, TMDB `tv/246`, poster
  `yaGt4GIutpbXHsv48tWceWg6s56.jpg` (default and `?language=en-US` posters are
  identical, so no Hindi key art here), `addedDate=2026-10-11`,
  `suggestionPoint=0`

Verified against the running app on `127.0.0.1:4180`:

- home page lists the show and the poster hash
- `/show/Avatar The Last Airbender (2005)` lists Season 01/02/03
- `/show/.../Season 01` lists episodes ("The Boy in the Iceberg")

Still in staging, untouched and awaiting Gaurav's call: the
`Featurettes & Extras - RCVR` folder, 33 files / 1.6 GB (27 mkv + 6 png) in
nested subfolders. The library rule allows only videos plus `metadata.txt` in a
show folder, and nested sub-subfolders are not read by the app, so these cannot
be filed as-is.

## git_sync guard

`routines/git_sync.sh` (backup: `git_sync.sh.bak-20261011`) — added
`looks_like_code()` and a guard in the NEW REPO branch only. A dir in
`~/Projects` with no source file at depth <= 3 is now logged as
`skipped (no source files — looks like media/data, not a project)` instead of
being git-init'd. Existing repos are unaffected. Tested both ways against a
fake media dir and a fake code dir.
