# Shows App — Suggestion Point Sorting + In-Memory Cache

**Date:** 2026-07-01 23:15

## What changed

`app/page.js`:
- Added module-level in-memory cache (`_cache`, `_cacheAt`, `CACHE_TTL=5min`)
- Split `getShows()` into `loadShows()` (disk read) + `getShows()` (cache wrapper)
- Parsed `suggestionPoint` from metadata.txt in `loadShows()`
- Sort order: `suggestionPoint DESC` then alphabetical as tiebreaker

## Cache behaviour
- First request reads all metadata files from disk
- Subsequent requests within 5 minutes return cached result
- Cache invalidates automatically after 5 min (process restart also clears it)

## Result order (descending SP)
Raakh(6) → Aamis(5) → Maharaj(4) → Hellsing Ultimate(3) → Fences(2) → rest alphabetically(1)
