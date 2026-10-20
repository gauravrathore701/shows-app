# H.264 conversion queue failed overnight (2026-10-20 10:45)
- GWH encode: ssh to Nitro timed out 22:55 → FAIL encode, original untouched.
- batch1 (249 files) started 22:56, every file FAIL in ~4 min: scp "dest open D:/render/h264/in.mp4: Failure"
  (likely orphan ffmpeg on PC still holding in.mp4), then PC off. 0 converted, no originals moved.
- Fix: convert_h264.sh stops after 3 consecutive encode fails (backup convert_h264.sh.bak-20261020).
- Nitro unreachable at 10:44; requeue pending Gaurav.

## 10:49 requeued
- Nitro up, AC standby=never, no stray ffmpeg. Cable link parked at 10 Mb/s (1.1 MB/s) → switched to WiFi 192.168.1.29 (13 up / 9 down MB/s).
- convert_h264.sh KEY += ServerAliveInterval=30, HostKeyAlias=192.168.50.2.
- Unit library-h264-batch1b, PC=GAURAV@192.168.1.29, queue-batch1b.txt = GWH + 249 batch1 files.

## 10:58 GWH only (Gaurav: no batches)
- gwh-notify2 unit (gwh_notify.sh) waits for GWH done/FAIL in library-h264-batch1b, stops the queue, posts ffprobe result to projects Discord channel.
