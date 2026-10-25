# Library intake: Dev.D (2009) — 2026-10-25 09:50

Pulled from the PC (`E:\Copy To Pi\Dev.D.2009.BRRip.1080p.mkv`) over the
direct cable (192.168.50.2), scp into `/mnt/hdd/Copy To Pi`, 1.93 GB in
2m47s, size matched 1929740073 bytes. Then `mv -n` into the library.

- `/mnt/hdd/Dev.D (2009)/Dev.D (2009).mkv` + `metadata.txt`
- type=movie-bollywood, tmdb movie/15977 (title verified with `?language=en-US`)
- poster krqfEEpvK31en2s7GpyGPmYt8r3.jpg, 200, checked by eye
- addedDate=2026-10-25, suggestionPoint=0, chmod 777

Codec: h264 High@4.1 yuv420p 1920x816, audio HE-AAC 5.1 (hin), 2h23m.
`codec.json` → `hls:false` = direct play, no transcode.

Verified after `systemctl restart shows-app`: home 200 with card present,
watch page 200, stream Range 206.

Source file on the PC was left in place.
