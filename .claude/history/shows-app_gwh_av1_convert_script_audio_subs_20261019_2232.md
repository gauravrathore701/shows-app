# convert_h264.sh: audio + subs handling, Good Will Hunting started — 2026-10-19

- Script (backup convert_h264.sh.bak-20261019) now decides per file:
  video h264/yuv420p → `-c:v copy` (runs on the Pi even with PC set), else libx264 crf21;
  audio not aac/mp3 → AAC stereo 192k, else copy; text subs (subrip/ass/ssa/webvtt) → mov_text,
  image subs dropped; skips only when video AND audio are already direct-play. All audio tracks kept.
- Tested on 20s clips: AC3 file → audio-only re-encode + mov_text OK. AV1 clip hit the duration check
  only because a stream-copy cut let a subtitle cue overrun; full GWH subs end before video.
- PC ffmpeg has libdav1d (AV1), libx264, aac, mov_text.
- Unit `gwh-h264-pc` started 22:32 (PC encode). Log: `journalctl --user -u gwh-h264-pc`.
- Library scan (same rules as video-server.js): 614 of 878 files not direct-play — Adventure Time 364 hevc,
  Ben 10 family ~146, Cowboy Bebop 26, Dororo 24, The Boys 16, Rick and Morty 10, 1899 8 (eac3 only),
  Raakh 8, plus ~12 movies. Full queue NOT started — waiting on Gaurav (disk: originals kept).
- 22:33 per Gaurav: ALL jobs run on the Nitro when PC is set (removed the Pi-local exception for video-copy jobs). Always launch with --setenv=PC=GAURAV@192.168.50.2.
- 22:35 Gaurav chose B (whole library; originals deleted per batch only after he checks).
  Added low-disk guard (stop queue if free < 1.5x file + 20G). Queue files in .claude/tools/:
  queue-batch1.txt (249: movies + all shows except Adventure Time, ~109G src) and
  queue-batch2-adventure-time.txt (364, 65G — NOT started; needs batch-1 originals freed first).
  Unit library-h264-batch1 waits for gwh-h264-pc to end, then runs batch 1 on the Nitro.
  Not reboot-safe: after a power cut re-run the same command — done files are skipped.
