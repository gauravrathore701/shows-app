# Dashboard pin order — 2026-10-25 10:00

Gaurav set the top-of-dashboard order. Done with the existing
`suggestionPoint` key in each show's metadata.txt (sort in app/page.js:
suggestionPoint desc → addedDate desc → name). No code change.

    100 One Piece
     99 Avatar The Last Airbender (2005)
     98 Adventure Time (2010)
     97 Rick and Morty (2013)
     96 Ben 10 (2005)
     95 Ben 10 Omniverse (2012)
     94 Ben 10 Ultimate Alien (2010)
     93 Ben 10 Alien Force (2008)

Everything else stays 0 → newest addedDate first. Was: Adventure Time 100,
One Piece 99. Originals backed up in .claude/backups/pin-order-20261025/.
HOW_TO_ADD_MEDIA.txt "Current pins" line updated. Pin order applies in
every tab (filtered). shows-app restarted; rendered order verified.
