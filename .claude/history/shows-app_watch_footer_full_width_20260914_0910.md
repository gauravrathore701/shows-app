# Watch page footer full width (2026-09-14 09:10)

- Asked: Shows only — footer full width, aligned with episode title and Next button.
- app/globals.css: `body:has(.watch-page) .site-footer-inner { max-width:none; padding 0 2rem }`
  (1rem on ≤640px, matching .watch-info). Library/show/season pages keep the 1200px column.
- Backup: backups/footer-width-20260914/globals.css. next build + restart shows-app.
- Verified (CDP 1880 wide, S01E06): title left 32 = © left 32; Next right 1833 = links/credit right 1833.
