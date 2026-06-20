# Shows App — Hero Poster Images — 2026-06-20 11:30

## What changed
- Added `heroImage=<url>` to every `metadata.txt` in `/mnt/hdd/*`
- Poster URLs sourced from `media.themoviedb.org/t/p/w500/`
- Updated `next.config.js` to whitelist `media.themoviedb.org` for Next.js Image
- Updated `app/page.js` to parse `heroImage` from metadata and render via `<Image fill>`
- Changed `.show-thumb` aspect-ratio from `16/9` to `2/3` (poster format) and added `overflow:hidden`

## Poster URLs added
| Folder | URL |
|--------|-----|
| 500 Days of Summer (2009) | /qXAuQ9hF30sQRsXf40OfRVl0MJZ.jpg |
| Avatar The Way Of Water (2023) | /qnzQm0PCVnSyv1dqpVmRgMWHbLD.jpg |
| Blade Runner 2049 | /gajva2L0rPYkEWjzgFlBXCAVBE5.jpg |
| Blue Valentine (2010) | /dc8BdKnDY5Iy28KzUGtHIXuqqFK.jpg |
| Fences (2016) | /8NvnB8aeWQvBEz2ruN4g313j991.jpg |
| Manchester by the Sea (2016) | /o9VXYOuaJxCEKOxbA86xqtwmqYn.jpg |
| Oppenheimer (2023) | /8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg |
| Puss in Boots - The Last Wish (2022) | /kuf6dutpsT0vSVehic3EZIqkOBt.jpg |
| GOTS3 | /seGbGCqUI1DzYndRekrpuBQS64k.jpg |
| One Piece | /zGDhn834DojaLU7KkczgWWk75ET.jpg |
| Hellsing Ultimate | /fum0tvBuVVeofFoHI0IXHgrzKEa.jpg |
