# HLS buffering: every frame was a keyframe

`-force_key_frames expr:gte(t,0)` is true for every frame → 143/143 I-frames per 6s segment
→ 3.7–6 MB segments (~5–8 Mbps) for 1.4 Mbps HEVC sources. Buffered over the tunnel/mobile.
Fix: `expr:eq(n,0)` (keyframe on first frame only; each segment is its own ffmpeg run so still
independently decodable). Segments now 0.8–1.6 MB, 1 I-frame. Encode time unchanged (~2–3 s per 6 s on Pi 5).
Tested `-hwaccel drm`: byte-identical output, no real HW decode → not used.
