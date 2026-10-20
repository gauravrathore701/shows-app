# GWH buffering diagnosis (2026-10-20 14:35)
- Client: Windows browser via Cloudflare tunnel (conns from ::1/cloudflared); Nitro not on home WiFi → remote viewer.
- Served file = converted H.264/AAC (codec.json hls:false, only copy on disk; original deleted 11:46). Raw direct play, no transcode.
- Range reqs 5 MB each, back-to-back, 12–17 s apiece ≈ 2.5–3.4 Mbps delivered. File avg bitrate 6.24 Mbps (CRF 21) → buffer drains.
- Pi side fine: HDD 88 MB/s, local serve 66–84 MB/s, CPU 3 %, no HDD drops; tunnel hairpin from Pi ~35 Mbps.
- Old AV1 was ~2.5 Mbps (would have fit). Proposal: re-encode capped (-maxrate ~3M) and cap VENC for the queue. Not done yet.
- Note: my tunnel test curl (14:29–14:31, 641 MB) overlapped the 14:30 speed test → that sample (18/10 Mbps) is polluted.

## 15:50 no-audio report (watching via LAN tab 192.168.1.15:4180 that Claude opened in Brave at 14:36)
- File audio OK: AAC stereo default track, volumedetect -31 dB mean @600s/@4700s; headless Chromium decodes audio of GWH + Avatar.
- PC: default device Realtek, master vol 0.63, not muted, peak 0. Per-app sessions: brave state=0 (inactive), vol 1, not muted.
  → Brave renders no audio at all = tab/player muted (likely Brave autoplay on a tab opened without a click). Asked Gaurav to unmute.
- Correction: Nitro was home all along (Wi-Fi IP moved .29 → .30); the earlier "remote viewer" conclusion was wrong, buffering was over the tunnel from home.

## 16:00 real cause of "no audio at 1:18:41"
- Converted GWH audio track ends at 4714.86 s (1:18:34); video 7593 s. No packet gaps before that — audio simply stops. Player/Windows were fine.
- Verify step only compared container duration (= video) → passed. Avatar (61 files) scanned: all OK.
- Original was deleted 11:46 (Gaurav asked). PC D:/render/h264/in.mp4 is same size as the GWH original but its head was
  overwritten by the cut-off Me Before You upload (probes as hevc/aac 6614 s) → GWH data likely survives after the head; not touched.
- convert_h264.sh: new FAIL audio check (last audio pts within 5 s of source length). Backup .bak-20261020c. Tested: flags GWH.
