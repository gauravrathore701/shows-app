# shows-app — SVG logo

Date: 2026-08-29 10:12

## What
Made brand logo for shows-app ("Cursed Shrine — Shows",
from app/layout.js title). Torii gate + play triangle.

## Files added
- public/logo-icon.svg — 512x512 app icon / favicon
- public/logo.svg — 1100x340 horizontal wordmark

## Design
- Palette from app/globals.css: bg #0d0d0d, text #f0f0f0,
  muted #888, hairline #2a2a2a
- Gate: vermilion gradient #e5533d -> #b8322a
- Play mark sits in the gate opening, #f0f0f0
- Pure vector, no external fonts required beyond
  DejaVu Sans / Helvetica / Arial fallback stack

## Render
No rsvg-convert/inkscape/cairosvg on the Pi. Used chromium
headless screenshot:
  chromium --headless=new --disable-gpu --no-sandbox \
    --screenshot=out.png --window-size=W,H file://in.svg
Helper kept at /tmp/shot.sh (temp, not committed).

## Delivery
PNG previews + both SVGs posted to the default Discord
channel via REST API (message 1543118592462032930).
UA header required or Cloudflare 403.

## Not done
Not wired into the app — no <link rel="icon"> or nav <img>
yet. Say the word and I hook it into app/layout.js.

---

## v2 — 2026-08-29 10:18

Feedback: floating white rounded triangle read as a
clickable UI play button, not part of the mark.

### Fix
Play mark is now negative space — a triangle knocked out
of a noren (shrine curtain) hanging under the nuki.
Cut via SVG `<mask id="cut">`, so the dark background
shows through. Nothing floats on top of the gate.

### Variants tried (rejected)
- A sharp white triangle, still button-like, hit pillars
- B solid vermilion slab, swallowed the gate legs
- C filmstrip perforations, cluttered at small size
- D sawtooth curtain hem, read as torn paper
- E gate only, no play cue — kept as an alt, posted

### Tuning
- Curtain gradient #a83226 -> #7a1f1a, darker than the
  gate so it separates from the legs
- 6px background-colored stroke on the curtain = hairline
  gap where it meets the pillars
- Play cut enlarged to 216..332 x for small-size read

### Legibility
Rendered at 48 / 96 / 160 px. Reads at 96+. At 48 and
below it muddies — a simplified favicon (gate only, no
curtain) is the fix if a 32px favicon is wanted.

Note: chromium sizes SVG by intrinsic width, so
--window-size alone will not downscale. Use an HTML
wrapper with <img width=N> to test small sizes.

Posted to Discord: message 1543119727147225101.

---

## v3 — 2026-08-29 10:22 (current)

Feedback: drop the shrine entirely, go minimalist,
grey-black theme.

### Mark
Five stacked rounded bars, left edges aligned, widths
tapering out from the middle so the right edges cut a
play triangle. Episode list and play button in one
shape. No literal triangle drawn anywhere.

Width curve: w = wmin + (wmax-wmin)*(1 - |dy|/hh)
so bar length falls off linearly from the centre row.

### Palette (grey on near-black, no vermilion)
- plate   #141414, hairline #2a2a2a
- centre bar   #E9ECEF
- mid bars     #ADB5BD
- outer bars   #6C757D
- ring track   #2f3438

### Files in shows-app/public/
- logo.svg           1100x340 wordmark
- logo-icon.svg      512 app icon, 5 bars
- logo-alt-ring.svg  512 alt, scrubber ring + 3 bars
- favicon-mark.svg   512 transparent, 3 bars, for 32px

### Also considered
- scrubber ring alone — read as a loading spinner
- stacked cards — read as a wallet / credit card
- both rendered and rejected

### Legibility
Size sheet at 32 / 48 / 96 px. 5-bar icon holds to 32.
favicon-mark (3 bars) is the crisper one at 32 and below.

Generator script: /tmp/final2.py (temp, regenerate from
this note if needed). Posted: message 1543120651337076806.

---

## v3.1 review — 2026-08-29 10:28

Self-review + web check against 2026 icon guidance.

### Holds up
- One element, no text in the icon, no clutter
- Opaque plate (Apple rejects alpha app icons)
- Centred, nothing near the corners where iOS masks
- Reads down to 32px
- No collision found: Deezer uses bars but colourful
  and vertical-ish; Google Play uses a triangle motif

### Real weaknesses
1. Same visual family as toolbar icons (align-left /
   sort / equalizer). Distinctive as a shape, generic
   as a genre. Research is explicit that a mark reading
   as a UI icon costs recognition.
2. Was invisible on light backgrounds. FIXED — added
   logo-icon-light.svg + logo-light.svg with the ramp
   inverted (#212529 centre, #6C757D, #ADB5BD).
3. favicon-mark.svg is transparent — fine for web, but
   never submit it as an iOS icon.
4. Wordmark: mark is optically light next to the 800
   weight caps. Not fixed, judgement call.

### Tried and rejected
Vertical playhead line cutting the bars, to break the
toolbar-icon read. The background gutter clips the bars'
rounded caps and leaves crescent artifacts. Rendered,
rejected, preview posted.

### Files now in public/
logo.svg, logo-light.svg, logo-icon.svg,
logo-icon-light.svg, logo-alt-ring.svg, favicon-mark.svg

Posted: message 1543121361407574066.

---

## v3.2 wired in — 2026-08-29 10:36

### shows-app
- app/layout.js — metadata.icons added:
  favicon-mark.svg (svg+xml), apple: logo-icon.svg
- 4 nav call sites: the emoji is gone, replaced by
  <img src="/favicon-mark.svg" className="nav-mark">
  page.js, show/[showName]/page.js,
  show/[showName]/[season]/page.js,
  watch/[showName]/[...path]/page.js
- app/globals.css — .nav-logo is now inline-flex with
  gap .55rem, .nav-mark height 22px (18px was too faint
  in the nav, checked in a render)
- npm run build + systemctl restart shows-app, verified
  200 on /, /favicon-mark.svg, /logo-icon.svg
- npm is not on PATH for this shell. Use
  PATH=/home/gaurav/.nvm/versions/node/\
  v24.13.0/bin:$PATH npm run build

### homepage-cursedshrine
- public/ got logo-icon.svg, logo-icon-light.svg,
  favicon-mark.svg
- index.html head: rel=icon -> favicon-mark.svg,
  apple-touch-icon -> logo-icon.svg
- Static site, no build or restart needed
- Note: that page is purple neon (#b48cff on near
  black). The grey mark does not match it. A recoloured
  variant would be the right call if the mark ever goes
  on the page itself, not just the tab.

### Not touched
portfolio-website, TicTacToe-React, minecraft-clone,
snake-ladder, mecca-api-project, user-authentication-
system, zh-ai-support, Mail-Service, mongo-pi,
daily-script — different brands or no web UI.
Nothing committed in either repo.
