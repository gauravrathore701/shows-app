# Staging sweep after Omniverse completion — 2026-09-06 15:30

## Deleted (approved by Gaurav)
Seven directories under /mnt/hdd/Copy To Pi/, 12 files,
~2.3 GB:
    S01_E01-E10-20260906T090656Z-1-001   3 files
    S02_E01-E10                          1
    S03_E01-E10                          3
    S04_E01-E10                          2
    S05_E01-E10                          1
    S06_E01-E10                          1
    S08_E01-E10                          1

Every file had been byte-compared with `cmp` against its
library counterpart beforehand and confirmed IDENTICAL —
not merely equal in size. Nothing unique was removed.

## Kept
    HOW_TO_ADD_MEDIA.txt      the intake doc
    UA duplicate encodes/     see below

## UA duplicate encodes — NOT deleted, needs a decision
Two files, both Ben 10 Ultimate Alien:
    Ben 10 Ultimate Alien S03E11.mkv  157 MB
    Ben 10 Ultimate Alien S03E14.mkv  169 MB
The library already holds both episodes, but at 199 MB
each — so these are genuinely DIFFERENT encodes, not
byte-identical copies like the Omniverse ones. Deleting
them is a judgement call about which encode to keep, not
a duplicate cleanup, so it was left to Gaurav.

## Staging after
    /mnt/hdd/Copy To Pi/  327 MB
Disk: 237G free of 458G.

## Follow-up 15:35 — UA duplicate encodes deleted
Gaurav's call: keep the larger library encodes, delete the
staging copies.

Removed /mnt/hdd/Copy To Pi/UA duplicate encodes/
    Ben 10 Ultimate Alien S03E11.mkv  165,119,461 B
    Ben 10 Ultimate Alien S03E14.mkv  177,537,034 B

Library copies confirmed present and larger before the
delete, and re-confirmed after:
    S03E11  209,002,070 B
    S03E14  208,799,546 B
Ultimate Alien remains 52/52.

Ben 10 is now entirely out of staging.

## New arrival, untouched
A "One Piece" folder appeared in staging during this work —
5 x .mp4, episodes 1172-1176, 1080p SubsPlease, ~1.3 GB.
Not sorted, not moved, not mentioned in any request yet.
