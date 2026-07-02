'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'shows_auth';

function getJwtExp(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp; // unix seconds
  } catch {
    return 0;
  }
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const auth = JSON.parse(raw);
    if (!auth?.token) return null;
    const exp = getJwtExp(auth.token);
    if (exp && Date.now() / 1000 > exp) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return auth;
  } catch {
    return null;
  }
}

export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAuthed(!!loadAuth());
    setChecked(true);
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(res.status === 401 ? 'Invalid username or password' : 'Something went wrong, try again');
        return;
      }
      const token = json.data?.token ?? json.data;
      if (!token) { setError('No token in response'); return; }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token }));
      setAuthed(true);
    } catch {
      setError('Network error — try again');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuthed(false);
    setUsername('');
    setPassword('');
  }

  if (!checked) return null;

  return (
    <>
      {authed && (
        <button className="logout-btn" onClick={handleLogout} title="Logout">
          ⏻
        </button>
      )}
      {authed ? children : (
        <>
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-logo">🎬 Cursed Shrine</div>
              <p className="modal-subtitle">Sign in to your library</p>
              <form onSubmit={handleLogin} className="modal-form">
                <input
                  className="modal-input"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
                <input
                  className="modal-input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                {error && <div className="modal-error">{error}</div>}
                <button className="modal-btn" type="submit" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
