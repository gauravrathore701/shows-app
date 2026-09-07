# Season cards redesigned — 2026-09-06 14:15

## Problem
The seasons page reused .show-card / .show-thumb, which is
a 2:3 poster box. Seasons almost never have art
(heroImage comes from an optional metadata.txt line), so
every card rendered a large empty 2:3 rectangle with a
lone 📺 emoji floating in it. Four of those side by side
read as broken, not minimal.

## Change
New markup + CSS specific to seasons. Poster shape
dropped.

    .season-grid  minmax(240px, 1fr), 1rem gap
    .season-card  16/9 art area + text body
    .season-art   diagonal charcoal gradient
    .season-num   the season number as the artwork:
                  outlined numeral, -webkit-text-stroke,
                  transparent fill, brightens on hover
    .season-body  name + episode count

heroImage support is kept — if a season has one it fills
the 16/9 area with objectFit: cover and the numeral is not
rendered.

Season 00 is the specials folder, so it now shows "SP" as
the numeral and "Specials" as the title instead of
"Season 00".

Mobile: grid drops to minmax(150px, 1fr).

## Why 16/9 rather than a poster
Nothing here is a poster. A wide tile matches what a
season actually is — a container of episodes — and it
removes the tall empty space that caused the complaint.

## Files
    app/show/[showName]/page.js   seasons block rewritten
    app/globals.css               ~70 lines appended
    backups/show-page.js.bak-20260906
    backups/globals.css.bak3-20260906

## Verified
    npm run build -> Compiled successfully in 3.1s
    restarted shows-app 14:15
    /show/Ben 10 (2005) served markup:
      4 x season-card, 4 x season-num, 1 x season-grid
      0 x show-card
    shows-app / proxy / video  all active
    https://shows.cursedshrine.com  200

The shows LIST page still uses .show-card — untouched,
posters are correct there.
