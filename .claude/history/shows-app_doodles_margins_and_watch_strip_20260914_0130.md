# Shows — doodles in the side margins + watch-page strip (2026-09-14 01:30)

## Asked (2 screenshots, red boxes)
1. Library: left and right empty margins outside the content column.
2. Watch page: the empty gap in the info bar between the episode title/buttons and Next.

## Shared script changes (homepage-cursedshrine/public/doodles.js, served at cursedshrine.com)
- New opt-in `data-anchor="<selector>"` on the script tag: margins = outside that element's
  left/right edges (instead of 22%/81% creases + 52rem column). If the element isn't on the
  page (e.g. SPA navigation to the watch page) the margin doodles hide.
- New `[data-doodle-slot]`: any such element gets 3–5 doodles (mostly the cute set), sized to
  ~78% of its height (max 72px), spread evenly across its width; filled when it appears.
- MutationObserver re-runs fill + layout on DOM changes (Next.js client navigation).
- Default behaviour (homepage, blog, games) unchanged — regression check: 7/7 inside margins.
- Backups: homepage-cursedshrine/.claude/backups/{doodles.js,gen.mjs}.bak-20260914-0105;
  gen.mjs updated in step.

## Shows changes
- `app/layout.js`: `<Script src="https://cursedshrine.com/doodles.js?v=20260914b"
  strategy="afterInteractive" data-anchor=".page" />`.
- Watch page: `<div className="watch-doodles" data-doodle-slot aria-hidden="true" />` between
  `.watch-info-main` and the Next button.
- `app/globals.css`: `.watch-doodles { flex:1; align-self:stretch; min-height:84px }`;
  hidden on ≤640px and in the charcoal theme.
- Backups: `backups/doodles-20260914/` (layout.js, globals.css, watch page.js). Build + restart.

## Verified (CDP, 1880 wide, dummy token)
- Library: 7 margin doodles, all x<325 or x>1541 with .page at 333–1533.
- SPA library → show → season → episode: margin box hidden on the watch page; strip
  (434–1720 wide) holds 5 doodles evenly spaced, clear of the buttons and Next.
- Note: on long pages the 5–7 margin doodles spread over the full page height, so only a
  couple are visible per screen.
