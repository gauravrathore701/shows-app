#!/usr/bin/env python3
"""Fill season folders with TMDB season-poster URLs.

Writes  heroImage=<url>  into  <show>/Season NN/metadata.txt
Never overwrites an existing metadata.txt. Dry run unless --apply.

TMDB serves localised artwork by requesting IP, so every page
fetch pins ?language=en-US. See
.claude/history/shows-app_english_poster_sweep_20260802_1135.md
"""
import os, re, sys, time, urllib.parse, urllib.request

HDD = "/mnt/hdd"
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126 Safari/537.36")
APPLY = "--apply" in sys.argv


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")


def find_show_id(title, year):
    """First /tv/<id> whose own page title carries the folder's year."""
    q = urllib.parse.quote(title)
    html = get(f"https://www.themoviedb.org/search/tv?query={q}&language=en-US")
    ids, seen = [], set()
    for m in re.finditer(r"/tv/(\d+)", html):
        i = m.group(1)
        if i not in seen:
            seen.add(i)
            ids.append(i)
    for i in ids[:6]:
        try:
            page = get(f"https://www.themoviedb.org/tv/{i}?language=en-US")
        except Exception:
            continue
        t = re.search(r"<title>([^<]*)", page)
        if t and year and year in t.group(1):
            return i, t.group(1).strip()
        time.sleep(0.4)
    return (ids[0], "") if ids else (None, "")


def season_poster(show_id, n):
    html = get(f"https://www.themoviedb.org/tv/{show_id}/season/{n}?language=en-US")
    m = re.search(r"w116_and_h174_face/([A-Za-z0-9]+\.jpg)", html)
    return m.group(1) if m else None


def main():
    written = skipped = missing = 0
    for show in sorted(os.listdir(HDD)):
        show_dir = os.path.join(HDD, show)
        if not os.path.isdir(show_dir):
            continue
        try:
            entries = os.listdir(show_dir)
        except PermissionError:
            continue          # /mnt/hdd/lost+found
        seasons = sorted(d for d in entries
                         if d.startswith("Season ")
                         and os.path.isdir(os.path.join(show_dir, d)))
        if not seasons:
            continue

        todo = [s for s in seasons
                if not os.path.exists(os.path.join(show_dir, s, "metadata.txt"))]
        if not todo:
            print(f"{show}: all {len(seasons)} seasons already have art")
            continue

        ym = re.search(r"\((\d{4})\)", show)
        title = re.sub(r"\s*\(\d{4}\)\s*", "", show).strip()
        sid, matched = find_show_id(title, ym.group(1) if ym else None)
        if not sid:
            print(f"{show}: NO TMDB MATCH")
            missing += len(todo)
            continue
        print(f"{show} -> tv/{sid}  {matched}")

        for s in todo:
            num = int(re.search(r"(\d+)", s).group(1))
            try:
                h = season_poster(sid, num)
            except Exception as e:
                h = None
                print(f"   {s}: fetch failed ({e})")
            if not h:
                print(f"   {s}: no poster on TMDB")
                missing += 1
                continue
            url = f"https://media.themoviedb.org/t/p/w500/{h}"
            path = os.path.join(show_dir, s, "metadata.txt")
            print(f"   {s}: {url}")
            if APPLY:
                with open(path, "w") as f:
                    f.write(f"heroImage={url}\n")
                written += 1
            else:
                skipped += 1
            time.sleep(0.5)

    print(f"\n{'WROTE' if APPLY else 'WOULD WRITE'}: {written or skipped}"
          f"   no poster found: {missing}")
    if not APPLY:
        print("dry run — pass --apply to write")


if __name__ == "__main__":
    main()
