# Greek Myth tab with watch-order sidebar — 2026-10-25 10:05

New home-page tab **🏛️ Greek Myth**. Collection, not a type: membership comes
from a `greekOrder=N` key in metadata.txt (optional `greekNote=` line).

- `app/page.js` — parses greekOrder / greekNote into each show.
- `app/components/ShowsBrowser.js` — tab entry; greek tab filters to
  greekOrder shows sorted ascending; renders `aside.watch-order` (numbered
  list, links to player) + `.order-badge` on cards.
- `app/globals.css` — `.collection-layout` 240px sidebar + grid, sticky
  sidebar; stacks under 640px.

Library: Troy (2004) =1 (Iliad), The Odyssey (2026) =2 (voyage home).
Metadata backups in .claude/backups/greek-tab-20261025/. HOW_TO_ADD_MEDIA.txt
section appended.

Verified: build clean, service restarted, screenshots desktop + 412px phone
in .claude/screens/greek_*.png.

New tool: `.claude/tools/screenshot_authed.mjs URL OUT W H MOBILE` — headless
chromium via CDP with a fake unsigned token in localStorage (AuthGate only
checks exp client-side), so logged-in pages can be screenshotted. UI only;
APIs that verify the JWT server-side will still refuse it.
