# Watch-page title, logout position, disk fault — 2026-09-06 18:05

## 1. Why Ben 10 S02E01 would not play — NOT an app bug
The USB drive dropped off the bus and reset. dmesg:

    15:52:56 device offline error, dev sda,
             sector 897849488 op READ
    15:52:58 Buffer I/O error on dev sda1
    15:52:58 JBD2: I/O error when updating
             journal superblock for sda1-8
    15:52:58 sd 0:0:0:0: [sda] Synchronize
             Cache(10) failed
    15:52:58 usb 4-1: reset SuperSpeed USB
             device number 2 using xhci-hcd

shows-video logged the consequence at the same second:
    [ffmpeg hevc] Error opening input:
      Input/output error
    FFmpeg exited with code 251 — retrying in 5s
That retry line is the service handling it correctly.

The file itself is fine. After the reset:
    dd full read  174,310,685 bytes at 4.2 GB/s
    ffmpeg -ss 60 -t 2 decode  clean
    mount still rw, no read-only remount

This has now happened TWICE today: 13:57:10 and 15:52:56,
both "device offline error" then a SuperSpeed reset. A
one-off is a glitch; twice in two hours on the same
enclosure is a pattern worth watching. Likely causes in
order: USB power/cable, the enclosure's bridge chip
overheating, or UAS quirks. Not investigated further —
Gaurav has not asked, and nothing is currently failing.

## 2. Episode title on the watch page
The header showed the raw filename ("Ben 10 S02E01").
The watch page is a client component so it cannot read
episodes.txt itself.

Rather than add a request, the title now rides along on
the /api/episodes call the next-episode feature ALREADY
makes:
    app/api/episodes/[...path]/route.js
      + readTitles(dir), returns { episodes, titles }

    app/watch/[showName]/[...path]/page.js
      epFile  = filename minus extension (unchanged use)
      epNum   = SxxEyy, else last number in the name
      epName  = "Episode 01 - Truth" once the fetch lands
      epTitle = epName || epFile

Falls back to the filename while the request is in flight
and if no title exists, so the header is never empty.
setEpName(null) on navigation, otherwise the previous
episode's title lingers through the next one's load.

One subtle fix alongside it: isMovie compared epTitle to
the folder name. With epTitle now resolving to a real
title, that test would have broken for movies — it now
compares epFile.

## 3. Logout button moved
app/globals.css .logout-btn
    bottom: 1.5rem  ->  top: 1rem
Right offset unchanged at 1.5rem.

## Verified
    npm run build  Compiled successfully in 4.2s
    restart 18:04, shows-app/proxy/video all active
    /api/episodes/Ben 10 (2005)/Season 02
      13 episodes, titles['01'] = "Truth"
    /api/episodes/One Piece
      17 episodes, 1177 titles, ['1172'] resolves
    traversal probe ..%2F..%2Fetc -> 400 (still rejected)
    built CSS: logout-btn{position:fixed;top:1rem
    https://shows.cursedshrine.com  200

## Backups
    backups/api-episodes-route.js.bak-20260906
    backups/page.js.bak2-20260906
    backups/globals.css.bak4-20260906
