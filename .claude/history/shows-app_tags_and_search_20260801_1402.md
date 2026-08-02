# shows-app — tag metadata wired up + library search

**Date:** 2026-08-01 14:02 IST

## Ask

1. Write tags into each show folder's metadata.
2. Add search to the shows app.

## Finding

`tags=` was **already present in all 16** `/mnt/hdd/*/metadata.txt` files (curated genre/mood
terms, e.g. `Aamis (2019)` -> `drama,thriller,romance,arthouse,assamese,dark`). Nothing in the
app read them — `loadShows()` in `app/page.js` parsed only `type`, `heroImage`, `suggestionPoint`.

So item 1 needed no disk writes; the gap was purely app-side. Coverage confirmed 100% for every
non-skipped folder (`lost+found` and `Copy To Pi` are in `SKIP`).

Show names were deliberately **not** duplicated into `tags`. Search matches the folder name,
the type and the tags in one pass, so name lookup already works without polluting the tag chips
displayed on each card.

## Changes

### `app/page.js`
- Parse `tags=` from `metadata.txt` — comma-split, trimmed, lowercased, empties dropped.
- Added `tags` to the object returned by `loadShows()`.
- Page reduced to a thin server wrapper: loads shows (5-min in-memory cache unchanged), renders
  nav + heading, delegates the grid to the new client component.
- Removed the server-side tab filter and the inline grid markup; dropped now-unused `Link` and
  `Image` imports.
- Reads `?q=` alongside `?tab=` so both are shareable as URLs on first load.

### `app/components/ShowsBrowser.js` (new, client component)
- Holds `tab` + `query` state, seeded from `initialTab` / `initialQuery` props.
- Builds a per-show search haystack of `name + type + tags`, lowercased with `-`/`_` flattened to
  spaces — so typing `dark comedy` matches the tag `dark-comedy`.
- Multi-token AND: query splits on whitespace, every token must appear in the haystack.
- Tab filter and text filter compose (tab narrows first, then query).
- Result count line while searching; distinct empty state for "no match" vs "empty category".
- Up to 3 tag chips per card. Clicking a chip sets the query to that tag —
  `preventDefault()` + `stopPropagation()` stop the wrapping `<Link>` from navigating.
- Tabs are now `<button>` with client state instead of `<Link href="/?tab=…">` — no full page
  reload when switching category.

### `app/globals.css`
- `.search-bar` / `.search-icon` / `.search-input` / `.search-clear` / `.search-count` — pill
  input matching the existing charcoal theme, border brightens on `:focus-within`.
- `.show-tags` / `.show-tag` — small rounded chips, hover lightens.
- `.tab` gained `cursor: pointer` and `font-family: inherit` (was an `<a>`, now a `<button>`).

## Verification

- `npm run build` — clean, no warnings. `/` route 1.64 kB, 113 kB first load.
- `sudo systemctl restart shows-app.service` -> `active`, `GET /` -> `200`.
- Tags confirmed in the RSC flight payload:
  `tags\":[\"animation\",\"adventure\",\"fantasy\",\"comedy\",\"series\",\"cartoon\"`

Note: the home page markup does not appear in raw `curl` output. `AuthGate` in `app/layout.js` is
a client component, and `ShowsBrowser` is now client-side too, so the DOM is produced after the
client-side auth check. This is existing behaviour, not a regression — the server data reaches the
client in the flight payload as shown above.

## Restart scope

Only `shows-app.service` (Next.js UI, port 4178) was restarted. `video-server` (4179) and
`shows-proxy` (4180) run as separate processes and were left alone, so in-flight playback was
unaffected.

## Follow-ups not done

- Season-level `metadata.txt` files carry only `heroImage`; no tags there. Not needed for
  library search.
- Search covers shows only, not individual episode filenames.
