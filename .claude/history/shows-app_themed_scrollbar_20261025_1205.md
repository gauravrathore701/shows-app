# Themed scrollbar — 2026-10-25 12:05

Gaurav: drop the grey OS scrollbar, match the blog's custom one.
Blog (bloging-app/src/styles/global.css): `scrollbar-color: #8a6a4b #ddd2b7;
scrollbar-width: thin` on html. Shows equivalents are `--line-hover` /
`--surface`, so `html { scrollbar-color: var(--line-hover) var(--surface);
scrollbar-width: thin; }` appended to app/globals.css — charcoal theme gets
#555 on #111 automatically. Chrome 121+/Edge/Firefox; Safari keeps overlay.
Build clean, service restarted, rule present in served CSS.
