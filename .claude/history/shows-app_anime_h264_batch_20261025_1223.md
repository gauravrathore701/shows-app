# Anime HEVC-10bit -> H.264 batch (56 files) - 2026-10-25

## What
Re-encoded Your Lie in April (22), Anohana (11), Given (10), Given The Movie,
The Promised Neverland (12) from HEVC 10-bit to 8-bit H.264 MKV so browsers
direct-play them (codec.json -> "hls":false). Same filenames, so watch-progress
keys and links are kept.

## Why
HEVC 10-bit does not decode in Chrome/Android; these files were going through
HLS transcode on the Pi. The player is getting audio/subtitle switching, so all
useful tracks are kept instead of flattening to one.

## How
- Driver: `.claude/tools/anime_h264_batch.sh` (resumable, flock-guarded),
  manifest `.claude/tools/anime_h264_manifest.txt` (PC path|Pi path, matched
  by episode number, durations identical to the ms), state file
  `anime_h264_done.txt`, log `anime_h264_batch.log` (24h timestamps).
- Encodes on the Nitro straight from the originals on `E:\Anime\...` (no
  upload), output `D:\Claudy Rex Work Directory\render\anime\out.mkv`, scp back
  to `/mnt/hdd/Copy To Pi/anime_h264_tmp/`, verify, swap. Library original is
  moved to `/mnt/hdd/Copy To Pi/anime_orig/<Show>/<name>` (backup, not deleted).
- Before encoding, the PC source's audio+subtitle language layout is compared
  with the Pi copy (the plan overrides language tags, so a mismatch would
  otherwise go unnoticed).
- Verify: duration +-1 s, single h264 yuv420p video, audio = aac jpn[,eng] with
  a:0 default, subtitle count = original text-sub count, a:0 audio runs to the end.
- Run detached: `systemd-run --user --unit=anime-h264 --property=Restart=on-failure
  --property=RestartSec=60 anime_h264_batch.sh` (exits 0 when done or when the PC
  is powered off / unreachable 3x - rerun the same command to resume).

## Output layout (contract for player track switching)
- v: libx264 veryfast crf21 yuv420p; mjpeg cover-art streams dropped
- a: Japanese first + default, then English dub; commentary dropped
  (YLiA 01, 22; Anohana 11); aac 2ch 192k, titles "Japanese"/"English"
- s: all ASS copied. YLiA + Anohana: s0 "English (Signs/Songs)", s1 "English
  (Full)" default. Both shows had s1 tagged jpn but the text is English (YLiA
  checked: s1 = s0 + 287 "Default" English dialogue lines) - retagged eng.
  TPN: Signs/Songs, English (default), Spanish, Portuguese. Given: "English" default.
- t: font attachments copied.

## Test
Given 01: 113 s end to end, 143 MB, codec.json
`{"hls":false,"vcodec":"h264","pixFmt":"yuv420p","acodec":"aac",...}`.

## Fix 13:37 - loop stopped after 2 files
First detached run ended "ok=2 still-pending=53": the `ssh 'echo ok'` probe in
pc_up() ran outside the `do_one < /dev/null` redirect and read the rest of the
manifest from stdin. Fixed: manifest read on fd 3 (`read -u 3 ... done 3< "$MAN"`),
`ssh -n` everywhere, scp / wol_pc.sh / pc_up given `< /dev/null`. Relaunched
13:37; YLiA 03 and 04 then logged OK, so the loop continues past file 2.
