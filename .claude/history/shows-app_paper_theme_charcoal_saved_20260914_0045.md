# Shows — paper theme like blog/homepage, charcoal palette saved (2026-09-14 00:45)

## Asked
- Make the Shows theme match the blog + cursedshrine.com; save the current colour palette
  for a possible redesign later.

## Saved (charcoal)
- Full pre-change copies: `backups/theme-charcoal-20260914/{globals.css,layout.js}`.
- Palette reference with role → variable → charcoal hex → paper hex:
  `.claude/themes/shows-charcoal-palette.md`.
- Charcoal is still in the code as `html[data-theme="charcoal"] { … }` in app/globals.css.
  Restore = add `data-theme="charcoal"` to `<html>` in app/layout.js, build, restart.
  (A few elements map through `--accent`, so charcoal-by-attribute is close but not
  pixel-identical to the original; the backup CSS is exact.)

## Changed
- `app/globals.css`: every colour now a CSS variable (~40 roles). `:root` = paper tokens
  (bg #e8dfc9, surface #ddd2b7, ink #2b2723, accent #6b4a2f, line #cbbd9e …). Paper-only
  body texture (edge creases, grain, vignette; no middle crease). Active tab, "last watched"
  badge, Next button, progress fill, sign-in button → sepia accent. Page-title highlight
  `--heading-span`. Nav logo mark darkened with a filter on paper. Video letterbox stays black.
- Fixed bottom-right `.dev-credit` overlay (it sat on the video controls) replaced by an
  in-flow `.site-footer`: © year · built on a Raspberry Pi, Home/Portfolio/Blog, right-aligned
  "developed and managed by Gaurav Rathore" + "With the help of Claudy Rex (AI Assistant)".
- `app/layout.js`: footer markup + theme comment.
- No doodles: Shows pages are full-width grids/video, so there is no free margin.
- `npm run build`, `systemctl restart shows-app`.

## Verified (headless Chrome via CDP, dummy token)
- Library 1440 + 393, show episode list, seasonal show (season cards), watch page (black
  player, paper nav/info bar, Logout pill), sign-in modal (logged out). Footer renders.
