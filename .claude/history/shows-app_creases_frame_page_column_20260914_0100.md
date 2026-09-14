# Shows — vertical creases moved to the page column edges (2026-09-14 01:00)

## Asked
- Screenshot: the faint vertical crease (at 22% width) ran through the search bar area;
  Gaurav drew where it should be — just left of the library content. Shows project only.

## Changed (`app/globals.css`, paper theme block only)
- Vertical crease layer now uses `--crease-l: max(6px, calc(50% - 600px))` and
  `--crease-r: min(calc(100% - 10px), calc(50% + 600px))` — the outer edges of the
  1200px `.page` column — instead of 22% / 81%.
- That layer uses `background-attachment: scroll` (others stay fixed) so it is measured
  against the body width like the centred column (no scrollbar offset).
- Horizontal crease, grain and vignette unchanged. Blog/homepage/games untouched.
- Pre-change copy: `backups/theme-charcoal-20260914/globals.paper-before-crease-move.css`.
- Build + restart shows-app.

## Verified
- Headless 1360 (page column 73–1273) and 1920 (353–1553): brightness scan finds the
  lines at x≈73/1273 and x≈353–355/1552–1555, matching the column edges.
