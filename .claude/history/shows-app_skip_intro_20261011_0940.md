# Skip Intro — metadata-driven, with a 3s offer then auto-skip

Date: 2026-10-11 09:40 IST

Asked for: Avatar season 1 has a 50s intro (00:00:00-00:00:50). Put the timing
in metadata, and whenever a timing is present show a "Skip Intro" button for
3 seconds — if it is not pressed, skip the intro anyway.

## Metadata

Two new optional keys, read from `metadata.txt`:

    introStart=00:00:00
    introEnd=00:00:50

Written to `/mnt/hdd/Avatar The Last Airbender (2005)/Season 01/metadata.txt`.
Season folder is checked before the show folder, so this season gets the intro
and Season 02/03 do not. A show whose seasons share one intro can carry the
pair at show level instead.

`SS`, `MM:SS` and `HH:MM:SS` all parse. `introStart` defaults to 0, `introEnd`
is what enables the feature, and `introEnd > introStart` is required or the
pair is ignored — a typo therefore degrades to "no intro", never to a bad seek.

Documented as STEP 4 in `/mnt/hdd/Copy To Pi/HOW_TO_ADD_MEDIA.txt`
(backup: `HOW_TO_ADD_MEDIA.txt.bak-20261011`).

## Code

- `app/lib/intro-server.js` (new) — `parseTimecode()` + `readIntro(...dirs)`,
  first directory with a usable pair wins.
- `app/api/episodes/[...path]/route.js` — answers with `intro` alongside
  `episodes` and `titles`. The watch page already makes this request for the
  sibling list, so the feature adds no round trip and no new endpoint.
- `app/watch/[showName]/[...path]/page.js` — `intro` + `skipLeft` state,
  `introDone` ref, `applySkip()`, and a 1s countdown effect. The countdown IS
  the state, so a re-render cannot orphan a timer and leave the button stuck.
- `app/globals.css` — `.skip-intro` / `.skip-intro-count`, same bottom-right
  corner and float-card colours as `.next-up`. The two never collide: one lives
  in the first minute, the other in the last ten seconds.

Behaviour:

- playhead enters `[start, end)` → button appears, counts 3 → 1
- pressed → seeks to `end` immediately
- ignored → `applySkip()` fires at zero
- `applySkip` only moves the playhead if it is still before `end`, so a scrub
  out of the titles while the button is up is not undone
- once per episode (`introDone`), so a deliberate rewind into the intro is not
  hijacked; resuming past `end` never offers it
- scrubbing back before `introStart` withdraws the offer

Backups of the three edited files: `.claude/backups/skip-intro-20261011/`.

## Verified

`next build` clean, `shows-app` restarted (needs `sudo -n systemctl restart`,
the unprivileged call fails with "Interactive authentication required").

    /api/episodes/<Avatar>/Season 01  -> intro {start:0,end:50}, 20 eps
    /api/episodes/<Avatar>/Season 02  -> intro null, 20 eps
    /api/episodes/1899/Season 01      -> intro null, 8 eps, 8 titles
    /api/episodes/One Piece           -> intro null, 19 eps

So the new field is additive: every show without the keys answers `null` and
renders exactly as before. Watch page returns 200, the built client chunk
contains "Skip Intro", and the CSS bundle contains `.skip-intro`.

Not verified in a browser — there is no headless browser on the Pi, so the 3s
countdown and the seek were checked by reading the code path, not by watching
an episode. Worth one real play of S01E01 to confirm the feel.
