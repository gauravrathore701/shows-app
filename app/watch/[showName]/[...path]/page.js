'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


import { fetchProgress, saveProgress, writeLocal } from '../../../lib/progress';

// How often the playhead is pushed to the server while playing.
const SAVE_EVERY_SEC = 15;
// Below this the resume prompt is pointless; near the end we restart instead.
const RESUME_MIN_SEC = 30;
// How close to the end still counts as "it finished". Some files stop a beat
// early, so this cannot be zero — but it must stay far smaller than an episode.
const END_SLACK_SEC = 15;
const RESUME_MAX_RATIO = 0.95;
// Netflix-style next-episode card: appears this many seconds before the end and
// counts down to an automatic jump.
const NEXT_UP_SEC = 10;
// Skip-intro offer: how long the button stays on screen before the intro is
// skipped without being asked twice.
const SKIP_INTRO_GRACE_SEC = 3;

// Server says "HLS" for anything outside H.264 8-bit + AAC/MP3, but many browsers
// decode more (Poco Chrome: HEVC 8-bit, AV1, Opus — not HEVC 10-bit or EAC3/AC3).
// Ask the browser with the exact RFC 6381 codec string; in the 2026-10-20 codec-poc
// run its answer matched real playback for every file.
const hex2 = (n) => Number(n).toString(16).padStart(2, '0').toUpperCase();
function browserCanDecode({ vcodec, vprofile, vlevel, pixFmt, acodec }) {
  if (typeof MediaSource === 'undefined' || !MediaSource.isTypeSupported) return false;
  const ten = /10/.test(pixFmt || '');
  const v = {
    h264: () => `avc1.${({ High: '64', Main: '4D', 'High 10': '6E' }[vprofile] || '42')}00${hex2(vlevel || 40)}`,
    hevc: () => (ten ? `hvc1.2.4.L${vlevel || 120}.B0` : `hvc1.1.6.L${vlevel || 120}.B0`),
    av1: () => `av01.0.${String(vlevel ?? 8).padStart(2, '0')}M.${ten ? '10' : '08'}`,
  }[vcodec];
  const a = { aac: 'mp4a.40.2', mp3: 'mp4a.69', opus: 'opus', ac3: 'ac-3', eac3: 'ec-3', flac: 'flac' }[acodec];
  if (!v || (acodec && !a)) return false;
  return MediaSource.isTypeSupported(`video/mp4; codecs="${v()}"`) &&
    (!acodec || MediaSource.isTypeSupported(`audio/mp4; codecs="${a}"`));
}

// hls.js defaults stop fetching ~30s / 60MB ahead, which shows up as "loads a
// bit, then waits". Keep ~25 min buffered ahead instead; the byte cap must be
// raised too or it kicks in first at these durations. (Browser MSE quota may
// still cap it lower; hls.js backs off on QuotaExceeded.)
const HLS_CONFIG = {
  maxBufferLength: 1500,
  maxMaxBufferLength: 1800,
  maxBufferSize: 400 * 1000 * 1000,
  backBufferLength: 90, // free memory behind playhead (mobile tabs); server re-serves cached segments on rewind
};

// ── Subtitles / audio tracks ───────────────────────────────────────────────
// The server lists a file's audio streams and its TEXT subtitle streams on
// /tracks.json (with a dialogue-line count and latin-letter ratio per sub,
// measured from the converted WebVTT) and serves each sub as /subN.vtt.
const LANG = {
  eng: ['English', 'en'], jpn: ['Japanese', 'ja'], spa: ['Spanish', 'es'], por: ['Portuguese', 'pt'],
  fre: ['French', 'fr'], fra: ['French', 'fr'], ger: ['German', 'de'], deu: ['German', 'de'],
  ita: ['Italian', 'it'], hin: ['Hindi', 'hi'], kor: ['Korean', 'ko'], chi: ['Chinese', 'zh'],
  zho: ['Chinese', 'zh'], rus: ['Russian', 'ru'], ara: ['Arabic', 'ar'],
};

