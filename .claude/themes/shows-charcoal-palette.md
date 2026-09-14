# Shows — original "charcoal" palette (saved 2026-09-14)

The dark theme Shows used until 2026-09-14, kept for a possible redesign.
It is still live in the code: `app/globals.css` → `html[data-theme="charcoal"] { … }`.

## Restore it
In `app/layout.js` change `<html lang="en">` to `<html lang="en" data-theme="charcoal">`,
then `npm run build && sudo systemctl restart shows-app`. (The paper texture is skipped
automatically in charcoal mode.) A byte-for-byte copy of the pre-theme CSS and layout is in
`backups/theme-charcoal-20260914/`.

## Palette
| Role | Variable | Charcoal | Paper (current) |
|------|----------|----------|-----------------|
| Page background | `--bg` | `#0d0d0d` | `#e8dfc9` |
| Body text | `--text` | `#f0f0f0` | `#2b2723` |
| Headings | `--heading` | `#fff` | `#2b2723` |
| Title highlight | `--heading-span` | `#ccc` | `#6b4a2f` |
| Secondary text | `--text-soft` | `#ccc` | `#3f3830` |
| Meta / breadcrumbs | `--text-dim` | `#888` | `#6f6555` |
| Faint / placeholders | `--text-faint` | `#555` | `#6f6555` |
| Separators | `--sep` | `#444` | `#a8997a` |
| Card / input surface | `--surface` | `#111` | `#ddd2b7` |
| Surface hover | `--surface-hover` | `#1a1a1a` | `#d4c7a8` |
| Strong surface | `--surface-strong` | `#222` | `#cfc1a0` |
| Strong surface hover | `--surface-strong-hover` | `#333` | `#c4b594` |
| Border | `--line` | `#222` | `#cbbd9e` |
| Strong border | `--line-strong` | `#333` | `#bfae8c` |
| Hover border | `--line-hover` | `#555` | `#8a6a4b` |
| Primary / active | `--accent` | `#fff` | `#6b4a2f` |
| Text on primary | `--accent-text` | `#000` | `#e8dfc9` |
| Primary hover | `--accent-hover` | `#ddd` | `#563b25` |
| Nav background | `--nav-bg` | `rgba(13,13,13,.96)` | `rgba(232,223,201,.94)` |
| Shadow | `--shadow` | `rgba(0,0,0,.6)` | `rgba(80,62,35,.18)` |
| Modal overlay | `--overlay` | `rgba(0,0,0,.92)` | `rgba(43,39,35,.55)` |
| Danger | `--danger` | `#ff6b6b` | `#9b2d20` |
| Player letterbox | `--player-bg` | `#000` | `#000` |
| Next-up card bg | `--card-float-bg` | `rgba(33,37,41,.94)` | `rgba(232,223,201,.96)` |
| Next-up card border | `--card-float-line` | `#343A40` | `#cbbd9e` |
| Next-up text | `--card-float-text` | `#E9ECEF` | `#2b2723` |
| Next-up label | `--card-float-label` | `#ADB5BD` | `#6f6555` |
| Season art gradient | `--season-art-1/2/3` | `#1c1c1c / #141414 / #101010` | `#ddd2b7 / #d4c7a8 / #cfc1a0` |
| Season numeral stroke | `--season-num` / hover | `#3a3a3a` / `#6a6a6a` | `#a8997a` / `#6b4a2f` |
| Font | `--font` | `'Segoe UI', system-ui` | `ui-sans-serif, system-ui` |

Charcoal also used the Bootstrap greys `#212529 #343A40 #495057 #6C757D #ADB5BD #CED4DA #DEE2E6 #E9ECEF`
for the Next button, next-up card and progress bar (same family as Gaurav's general UI palette).

Notes on the charcoal mapping: in the original, the active tab and "last watched" badge were
grey-on-grey (`#1a1a1a`/`#333` with white text), the Next button was `#212529` with `#DEE2E6`
text, and progress fill was `#ADB5BD`. The variable version uses `--accent` for those, which
in charcoal resolves to white/black — close but not identical. The exact originals are in the
backup CSS if a pixel-perfect restore is wanted.
