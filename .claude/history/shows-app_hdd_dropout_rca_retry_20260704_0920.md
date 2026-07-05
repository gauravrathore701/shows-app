# S01E02 "not playing" — RCA: USB HDD dropout (not a code bug)

**Date:** 2026-07-04 09:20

## RCA
- At 09:11:43 (exactly when playback was attempted) FFmpeg failed with
  `Error opening input: Input/output error` → video-server sent 500.
- Kernel log shows `/dev/sda` (the USB HDD behind /mnt/hdd) went **offline**
  at that moment: device offline errors → ext4 forced shutdown → USB reset →
  drive re-enumerated → ext4 auto-recovered ~4s later.
- This is recurring: 3 dropouts in ~23h (Jul 3 10:31 boot recovery, Jul 4 00:19, Jul 4 09:11).
- The transcoding pipeline itself is fine: E02 transcodes and streams valid
  H.264+AAC fMP4 through video-server (4179) and proxy (4180). File integrity
  confirmed — full 313MB read at 109 MB/s, no bad sectors.
- Pi reports `throttled=0x0` (no undervoltage on the Pi itself), so suspicion
  is the drive's own power/cable/enclosure, or USB autosuspend.

## Change
`video-server.js` — `serveTranscoded()` now retries FFmpeg **once after 5s**
if it exits without producing output (covers the drive's ~4s recovery window)
before sending 500. Service restarted, chain re-verified (`ftyp` header,
h264+aac via proxy 4180).

## Open hardware follow-ups (not done)
- Install `smartmontools` and check drive health (`smartctl -d sat -a /dev/sda`).
- If dropouts continue: try a different USB cable/port, or a powered USB hub.
- Consider disabling USB autosuspend for the enclosure.
