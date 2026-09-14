# Watch page — Next moved to info bar, Logout is text (2026-09-14 00:15)

## Asked (screenshot with 2 red boxes)
1. Remove the Next button from the top-right of the nav (box 1).
2. Put it in the info bar under the video, right side (box 2).
3. Fix the logout button there (it overlapped the Next button) and show "Logout" text instead of the ⏻ icon.

## Changed
- `app/watch/[showName]/[...path]/page.js`: `{nextEpButton}` removed from `<nav>`, rendered
  as the last child of `.watch-info`; title/show/nav links wrapped in `.watch-info-main`.
- `app/components/AuthGate.js`: logout button text "Logout" (was ⏻), `type="button"`.
- `app/globals.css`:
  - `.watch-info` is now flex, space-between (info left, Next right); wraps on ≤640px.
  - `.next-ep-button` restyled as a regular button (bigger padding, border, hover).
  - `.logout-btn`: pill with text; `position: absolute` (was fixed — it floated over the
    video when scrolling and sat on top of the Next button); `.nav { padding-right: 7.5rem }`
    so breadcrumbs never run under it.
- `npm run build`, `systemctl restart shows-app`.

## Backups
- `backups/ui-next-logout-20260914/` (globals.css, AuthGate.js, watch page.js)

## Verified
- Headless Chrome via CDP with a dummy future-exp token in localStorage (AuthGate only checks
  exp client-side): desktop 1440 — "Logout" pill top-right, nav clear, Next at the right of
  the info bar; mobile — Next wraps under the Library/All Episodes buttons.
- Note: an old `.next-ep-button:hover` rule from the vidstack era still exists further down
  globals.css (only changes hover text colour); left in place.
