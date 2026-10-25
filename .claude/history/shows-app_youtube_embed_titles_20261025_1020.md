# YouTube-backed titles — Devdas (2002) — 2026-10-25 10:20

Gaurav wanted Devdas (2002) in the library as a normal movie card, played
from YouTube (https://youtu.be/XG9U_elK3Cw — official Eros Universe upload,
3h03m, playable_in_embed=True).

- `/mnt/hdd/Devdas (2002)/metadata.txt` only (no video): movie-bollywood,
  tmdb movie/15917 poster 4IJObbE9c3rO0bZxMwMtt5n9g2n.jpg, `youtube=XG9U_elK3Cw`.
- `app/page.js` parses `youtube=` (strict 11-char id regex).
- `ShowsBrowser.js` — cardHref → `/yt/<name>` when youtube set; meta line
  "▶ YouTube" instead of "0 episodes".
- New `app/yt/[showName]/page.js` — server component, reads metadata,
  path-traversal guard, 16:9 youtube-nocookie iframe + "Open on YouTube ↗".
- `globals.css` — `.yt-frame`, `.yt-open`.

Chose embed + fallback link over pure redirect (stays in-app, same nav;
link covers the YouTube-app/casting case). Checked: Devdas page renders
embed; `/yt/..%2Fetc` and `/yt/Troy (2004)` hit 404 boundary (Next returns
HTTP 200 for streamed notFound — check body, not status). Screens:
.claude/screens/devdas_*.png. HOW_TO_ADD_MEDIA.txt section appended.
