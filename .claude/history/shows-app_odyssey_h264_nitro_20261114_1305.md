# Odyssey (2026) → H.264 direct-play (Nitro encode)

- Cause of buffering: HEVC 10-bit + EAC3 5.1 → Poco can't direct-play → live HLS transcode on Pi too slow at 1080p.
- Ran `.claude/tools/convert_h264.sh` via `systemd-run --user --unit=odyssey-h264`, `PC=GAURAV@100.68.111.11` (Tailscale; WiFi 192.168.1.43 = no route).
- Created missing PC work dir `D:\Claudy Rex Work Directory\render\h264` (script assumes it exists).
- Result: h264 yuv420p + AAC stereo + 2x mov_text, 5163 s, 3.41G → 1.95G, 23 min (12:40–13:03).
- Original: `/mnt/hdd/.hevc-originals/The Odyssey (2026)/The Odyssey (2026).mkv`.
- Tracked by background agent + `hb-odyssey-h264` heartbeat → #claudy-logs every 5 min; final DONE posted 13:04.
- Note: new file mode `-rw----r-x` (scp); service runs as gaurav (owner) → readable.

## 13:30 follow-ups
- Library scan: 481 files / ~156 GB still non-direct-play (459 V = HEVC 10-bit, rest A = AC3/EAC3). List: /tmp/needconv.txt (temp).
- Given The Movie: swapped in the leftover 25 Oct H.264 encode from `Copy To Pi/anime_h264_tmp`; HEVC original → `/mnt/hdd/.hevc-originals/Given The Movie (2020)/`.
- Dune Part Two (AC3 → AAC, video copy) running on Nitro, unit `dune2-aac`, heartbeat `hb-dune2-aac`.
- Gaurav asked to empty `Copy To Pi`; recursive rm is blocked for Claude → gave him `find . -mindepth 1 -delete` to run.

## 13:40 Dune Part Two done (reviewed)
- AC3 5.1 → AAC 2ch, video copied; 9947.07 s both; 1.72G → 1.57G; 13:26–13:35 on Nitro.
- Original: `/mnt/hdd/.hevc-originals/Dune - Part Two (2024)/`.
- scp leaves `-rw----r-x` → chmod 644 on Dune + Odyssey new files.
- Copy To Pi emptied by Gaurav (HOW_TO_ADD_MEDIA.txt lost; newest backup `.claude/backups/HOW_TO_ADD_MEDIA.txt.bak-20261025-subs`, 25 Oct 10:16).

## 13:45 originals deleted (Gaurav asked)
- Deleted the 3 originals in `/mnt/hdd/.hevc-originals/` (Odyssey 3.66G, Dune 2 1.72G, Given Movie 0.28G) + their empty dirs, after re-checking each library copy is h264 yuv420p. `.hevc-originals/` now empty. Disk 162G free.

## 14:35 Odyssey was a fake → replaced with Nolan's (Gaurav asked)
- Old file (5163 s, 86 min) = The Asylum mockbuster (dir. Marcel Walz), mislabelled as TMDB 1368337 (Nolan, 173 min).
- Copied `E:\Copy To Pi\The Odyssey 2026 1080p BluRay HEVC x265 5.1 BONE.mkv` from Nitro (Tailscale scp, ~8 min) → verified 4470387000 B, 10355.69 s, hevc yuv420p (8-bit) + aac 5.1, audio to 10355.65 s, 4 SRT.
- Deleted the fake (Gaurav asked), moved new file to `/mnt/hdd/The Odyssey (2026)/The Odyssey (2026).mkv`, chmod 644. No conversion: HEVC 8-bit + AAC = direct-play on Poco.
- Bug fixed: `video-server.js` `durationCache` was keyed by path only → swapped-in file kept old length (seek math wrong). Now keyed path+mtime like probeCache. Backup `video-server.js.bak-20261114`. Restarted shows-video 14:33.

