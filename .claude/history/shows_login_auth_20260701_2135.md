# Shows App — Login Auth via Mecca API

**Date:** 2026-07-01 21:35

## What changed

Added JWT-based login gate to shows-app using mecca-api as the auth backend.

### Files created
- `app/api/auth/login/route.js` — server-side proxy to `https://api.cursedshrine.com/auth/login` (avoids CORS)
- `app/components/AuthGate.js` — client component; checks localStorage for JWT, shows modal if missing/expired

### Files modified
- `app/layout.js` — wraps children with `<AuthGate>`
- `app/globals.css` — added `.modal-overlay`, `.modal-card`, `.modal-input`, `.modal-btn`, `.modal-error`, `.logout-btn`

## Auth flow
1. On page load, AuthGate reads `shows_auth` from localStorage
2. Decodes JWT `exp` claim to check expiry
3. If no token or expired → shows full-screen login modal (blurred background)
4. On successful login, stores `{ token }` in localStorage and renders app
5. Logout button (⏻) fixed bottom-right; clears localStorage and shows modal again

## API
- `POST /api/auth/login` → proxies to `https://api.cursedshrine.com/auth/login`
- Body: `{ username, password }`
- Response: `{ success, message, data: { token } }`
