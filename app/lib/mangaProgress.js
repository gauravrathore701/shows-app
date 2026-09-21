'use client';

// Reading position, browser-local. Shape:
//   { "<show>": { "<chapter.cbz>": { page, pages }, __last: "<chapter.cbz>" } }
//
// Video progress is server-side (mecca-api -> Mongo) so it resumes on any
// device; manga has no server store yet, so this is per-browser only.
const KEY = 'mangaProgress';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function readMangaProgress(show) {
  return readAll()[show] || {};
}

export function writeMangaProgress(show, chapter, page, pages) {
  try {
    const all = readAll();
    const forShow = all[show] || {};
    const prev = forShow[chapter]?.page ?? -1;
    forShow[chapter] = { page: Math.max(prev, page), pages };
    forShow.__last = chapter;
    all[show] = forShow;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}