function trackLabel(t, kind) {
  // a jpn-tagged sub whose text is ~all latin letters is a mislabelled English
  // track (Anohana / Your Lie in April originals) — don't call it Japanese
  const code = t.lang === 'jpn' && t.latin >= 0.9 ? 'eng' : t.lang;
  const lang = LANG[code]?.[0] || '';
  const title = (t.title || '').trim();
  if (!title) return lang || `${kind} ${t.i + 1}`;
  if (!lang || title.toLowerCase().includes(lang.toLowerCase())) return title;
  return `${lang} · ${title}`;
}

// Default subtitle = the full English DIALOGUE track. Tags are not trusted:
// originals carry signs-only tracks flagged default (Anohana, Dororo, Bebop),
// a signs track tagged eng+forced with the real dialogue tagged jpn (Your Lie
// in April), and "Dubtitles" next to "Full Subs" (Bebop). So: drop signs/songs
// and anything with far fewer lines than the busiest track, accept tracks that
// are English by tag OR by content, then rank.
const SIGNS = /sign|song|karaoke|forced/i;
const FULL = /full|dialog/i;
function pickDefaultSub(subs) {
  const maxLines = Math.max(0, ...subs.map((s) => s.lines || 0));
  let best = null;
  let bestScore = -Infinity;
  for (const s of subs) {
    const title = s.title || '';
    const full = FULL.test(title);
    if (!full && (s.forced || SIGNS.test(title))) continue;
    if (maxLines && s.lines != null && s.lines < 0.6 * maxLines) continue;
    const engTag = s.lang === 'eng' || /engl/i.test(title);
    const latinish = s.latin == null ? full : s.latin >= 0.9;
    const untrustedTag = ['jpn', 'und', 'zxx', ''].includes(s.lang) && !/japan/i.test(title);
    if (!engTag && !(untrustedTag && latinish)) continue;
    const score = (s.default ? 4 : 0) + (full ? 3 : 0) + (engTag ? 2 : 0)
      - (/dub|sdh|commentary|\bcc\b/i.test(title) ? 3 : 0) + (s.lines || 0) / 1e5;
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return best ? best.i : -1;
}

function readPref(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function writePref(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export default function WatchPage({ params }) {
  const { showName, path } = use(params);
  const decodedShow = decodeURIComponent(showName);
  const decodedPath = path.map(decodeURIComponent);

  const isSeasonal = decodedPath.length >= 2;
  const decodedSeason = isSeasonal ? decodedPath[0] : null;
  const decodedEp = isSeasonal ? decodedPath[1] : decodedPath[0];

  const epFile = decodedEp.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '');

  // Number from the filename: SxxEyy when present, otherwise the last number
  // in the name, which is what absolute-numbered anime uses.
  const epNum = (() => {
    const se = decodedEp.match(/S\d{1,2}E(\d{1,4})/i);
    if (se) return String(Number(se[1])).padStart(2, '0');
    const tail = epFile.match(/(\d{1,4})\D*$/);
    return tail ? String(Number(tail[1])).padStart(2, '0') : null;
  })();

  // Filled from /api/episodes once it answers. Until then the filename is
  // shown, so the header never sits empty while the request is in flight.
  const [epName, setEpName] = useState(null);
  const epTitle = epName || epFile;

  // Movie convention is "<Title (Year)>/<Title (Year)>.<ext>", so a flat show whose
  // file name matches its folder is a single-file movie — no episode list to link back to.
  const isMovie = !isSeasonal && epFile === decodedShow;

  // Files the browser can't decode (HEVC, 10-bit, Opus/DTS/AC3 audio) are transcoded
  // server-side and served as HLS (segment-on-demand) → real seeking + resilience.
  // Everything else is served directly with byte-range seeking. The filename tells us
  // nothing reliable (Dororo is HEVC + Opus with a plain episode name), so the server
  // ffprobes the file and answers on /codec.json; the tag regex is only the first guess
  // while that request is in flight.
  const fileUrl = `/api/stream/${encodeURIComponent(decodedShow)}/${decodedPath.map(encodeURIComponent).join('/')}`;
  const [useHls, setUseHls] = useState(null);
  const [direct, setDirect] = useState(false);   // raw file the server would have transcoded

  useEffect(() => {
    let cancelled = false;
    // no-store: this answer decides HLS vs raw. A wrong one cached in the
    // browser (it used to ship max-age=86400 even when ffprobe had failed)
    // leaves every later visit fetching a raw HEVC file — a black player
    // that no reload can fix.
    fetch(`${fileUrl}/codec.json`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const raw = !!(d && d.hls && d.probed && browserCanDecode(d));
        setDirect(raw);
        setUseHls(raw ? false : d ? !!d.hls : /x265|hevc|h\.?265/i.test(decodedEp));
      })
      .catch(() => { if (!cancelled) setUseHls(/x265|hevc|h\.?265/i.test(decodedEp)); });
    return () => { cancelled = true; };
  }, [fileUrl, decodedEp]);

  // ── Tracks (subtitles + audio) ──────────────────────────────────────────
  // subSel = subtitle stream index (0:s:N) or -1 for off; audioSel = audio
  // stream index. Choices are remembered per show, by language + title, since
  // stream numbers are not guaranteed to line up between episodes.
  const [tracks, setTracks] = useState(null);
  const [subSel, setSubSel] = useState(-1);
  const [audioSel, setAudioSel] = useState(0);
  const [menu, setMenu] = useState(null);           // 'cc' | 'audio' | null
  const subKey = `shows_subs:${decodedShow}`;
  const audioKey = `shows_audio:${decodedShow}`;

  useEffect(() => {
    let stale = false;
    setTracks(null);
    setSubSel(-1);
    setAudioSel(0);
    setMenu(null);
    fetch(`${fileUrl}/tracks.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (stale || !d) return;
        const subs = d.subs || [];
        const audio = d.audio || [];
        setTracks({ subs, audio });

        const sp = readPref(subKey);
        let sub = -1;
        if (sp?.off) sub = -1;
        else {
          const m = sp && subs.find((s) => s.lang === sp.lang && s.title === sp.title);
          sub = m ? m.i : pickDefaultSub(subs);
        }
        setSubSel(sub);

        const ap = readPref(audioKey);
        if (ap && audio.length > 1) {
          const m = audio.find((a) => a.lang === ap.lang && a.title === ap.title) ||
            audio.find((a) => a.lang === ap.lang);
          if (m && m.i !== 0) switchAudio(m.i);
        }
      })
      .catch(() => {});
    return () => { stale = true; };
    // switchAudio only touches refs/setters; keyed on the file
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, subKey, audioKey]);

  // ── Next episode ────────────────────────────────────────────────────────
  // The watch page is a client component and knows only its own path, so the
  // sibling list comes from the API. Movies have no siblings worth fetching.
  const [nextEp, setNextEp] = useState(null);
  const [countdown, setCountdown] = useState(null);   // null = card hidden
  // ── Skip intro ──────────────────────────────────────────────────────────
  // { start, end } in seconds, from the season's (or show's) metadata.txt.
  const [intro, setIntro] = useState(null);
  const [skipLeft, setSkipLeft] = useState(null);     // null = button hidden
  // One offer per episode: once the intro has been skipped, or watched past,
  // rewinding into it does not pop the button up again.
  const introDone = useRef(false);
  const [cancelled, setCancelled] = useState(false);
  const router = useRouter();
  const advanced = useRef(false);

  useEffect(() => {
    setNextEp(null);
    setEpName(null);   // otherwise the previous episode's title lingers
    setCountdown(null);
    setCancelled(false);
    setIntro(null);
    setSkipLeft(null);
    introDone.current = false;
    advanced.current = false;
    if (isMovie) return;

    let stale = false;
    const listPath = isSeasonal
      ? `${encodeURIComponent(decodedShow)}/${encodeURIComponent(decodedSeason)}`
      : encodeURIComponent(decodedShow);

    fetch(`/api/episodes/${listPath}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (stale || !d?.episodes?.length) return;
        if (d.intro && d.intro.end > d.intro.start) setIntro(d.intro);
        // Same response carries the title map — no second request.
        const t = epNum && d.titles ? d.titles[epNum] : null;
        if (t) setEpName(`Episode ${epNum} - ${t}`);
        const i = d.episodes.indexOf(decodedEp);
        // -1 means the file vanished or was renamed; last episode has no next.
        if (i >= 0 && i < d.episodes.length - 1) setNextEp(d.episodes[i + 1]);
      })
      .catch(() => {});

    return () => { stale = true; };
  }, [decodedShow, decodedSeason, decodedEp, isSeasonal, isMovie, epNum]);

  const nextHref = nextEp
    ? (isSeasonal
        ? `/watch/${showName}/${encodeURIComponent(decodedSeason)}/${encodeURIComponent(nextEp)}`
        : `/watch/${showName}/${encodeURIComponent(nextEp)}`)
    : null;

  const nextTitle = nextEp ? nextEp.replace(/\.(mp4|mkv|avi|mov|webm)$/i, '') : '';

  // The progressive source needs an explicit type. Given a bare URL, vidstack
  // picks the provider from the extension, and `.mkv` is not in its video list
  // — so it fell through to hls.js, which fetch()ed the whole 179 MB file as if
  // it were a manifest (twice) and then gave up with a dead player. The browser
  // demuxes Matroska fine; only the provider hint was wrong.
  // Any audio stream but the first goes through the server's HLS path with
  // ?audio=N (video copied when it is already browser-safe H.264, re-encoded
  // otherwise): browsers have no usable API to pick an audio track themselves.
  const altAudio = audioSel !== 0;
  const hlsOn = useHls === null ? null : (useHls || altAudio);
  const srcUrl = altAudio
    ? `${fileUrl}/index.m3u8?audio=${audioSel}`
    : useHls ? `${fileUrl}/index.m3u8` : direct ? `${fileUrl}?direct=1` : fileUrl;

  const watchKey = isSeasonal ? `${decodedShow}/${decodedSeason}` : decodedShow;
  const seasonHref = isSeasonal ? `/show/${showName}/${encodeURIComponent(decodedSeason)}` : null;

  // Progress is read off the native <video> element rather than the player's own
  // state, so nothing here depends on vidstack's event-detail shapes.
  const video = useRef(null);
  const lastSent = useRef(0);
  const resumeAt = useRef(0);
  const resumed = useRef(false);
  const canPlayed = useRef(false);
  // An audio switch reloads the source; until the playhead is restored no
  // progress may be saved, or the 0:00 of the fresh load would overwrite it.
  const switching = useRef(false);
  const wasPaused = useRef(false);

  function switchAudio(i) {
    const v = video.current;
    if (v && v.currentTime > 0) {
      resumeAt.current = v.currentTime;
      resumed.current = false;
      switching.current = true;
      wasPaused.current = v.paused;
    }
    canPlayed.current = false;
    setAudioSel(i);
  }

  useEffect(() => {
    let cancelled = false;
    // Mirror locally right away so the episode list is right even if the API is down.
    writeLocal(watchKey, decodedEp);
    resumed.current = false;
    canPlayed.current = false;
    lastSent.current = 0;
    resumeAt.current = 0;

    // Playback never waits on this request — whichever lands last (the answer or
    // `canplay`) performs the seek, so a slow or dead API just means no resume.
    fetchProgress(watchKey)
      .then((items) => {
        if (cancelled) return;
        const mine = items.find((it) => it.path === decodedEp);
        if (!mine || mine.finished || !(mine.duration > 0)) return;
        const ratio = mine.position / mine.duration;
        if (mine.position > RESUME_MIN_SEC && ratio < RESUME_MAX_RATIO) {
          resumeAt.current = mine.position;
          if (canPlayed.current) seekToResume();
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [watchKey, decodedEp]);

  const push = useCallback((finished) => {
    const v = video.current;
    if (!v || switching.current) return;
    const position = v.currentTime || 0;
    const duration = Number.isFinite(v.duration) ? v.duration : 0;
    if (!duration) return;
    lastSent.current = position;
    saveProgress({ show: watchKey, path: decodedEp, position, duration, finished });
  }, [watchKey, decodedEp]);

  // Jump the playhead past the opening titles. Called by the button and by the
  // timer below when the offer runs out unanswered.
  const applySkip = useCallback(() => {
    introDone.current = true;
    setSkipLeft(null);
    const v = video.current;
    if (!v || !intro) return;
    // Only move if the playhead is still inside the titles — the viewer may
    // have scrubbed out of them while the button was up.
    if (v.currentTime < intro.end) v.currentTime = intro.end;
  }, [intro]);

  // The offer counts down once a second; reaching zero skips the intro. The
  // state is the countdown itself, so a re-render cannot lose the timer and
  // leave the button stuck on screen.
  useEffect(() => {
    if (skipLeft === null) return undefined;
    if (skipLeft > 0) {
      const t = setTimeout(() => setSkipLeft((n) => (n === null ? null : n - 1)), 1000);
      return () => clearTimeout(t);
    }
    applySkip();
    return undefined;
  }, [skipLeft, applySkip]);

  // Declared after `push` so it can depend on it. Marks the episode finished
  // before navigating, otherwise the list still shows it as in-progress.
  const goNext = useCallback(() => {
    if (advanced.current || !nextHref) return;
    advanced.current = true;
    push(true);
    router.push(nextHref);
  }, [nextHref, push, router]);

  // The browser's own controls own the bottom of the frame, so the
  // next-episode control sits in the info bar under the video (right side).
  const nextEpButton = nextHref ? (
    <button
      type="button"
      className="next-ep-button"
      aria-label="Next episode"
      title={nextTitle ? `Next: ${nextTitle}` : 'Next episode'}
      onClick={goNext}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" width="18" height="18">
        <path d="M6 5.5v13l9-6.5-9-6.5z" />
        <rect x="16.5" y="5.5" width="2" height="13" rx="1" />
      </svg>
      <span>Next</span>
    </button>
  ) : null;

  // Leaving the tab / backgrounding the app is the most common way a watch ends.
  useEffect(() => {
    const flush = () => push(false);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
      flush();
    };
  }, [push]);

  // Source wiring. Native <video> plays the progressive files directly; the
  // transcoded ones are HLS, which only Safari handles natively, so hls.js is
  // attached for everyone else. Loaded lazily — importing it at module scope
  // drags it into the server render for no reason.
  useEffect(() => {
    const v = video.current;
    if (!v || hlsOn === null) return;

    if (!hlsOn) {
      // browser said yes but can't actually play it (error, or a black frame
      // with audio only) → back to the server's HLS transcode
      const fallback = () => { setDirect(false); setUseHls(true); };
      // (only the first audio stream ever plays raw, so altAudio is never set here)
      const check = () => { if (!v.videoWidth) fallback(); };
      if (direct) { v.addEventListener('error', fallback); v.addEventListener('loadedmetadata', check); }
      v.src = srcUrl;
      return () => {
        v.removeEventListener('error', fallback); v.removeEventListener('loadedmetadata', check);
        v.removeAttribute('src'); v.load();
      };
    }

    if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = srcUrl;
      return () => { v.removeAttribute('src'); v.load(); };
    }

    let hls = null;
    let dead = false;
    import('hls.js').then(({ default: Hls }) => {
      if (dead || !Hls.isSupported()) return;
      hls = new Hls(HLS_CONFIG);
      hls.loadSource(srcUrl);
      hls.attachMedia(v);
    });

    return () => {
      dead = true;
      if (hls) hls.destroy();
    };
  }, [srcUrl, hlsOn, direct]);

  // Subtitle modes are set on the <track> elements' TextTracks. Re-applied on
  // every load: an audio switch swaps the source under the same elements.
  const trackEls = useRef({});
  useEffect(() => {
    const v = video.current;
    if (!v || !tracks) return undefined;
    const apply = () => {
      for (const sub of tracks.subs) {
        const t = trackEls.current[sub.i]?.track;
        if (!t) continue;
        const mode = sub.i === subSel ? 'showing' : 'disabled';
        if (t.mode !== mode) t.mode = mode;
      }
    };
    apply();
    v.addEventListener('loadedmetadata', apply);
    return () => v.removeEventListener('loadedmetadata', apply);
  }, [tracks, subSel, srcUrl]);

  // In fullscreen the browser's own captions menu is the only control, so
  // follow it: whatever track it turns on (or off) becomes the selection.
  useEffect(() => {
    const v = video.current;
    if (!v || !tracks?.subs.length) return undefined;
    const onChange = () => {
      let showing = -1;
      for (const sub of tracks.subs) {
        if (trackEls.current[sub.i]?.track?.mode === 'showing') showing = sub.i;
      }
      setSubSel((cur) => {
        if (cur === showing) return cur;
        rememberSub(showing);
        return showing;
      });
    };
    v.textTracks.addEventListener('change', onChange);
    return () => v.textTracks.removeEventListener('change', onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  // Tap anywhere else closes an open track menu.
  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => { if (!e.target.closest?.('.track-menu-wrap')) setMenu(null); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menu]);

  function rememberSub(i) {
    const sub = tracks?.subs.find((x) => x.i === i);
    writePref(subKey, sub ? { lang: sub.lang, title: sub.title } : { off: true });
  }

  function chooseSub(i) {
    setSubSel(i);
    rememberSub(i);
    setMenu(null);
  }

  function chooseAudio(i) {
    setMenu(null);
    const a = tracks?.audio.find((x) => x.i === i);
    if (a) writePref(audioKey, { lang: a.lang, title: a.title });
    if (i !== audioSel) switchAudio(i);
  }

  const hasSubs = !!tracks?.subs.length;
  const hasAudioChoice = (tracks?.audio.length || 0) > 1;
  const subName = subSel < 0 ? 'Off' : trackLabel(tracks.subs.find((x) => x.i === subSel) || { i: subSel }, 'Track');
  const audioName = hasAudioChoice ? trackLabel(tracks.audio.find((x) => x.i === audioSel) || { i: audioSel }, 'Audio') : '';

  // Shown only when the file has text subs and/or more than one audio
  // stream — a plain single-track title renders exactly as before.
  const trackTools = (hasSubs || hasAudioChoice) ? (
    <div className="track-tools">
      {hasSubs && (
        <div className="track-menu-wrap">
          <button
            type="button"
            className={`track-btn${subSel >= 0 ? ' on' : ''}`}
            aria-haspopup="menu"
            aria-expanded={menu === 'cc'}
            title="Subtitles"
            onClick={() => setMenu(menu === 'cc' ? null : 'cc')}
          >
            <span className="track-btn-badge">CC</span>
            <span className="track-btn-label">{subName}</span>
          </button>
          {menu === 'cc' && (
            <div className="track-menu" role="menu" aria-label="Subtitles">
              <button type="button" role="menuitemradio" aria-checked={subSel < 0}
                className={subSel < 0 ? 'sel' : ''} onClick={() => chooseSub(-1)}>Off</button>
              {tracks.subs.map((sub) => (
                <button key={sub.i} type="button" role="menuitemradio" aria-checked={subSel === sub.i}
                  className={subSel === sub.i ? 'sel' : ''} onClick={() => chooseSub(sub.i)}>
                  {trackLabel(sub, 'Track')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {hasAudioChoice && (
        <div className="track-menu-wrap">
          <button
            type="button"
            className="track-btn"
            aria-haspopup="menu"
            aria-expanded={menu === 'audio'}
            title="Audio language"
            onClick={() => setMenu(menu === 'audio' ? null : 'audio')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="currentColor">
              <path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
            </svg>
            <span className="track-btn-label">{audioName}</span>
          </button>
          {menu === 'audio' && (
            <div className="track-menu" role="menu" aria-label="Audio">
              {tracks.audio.map((a) => (
                <button key={a.i} type="button" role="menuitemradio" aria-checked={audioSel === a.i}
                  className={audioSel === a.i ? 'sel' : ''} onClick={() => chooseAudio(a.i)}>
                  {trackLabel(a, 'Audio')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  ) : null;

  function seekToResume() {
    if (resumed.current) return;
    const v = video.current;
    if (!v || !(resumeAt.current > 0)) return;
    resumed.current = true;
    v.currentTime = resumeAt.current;
    if (switching.current) {
      switching.current = false;
      lastSent.current = resumeAt.current;
      if (wasPaused.current) v.pause();
    }
  }

  function onCanPlay() {
    canPlayed.current = true;
    seekToResume();
  }

  function onTimeUpdate() {
    const v = video.current;
    if (!v) return;

    // Skip-intro offer, driven by the playhead like the next-up card. Nothing
    // here runs for a show whose metadata.txt carries no intro window.
    if (intro && !introDone.current) {
      const t = v.currentTime;
      if (t >= intro.end) {
        introDone.current = true;
        setSkipLeft(null);
      } else if (t >= intro.start) {
        if (skipLeft === null) setSkipLeft(SKIP_INTRO_GRACE_SEC);
      } else if (skipLeft !== null) {
        // scrubbed back out before the titles — withdraw the offer
        setSkipLeft(null);
      }
    }

    // The card is driven by the playhead, not a timer, so scrubbing backwards
    // hides it again and scrubbing forwards brings it straight back.
    if (nextHref && !cancelled && v.currentTime > 0 &&
        Number.isFinite(v.duration) && v.duration > 0) {
      const left = v.duration - v.currentTime;
      setCountdown(left <= NEXT_UP_SEC ? Math.max(0, Math.ceil(left)) : null);
    }

    if (Math.abs(v.currentTime - lastSent.current) < SAVE_EVERY_SEC) return;
    push(false);
  }

  // `ended` is what advances — the countdown is only the visible part. But on a
  // transcoded HLS stream `ended` is NOT trustworthy on its own: a failed
  // segment fetch, or a source that never loaded, fires it with the playhead
  // still at zero. That looked like "the episode skips itself the moment you
  // open it". So require that playback actually reached the end.
  function onEnded() {
    const v = video.current;
    const dur = v?.duration;
    const at = v?.currentTime ?? 0;
    const reallyEnded =
      canPlayed.current &&
      Number.isFinite(dur) && dur > 0 &&
      at >= dur - END_SLACK_SEC;
    if (!reallyEnded) return;
    push(true);
    if (nextHref && !cancelled) goNext();
  }

  return (
    <div className="watch-page">
      <nav className="nav">
        <Link href="/" className="nav-logo"><img src="/favicon-mark.svg" alt="" className="nav-mark" />Cursed Shrine</Link>
        <span className="nav-sep">›</span>
        {isMovie ? (
          <span className="nav-title">{decodedShow}</span>
        ) : (
          <>
            <Link href={`/show/${showName}`} className="nav-title">{decodedShow}</Link>
            {isSeasonal && (
              <>
                <span className="nav-sep">›</span>
                <Link href={seasonHref} className="nav-title">{decodedSeason}</Link>
              </>
            )}
            <span className="nav-sep">›</span>
            <span className="nav-title">{epTitle}</span>
          </>
        )}
      </nav>
      <div className="video-wrap">
        <video
          ref={video}
          className="player"
          controls
          autoPlay
          playsInline
          preload="metadata"
          onCanPlay={onCanPlay}
          onTimeUpdate={onTimeUpdate}
          onPause={() => push(false)}
          onEnded={onEnded}
        >
          {tracks?.subs.map((sub) => (
            <track
              key={`${fileUrl}#${sub.i}`}
              ref={(el) => { if (el) trackEls.current[sub.i] = el; else delete trackEls.current[sub.i]; }}
              kind="subtitles"
              src={`${fileUrl}/sub${sub.i}.vtt`}
              srcLang={LANG[sub.lang]?.[1]}
              label={trackLabel(sub, 'Track')}
            />
          ))}
        </video>
        {countdown !== null && nextHref && !cancelled && (
          <div className="next-up" role="dialog" aria-label="Next episode">
            <div className="next-up-label">Next episode in {countdown}s</div>
            <div className="next-up-title">{nextTitle}</div>
            <div className="next-up-actions">
              <button type="button" className="next-up-play" onClick={goNext}>
                ▶ Play Now
              </button>
              <button
                type="button"
                className="next-up-cancel"
                onClick={() => { setCancelled(true); setCountdown(null); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {skipLeft !== null && (
          <button
            type="button"
            className="skip-intro"
            onClick={applySkip}
            aria-label="Skip intro"
          >
            Skip Intro
            <span className="skip-intro-count">{Math.max(skipLeft, 1)}</span>
          </button>
        )}
      </div>
      <div className="watch-info">
        <div className="watch-info-main">
        <div className="watch-show-name">
          {isSeasonal ? `${decodedShow} › ${decodedSeason}` : decodedShow}
        </div>
        {!isMovie && <div className="watch-ep-name">{epTitle}</div>}
        <div className="watch-nav">
          {isSeasonal && (
            <>
              <Link href={seasonHref} className="btn-nav">☰ All Episodes</Link>
              <Link href={`/show/${showName}`} className="btn-nav">📺 Seasons</Link>
            </>
          )}
          {!isSeasonal && !isMovie && (
            <Link href={`/show/${showName}`} className="btn-nav">☰ All Episodes</Link>
          )}
          <Link href="/" className="btn-nav">⌂ Library</Link>
        </div>
        </div>
        <div className="watch-doodles" data-doodle-slot aria-hidden="true" />
        {trackTools}
        {nextEpButton}
      </div>
    </div>
  );
}
