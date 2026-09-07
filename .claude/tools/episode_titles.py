#!/usr/bin/env python3
"""Write per-season episode-title maps from TMDB.

Creates  <show>/Season NN/episodes.txt  as
    01=The More Things Change (1)
    02=The More Things Change (2)

Numbers come from TMDB's data-episode-number, so a season
with gaps on disk still gets the right title for each file.
Skips a season that already has episodes.txt unless --force.
Dry run unless --apply.

?language=en-US on every fetch — TMDB localises by IP.
"""
import html, os, re, sys, time, urllib.parse, urllib.request

HDD = "/mnt/hdd"
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126 Safari/537.36")
APPLY = "--apply" in sys.argv
FORCE = "--force" in sys.argv

EP_RE = re.compile(
    r'data-episode-number="(\d+)"[^>]*?>\s*([^<]+?)\s*</a>', re.S)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")


def find_show_id(title, year):
    q = urllib.parse.quote(title)
    page = get(f"https://www.themoviedb.org/search/tv?query={q}&language=en-US")
    ids, seen = [], set()
    for m in re.finditer(r"/tv/(\d+)", page):
        if m.group(1) not in seen:
            seen.add(m.group(1))
            ids.append(m.group(1))
    for i in ids[:6]:
        try:
            p = get(f"https://www.themoviedb.org/tv/{i}?language=en-US")
        except Exception:
            continue
        t = re.search(r"<title>([^<]*)", p)
        if t and year and year in t.group(1):
            return i
        time.sleep(0.4)
    return ids[0] if ids else None


def titles(show_id, n):
    page = get(f"https://www.themoviedb.org/tv/{show_id}/season/{n}?language=en-US")
    out = {}
    for num, name in EP_RE.findall(page):
        name = html.unescape(name).strip()
        # TMDB pre-creates slots for unaired episodes and labels them
        # "Episode 1181". Storing those would render a title that is just
        # the number twice over.
        if name and not re.fullmatch(r"Episode \d+", name) and num not in out:
            out[num] = name
    return out


def main():
    wrote = 0
    for show in sorted(os.listdir(HDD)):
        show_dir = os.path.join(HDD, show)
        if not os.path.isdir(show_dir):
            continue
        try:
            entries = os.listdir(show_dir)
        except PermissionError:
            continue
        seasons = sorted(d for d in entries if d.startswith("Season ")
                         and os.path.isdir(os.path.join(show_dir, d)))
        if not seasons:
            # Flat show (no Season folders) — see One Piece. Titles go in a
            # single episodes.txt in the show root, keyed by the absolute
            # episode number, merged across every TMDB season.
            continue
        todo = [s for s in seasons
                if FORCE or not os.path.exists(
                    os.path.join(show_dir, s, "episodes.txt"))]
        if not todo:
            print(f"{show}: all seasons already have episodes.txt")
            continue

        ym = re.search(r"\((\d{4})\)", show)
        sid = find_show_id(re.sub(r"\s*\(\d{4}\)\s*", "", show).strip(),
                           ym.group(1) if ym else None)
        if not sid:
            print(f"{show}: NO TMDB MATCH")
            continue
        print(f"{show} -> tv/{sid}")

        for s in todo:
            num = int(re.search(r"(\d+)", s).group(1))
            try:
                t = titles(sid, num)
            except Exception as e:
                print(f"   {s}: fetch failed ({e})")
                continue
            if not t:
                print(f"   {s}: no titles found")
                continue
            lines = [f"{int(k):02d}={v}" for k, v in
                     sorted(t.items(), key=lambda kv: int(kv[0]))]
            print(f"   {s}: {len(lines)} titles  (e.g. {lines[0]})")
            if APPLY:
                with open(os.path.join(show_dir, s, "episodes.txt"), "w") as f:
                    f.write("\n".join(lines) + "\n")
                wrote += 1
            time.sleep(0.5)

    print(f"\n{'wrote' if APPLY else 'would write'} {wrote} episodes.txt files")
    if not APPLY:
        print("dry run — pass --apply")


if __name__ == "__main__":
    main()
