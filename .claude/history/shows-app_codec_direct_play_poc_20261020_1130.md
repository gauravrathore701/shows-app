# Codec direct-play POC (2026-10-20 11:30)
Question: can browsers direct-play HEVC/AV1/Opus/EAC3 so we skip the H.264 re-encode?
- POC: .claude/tools/codec-poc/{server.cjs,index.html}, unit codec-poc (RuntimeMaxSec=2d), LAN http://192.168.1.15:4190
- Serves 6 raw samples (byte ranges, no transcode): Avatar h264/aac mp4, 1899 h264/eac3, Raakh hevc8/eac3,
  The Boys hevc10/aac, Dororo hevc10/opus, GWH av1-10/opus (original, prefers .hevc-originals).
- Page per sample: MediaSource.isTypeSupported (mp4/webm), mediaCapabilities.decodingInfo (smooth / powerEfficient=hardware),
  canPlayType mkv, plus an 8s real play: decoded/dropped frames + webkitAudioDecodedByteCount.
- Prod video-server.js untouched. Integration plan pending Gaurav's phone results.

## Results 11:26 — Poco X4 Pro, Chrome 155 Android (results.jsonl)
- HEVC 10-bit (Boys, Dororo, Avatar original*): NO video (0 frames), audio ok. isTypeSupported/decodingInfo agree.
- HEVC 8-bit (Raakh): video ok, hardware, 0 dropped.
- H.264 (1899): ok. AV1 10-bit (GWH): ok, software, 8/182 dropped.
- Audio: AAC/Opus ok; EAC3 no audio (0 bytes) — AC3 untested, assume same.
- MKV container plays fine (canPlayType "maybe", real play ok).
- *Avatar sample resolved to .hevc-originals (HEVC10) because of original-first lookup — not the h264 baseline.
- API answers matched real playback in all 6 → isTypeSupported + decodingInfo is a reliable gate.
Library (878): direct now 264; +59 hevc8/aac newly direct; 78 audio-only (ac3/eac3); 476 hevc10 still need video encode for the Poco.

## 11:40 built both (Gaurav: "both")
- video-server.js: probe adds vprofile/vlevel to codec.json; raw path skips legacy transcode on ?direct=1. Backup video-server.js.bak-20261020.
- watch page: browserCanDecode() builds RFC 6381 string, MediaSource.isTypeSupported(video+audio, mp4 box); yes → raw ?direct=1,
  fallback to HLS on <video> error or videoWidth 0. Backup backups/page.js.bak-20261020. next build + restart shows-video/shows-app.
- convert_h264.sh: vok = h264 8b | hevc 8b | av1; aok += opus; hevc copy gets -tag:v hvc1. Backup .bak-20261020b. Swapped via mv (running job safe).
- queue-poco.txt: 554 files (78 audio-only first, then 476 video, smallest first). NOT started — waiting on Gaurav.
- GWH done 11:39: h264 + aac + 2 mov_text, 7593s, 5.9G (orig 2.4G in .hevc-originals). Watcher stopped queue at Me Before You upload.
