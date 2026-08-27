'use client';

// Watch progress lives server-side (mecca-api -> user-auth-api -> Mongo) so the
// same account resumes on any device. localStorage stays as an offline mirror
// and as the fallback when the API is unreachable.

const AUTH_KEY = 'shows_auth';
const LOCAL_KEY = 'lastWatched';

export function getToken() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || '{}')?.token || null;
  } catch {
    return null;
  }
}

export function readLocal(show) {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}')[show] || null;
  } catch {
    return null;
  }
}

export function writeLocal(show, path) {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    stored[show] = path;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(stored));
  } catch {}
}

/** Every episode watched in `show`, newest first. Empty array on any failure. */
export async function fetchProgress(show) {
  const token = getToken();
  if (!token) return [];
  try {
    const url = show ? `/api/progress?show=${encodeURIComponent(show)}` : '/api/progress';
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.items ?? [];
  } catch {
    return [];
  }
}

/** Fire-and-forget position save. `keepalive` lets it survive tab close. */
export function saveProgress({ show, path, position, duration, finished }) {
  const token = getToken();
  if (!token || !show || !path) return;
  writeLocal(show, path);
  try {
    fetch('/api/progress', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ show, path, position, duration, finished }),
    }).catch(() => {});
  } catch {}
}
