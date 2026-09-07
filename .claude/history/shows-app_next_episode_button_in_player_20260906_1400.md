# Next-episode button inside the player — 2026-09-06 14:00

## What
Persistent skip-to-next control in vidstack's own control
bar, right after play/pause. Complements (does not
replace) the 10-second countdown card added 2026-09-06
02:53 — that one only appears at the end of an episode.

## How
DefaultVideoLayout accepts a `slots` prop. Slot names
follow before<Name> / <Name> / after<Name>, confirmed in
node_modules/@vidstack/react/types/vidstack-react.d.ts
(DefaultLayoutSlotName). Used:

    <DefaultVideoLayout
      icons={defaultLayoutIcons}
      slots={{ afterPlayButton: nextEpButton }}
    />

The button reuses the existing goNext(), so it inherits
push(true) (marks the episode watched) and the `advanced`
ref guard. Renders null when nextHref is null, so movies
and last-episodes show no button at all.

## Two things that had to be fixed mid-build
1. TDZ. The button was first defined above goNext.
   onClick={goNext} reads the binding during render, and
   goNext is a `const` declared later — that throws
   ReferenceError. Moved the definition below goNext's
   useCallback.
2. NextIcon. It appears in vidstack's .d.ts but importing
   it from '@vidstack/react' fails ("not exported"), and
   '@vidstack/react/icons' pulls in `media-icons`, which
   is not installed. Rather than add a dependency for one
   glyph, the button uses an inline SVG.

## Files
    app/watch/[showName]/[...path]/page.js   modified
    app/globals.css                          2 rules added
    backups/page.js.bak-20260906
    backups/globals.css.bak2-20260906

## Build
    npm run build -> Compiled successfully in 2.4s
    static pages 5/5

## Not done
Service NOT restarted — the running shows-app is still the
previous build. Also noted: shows-app/.gitignore has no
*.bak or backups/ rule, unlike discord-claude-bot. The new
backups/ folder here WILL be committed by the 08:00 sync
unless that is added.
