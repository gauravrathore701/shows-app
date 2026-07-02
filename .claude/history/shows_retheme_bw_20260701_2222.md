# Shows App — Retheme to Black & White

**Date:** 2026-07-01 22:22

## What changed

`app/globals.css` — full retheme from charcoal (#212529) to pure black/white

| Role               | Before  | After   |
|--------------------|---------|---------|
| Background main    | #212529 | #0d0d0d |
| Cards              | #343A40 | #111111 |
| Borders            | #495057 | #222–#333 |
| Text primary       | #DEE2E6 | #f0f0f0 |
| Text secondary     | #ADB5BD | #888–#999 |
| Accents            | #CED4DA | none (monochrome) |
| Login button       | grey    | #fff bg / #000 text |

## Why
User rejected charcoal palette: "make it darker just use plain black and white"

## Deploy
- `next build` → compiled successfully
- `systemctl restart shows-app` → active on port 4178