## 15:40 Ben 10 (2005) S02–S04 converted (reviewed)
- 39/39 h264 yuv420p, every duration = original ±2 s, 0 fail, 13:46–15:35 on Nitro. Audio Opus copied (script treats Opus as OK; server BROWSER_AUDIO lacks opus → HLS with video copy + audio→AAC, light).
- 7.02G → 12.81G. Originals (39, 7.02G) at `/mnt/hdd/.hevc-originals/Ben 10 (2005)/`.
- chmod 644 on the 39; `convert_h264.sh` now chmods 644 after swap (backup `.bak-20261114`).
- Daily task "Convert Ben 10 (2005) (V)" ticked.

## 18:13 Ben 10 (2005) originals deleted (Gaurav asked)
- 39 HEVC originals (7.02G) removed by exact name after re-checking each library copy is h264 yuv420p; empty dirs rmdir'd. `.hevc-originals/` empty.

## 18:50 Dororo partial (reviewed)
- Eps 01–12 → h264 yuv420p, 2 Opus copied, ASS→mov_text, 644; originals (12) in `.hevc-originals/Dororo/`. 2334M→2602M.
- Eps 13–24 still HEVC 10-bit: ep13+ ASS has a 71 KB event (typesetting drawing) > mov_text 64 KB → ffmpeg 'Result too large'; script stops after 3 fails. Needs script fix (drop oversized ASS events) — awaiting Gaurav.

## 20:53 convert_h264.sh: oversized ASS event fix
- Before encode: if any sub packet >60000 B → stream-copy temp `.<name>.subfix.mkv` with ASS lines ≥60000 chars dropped (awk), encode that; temps removed after. Backup `convert_h264.sh.bak-20261114-subs`.
- Tested ep13: dropped 13 lines/stream, all 'Dororo Logo' vector drawings (01:39–01:43); 698 dialogue kept; max packet 57507; mov_text OK.
- Rerun eps 13–24: unit `dororo2`, heartbeat `hb-dororo2`.

## 21:28 Dororo complete (reviewed)
- Eps 13–24 done with subs fix, 20:53–21:27, 0 fail. All 24 eps: h264 yuv420p, 2 Opus, 2 mov_text, duration = original, 644. No dot-file leftovers.
- 24 originals in `.hevc-originals/Dororo/`. Heartbeat hb-dororo2 stopped by hand (agent's final line began '21:27 DONE' → heartbeat only stops on a line starting DONE).
- Task 'Convert Dororo (V)' ticked.

## 22:41 Dororo originals deleted (Gaurav asked)
- 24 HEVC originals removed by exact name after re-checking each library copy is h264 yuv420p; dir rmdir'd. `.hevc-originals/` empty.

## 23:05 Weathering with You converted (reviewed)
- h264 10-bit → 8-bit, AAC+Opus copied, 2 ASS→mov_text (no oversized events), 6733.83 s matches; 1.29G→1.26G; 22:47–22:59 on Nitro.
- Original in `.hevc-originals/Weathering with You (2019)/`. Task ticked.

## 00:54 2026-11-15 video-server: pace whole-file (no-Range) responses
- Cause of Odyssey startup buffering: Chrome's first request had no Range → 200 whole-file stream; browser moved on to range requests but cloudflared kept pulling the dead stream at ~96 Mbit/s for 3.5 min (2.5 GB), starving Pi uplink (~73 Mbit/s) → stalls 00:39–00:43.
- Fix: no-Range path now pipes through a pacing Transform: first CHUNK (5 MB) free, then 2x file avg bitrate (fallback 2 MB/s). Range path unchanged. Backup `video-server.js.bak-20261115`.
- First try (pause/resume on data) didn't throttle — pipe resumes on drain; Transform with delayed callback works.
- Test: no-Range 10 s → 13.7 MB (was full 4.47 GB); Range 0- → 206 5 MB in 19 ms. Restarted shows-video + shows-app.
