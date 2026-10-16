# Bigger HLS buffer + HEVC → H.264 conversion (Avatar S1)

- hls.js: maxBufferLength 300→1500, maxMax 600→1800, maxBufferSize 200→400 MB (MSE quota may cap lower).
- video-server probeCache keyed by path+mtime → re-encoded files get re-probed, play direct.
- `.claude/tools/convert_h264.sh FILE...`: libx264 veryfast crf21 yuv420p, audio/subs copied, faststart;
  checks duration ±2s, moves original to /mnt/hdd/.hevc-originals/<same path>, puts H.264 at same name.
  Skips files already h264/yuv420p. Tested on a 10s clip.
- Running as user unit `avatar-s1-h264` (E20 first, then E01–E19). ~13 min/episode, ~4.5 h total.
  Log: `journalctl --user -u avatar-s1-h264`.
