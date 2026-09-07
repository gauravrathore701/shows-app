# Auto-advance fired on load — guarded — 2026-09-06 19:40

## Symptom
Opening Ben 10 (2005)/Season 02/Ben 10 S02E01.mkv jumped
straight to S02E02 without playing.

## The stream itself is fine
    /api/stream/.../codec.json
      {"hls":true,"vcodec":"hevc",
       "pixFmt":"yuv420p10le","acodec":"opus"}
    index.m3u8   200, 230 segments
    playlist duration 1374.301s
    ffprobe source duration 1374.301s  (exact match)
    seg0.ts      200, 7,712,888 bytes in 5.2s
So the transcode, the playlist and the segments all work.

## Cause
onEnded() advanced unconditionally:

    function onEnded() {
      push(true);
      if (nextHref && !cancelled) goNext();
    }

On a transcoded HLS source `ended` is not trustworthy on
its own. A failed segment fetch — exactly what the USB
drive resets at 13:57 and 15:52 produced — or a source
that never loaded will emit `ended` with the playhead
still at zero. goNext() then marked the episode finished
and navigated. Because it also wrote finished=true, the
episode stayed "watched" afterwards, which is why it kept
looking skipped.

Resume was ruled out first: seekToResume() is already
guarded by mine.finished, position > 30s and
ratio < 0.95, so it cannot seek to the end.

## Fix
app/watch/[showName]/[...path]/page.js

    const END_SLACK_SEC = 15;

    function onEnded() {
      const v = video.current;
      const dur = v?.duration;
      const at = v?.currentTime ?? 0;
      const reallyEnded =
        canPlayed.current &&
        Number.isFinite(dur) && dur > 0 &&
        at >= dur - END_SLACK_SEC;
      if (!reallyEnded) return;
      push(true);
      if (nextHref && !cancelled) goNext();
    }

Three conditions, all cheap:
  - canPlayed.current — the media actually became playable
  - a finite, positive duration
  - the playhead within 15s of the end

15s of slack because some files stop a beat early; the
original code carried that comment as its whole reason for
trusting `ended`. A spurious ended at t=0 on a 1374s file
now fails the test instead of advancing.

Also tightened the countdown card: it now requires
currentTime > 0, so it cannot flash during the moments
where hls.js briefly reports a tiny duration.

## Verified
    npm run build  Compiled successfully in 6.6s
    restart 19:39, shows-app/proxy/video all active
    guard present in the client chunk
      page-e47f966f7b30e9cb.js
    https://shows.cursedshrine.com  200

## Note
This is a defensive fix, not a cure for the drive. If the
enclosure drops again mid-episode the segment fetch still
fails — but the player will now stall or error visibly
instead of silently skipping to the next episode and
marking the one you wanted as watched.

## Backup
    backups/page.js.bak3-20260906
