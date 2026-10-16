# HDD wake on landing — 2026-10-15

- HDD is always mounted (fstab + udev hdd-remount); the delay was drive spin-up from standby on first uncached read.
- New `app/api/wake/route.js`: POST reads 1 byte at random offset of a random video → real disk read → spin-up. Returns 204. Throttled to once/60s (unauthenticated).
- `AuthGate.js` useEffect fires `fetch('/api/wake', {method:'POST'})` on mount → runs on login page and home, before auth.
- Built, restarted shows-app.service; verified 204 on :4178 and :4180, layout chunk contains call.
