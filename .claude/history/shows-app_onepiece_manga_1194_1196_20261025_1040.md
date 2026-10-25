# One Piece manga 1194–1196 intake — 2026-10-25 10:40

Pulled `E:\Copy To Pi\One Piece 119{4,5,6}.cbz` from the PC over the direct
cable (scp, 192.168.50.2) into staging, `unzip -t` clean, then `mv -n` to
`/mnt/hdd/One Piece/Manga/1P Chapter NNNN.cbz`, chmod 777.
Pages 12 / 15 / 16, PNG names but JPEG bytes (reader sniffs magic, fine).

chapters.txt appended (backup .claude/backups/chapters.txt.bak-20261025),
titles from Wikipedia "List of One Piece chapters (1016–current)" raw
wikitext — titles sit in the nihongo rows in order after 1193:
1194 All Things Are In Flux · 1195 Weakness ·
1196 The Love of the Suicidal is Worthless.

Verified via /api/manga: titles listed, page counts right, page 0 = 200
image/jpeg for all three. PC source files left in place.
