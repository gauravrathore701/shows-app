# Bigger HLS buffer + HEVC → H.264 conversion (Avatar S1)

- hls.js: maxBufferLength 300→1500, maxMax 600→1800, maxBufferSize 200→400 MB (MSE quota may cap lower).
- video-server probeCache keyed by path+mtime → re-encoded files get re-probed, play direct.
- `.claude/tools/convert_h264.sh FILE...`: libx264 veryfast crf21 yuv420p, audio/subs copied, faststart;
  checks duration ±2s, moves original to /mnt/hdd/.hevc-originals/<same path>, puts H.264 at same name.
  Skips files already h264/yuv420p. Tested on a 10s clip.
- Running as user unit `avatar-s1-h264` (E20 first, then E01–E19). ~13 min/episode, ~4.5 h total.
  Log: `journalctl --user -u avatar-s1-h264`.
- 22:49: live HLS seg took 8.5s/6s while converter ran (nice ignored across slices) → set CPUQuota=120% on avatar-s1-h264, seg back to 2.9s. Converter now ~35 min/ep, done ~09:00.
