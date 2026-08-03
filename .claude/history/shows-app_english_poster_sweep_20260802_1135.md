# English-only poster sweep

**Date:** 2026-08-02 11:35 IST
**Trigger:** Gaurav: "change featured images of weathering with you and your name — do not
add image with hindi words for non indian shows or movies."

## Root cause

TMDB serves artwork based on the requesting IP. Scraping
`https://www.themoviedb.org/movie/<id>` from the Pi (Indian IP) returns the **Hindi**
poster when one exists. Silent failure — the URL is valid and the image renders, so it
only surfaces when someone looks at the card.

Same localisation hits `<title>`, which makes it a free detector:

```
movie/372058                   <title>आपका नाम (2016)</title>
movie/372058?language=en-US    <title>Your Name. (2016)</title>
```

Fix is `?language=en-US` on the scrape. Now documented as mandatory in
`HOW_TO_ADD_MEDIA.txt` STEP 3.

## Replaced

| Show | old hash | new hash |
|---|---|---|
| `Your Name (2016)` | `9E045eVSf8gqPXwJqwVOChyhuQH` | `q719jXXEzOoYaps6babgKnONONX` |
| `Weathering with You (2019)` | `tJaPsUs2WLAKFoReBxuGiwqla1i` | `qgrk7r1fV4IjuoeiGS5HOhXNdLJ` |
| `One Piece` | `zGDhn834DojaLU7KkczgWWk75ET` | `uiIB9ctqZFbfRXXimtpmZb5dusi` |

One Piece was not in the request — found during the sweep. Its logo was drawn in
Devanagari. The replacement is the *same artwork* with the English logo, so the card
looks unchanged apart from the text.

Each replacement was downloaded and viewed before being written — not trusted on the
`image_language=en` filter alone.

## Sweep of the rest

Hash-compared default vs `?language=en-US` for the seven other titles added earlier
today (1899, Dororo, Children of Men, Dead Poets Society, Me Before You, Love
Untangled, The Garden of Words) — all **SAME**, so none were localised.

Then visually checked every remaining poster in the library by tiling them into
contact sheets with PIL (cheaper than opening 27 images individually). All English.

The three Indian titles — Raakh, Maharaj, Aamis — keep Hindi artwork; correct for them.

## Verification

```
shows-app.service                        active
rendered payload -> all 3 new hashes     present
3 poster URLs                            200
```

Only `metadata.txt` changed, so no rebuild — restart alone was enough to drop the
5-minute folder cache in `getShows()`.

## Docs

`HOW_TO_ADD_MEDIA.txt`: STEP 3 now mandates `?language=en-US`, states the no-Hindi-on-
non-Indian-titles rule, gives the `<title>` detector and the hash-diff check, and points
at `?image_language=en` for picking better English art. Appended a sweep log with the
reusable contact-sheet one-liner.
