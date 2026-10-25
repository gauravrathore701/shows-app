# Subtitles (CC menu) + audio-track switching (2026-10-25)

Why: embedded ASS subs never showed (native `<video>`, no `<track>`), and only
audio stream 0 ever played, so dual-audio anime ran the English dub with no subs.
Gaurav picked selectable subs + audio over burning subs in.

## Server (video-server.js + new video-tracks.js)
- `/<file>/tracks.json` -> `{ video, audio:[{i,lang,title,codec,default}], subs:[{i,lang,title,codec,default,forced,lines,latin}] }`.
  Text subs only (ass/ssa/subrip/webvtt/mov_text); PGS/dvdsub skipped. `i` = index among
  ALL subtitle streams, so `0:s:i` maps right even with a bitmap stream in between.
- `/<file>/subN.vtt` -> WebVTT. One ffmpeg pass extracts every text sub of a file into
  `~/.cache/shows-subs/<sha1(path)>-<mtime>/sN.vtt` (+ meta.json). Cleaned in node:
  ASS vector drawings (`m 0 0 l ...`), `{...}` comments and duplicated sign layers removed.
  `lines` (unique dialogue lines) and `latin` (latin-letter ratio) come from the cleaned text.
- `index.m3u8?audio=N` / `segK.ts?audio=N` (query carried on every segment URL):
  - H.264 8-bit video -> VIDEO COPY, audio `-map 0:a:N` (copied if AAC). Segments are
    cut on real keyframes (`ffprobe packet=pts_time,dts_time,flags`, cached in
    `~/.cache/shows-keyframes/`). ~0.2-0.9 s per segment, no re-encode.
  - anything else -> existing libx264 path with `-map 0:a:N`.
  - no `?audio` -> byte-identical old behaviour.
- `SHOWS_ROOT` / `SHOWS_VIDEO_PORT` env overrides (test instance only; unit sets neither).
- Next route `app/api/stream/[...path]/route.js` forwards tracks.json / subN.vtt and the query string (LAN :4178 path).

## Traps found (copy-mode segments)
- `-ss T` on a keyframe lands on the PREVIOUS one: fftools backs a B-frame seek off by
  3/23 s. Seek to `start+0.2` instead; boundaries need no other keyframe within 0.25 s.
- `-t` compares DTS: cutting at the next keyframe's PTS leaked its first 2 frames.
  Cut = next boundary DTS - ss.
- Segment 0 (no seek, negative B-frame DTS) got shifted +0.07 s by the muxer, others
  did not. Every segment now gets `-output_ts_offset ss+1` -> uniform +1 s base.
- `-copyts` + output `-ss/-to` produced garbage; don't.
- Verified: frames in concatenated segs 0-3 == source frames (664 == 664), playlist
  total == file duration (1374.04 s), concat decodes clean.

## Player (app/watch/[showName]/[...path]/page.js, globals.css)
- `<track kind="subtitles">` per text sub; modes set in JS, re-applied on every
  loadedmetadata (audio switch swaps the source under the same elements).
- CC + Audio buttons in the info bar (popover menus, mobile = full-width row).
  Rendered only when a file has text subs / 2+ audio streams -> single-track titles unchanged.
- Fullscreen: native track rendering + the browser's own captions menu; a textTracks
  `change` listener adopts whatever that menu picks.
- Default sub = `pickDefaultSub()`: drops signs/songs/forced (unless titled Full/Dialogue)
  and any track with < 60% of the busiest track's lines; accepts English by tag OR by
  content (jpn/und/zxx tag with latin >= 0.9); ranks default +4, Full/Dialogue +3, eng +2,
  dub/sdh/commentary -3. jpn-tagged latin subs are labelled English.
- Remembered per show in localStorage: `shows_subs:<show>` ({lang,title} | {off:true}),
  `shows_audio:<show>` ({lang,title}; restored by lang+title, else lang).
- Audio switch: keeps position via the resume path (resumeAt), `switching` ref blocks
  progress saves until the seek lands (otherwise the reload's 0:00 overwrote progress),
  restores paused state.

## Real-world defaults (all correct)
- YLiA originals: s0 eng forced/def = signs, s1 jpn untitled = full English -> s1.
- Anohana originals: s1 jpn "Full Subtitles" -> s1. Converted YLiA/Given/TPN -> marked default track.
- Dororo: "Signs/Songs" (zxx, default) vs "Dialogue" -> Dialogue. Audio eng first, opus.
- Cowboy Bebop: Signs(def) / Full Subs / Dubtitles + PGS commentary -> Full Subs; PGS hidden;
  3 audio (eng, jpn, jpn commentary) all titled vaguely ("Stereo") -> shown as "English · Stereo".
- Hellsing Ultimate ep1: h264+aac, one jpn audio, no subs -> no menus (as before).

## Verified
curl via :4180 (tracks.json, sub1.vtt 200 text/vtt, `?audio=1` playlist + segment
h264/aac eng), audio content correlation for HEVC `?audio=1` (0.90 vs jpn source, 0.36 vs eng),
headless Chromium: default track showing with active cue, audio switch kept 308 s and kept
playing, HEVC original switch kept position. Screens in `.claude/screens/subs_*`.

## Limits
- ASS styling/positioning/karaoke lost in VTT; typeset signs show as plain lines.
- Audio menu not reachable in native fullscreen (browser exposes no audio-track API); subs are.
- iOS Safari: native HLS + `<track>` should work but untested; iOS fullscreen uses its own captions UI.
- First tracks.json per file waits for sub extraction (~0.3-4 s cold); first `?audio`
  playlist on a copy-mode file waits for the keyframe scan (~4-6 s cold). Both cached.
- Old cache dirs (previous mtimes) are not pruned; small.

HOW_TO_ADD_MEDIA.txt appended (backup .claude/backups/HOW_TO_ADD_MEDIA.txt.bak-20261025-subs).
