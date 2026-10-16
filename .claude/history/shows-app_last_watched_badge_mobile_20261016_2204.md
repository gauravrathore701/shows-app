# Last Watched badge overflow on mobile

Badge (`.ep-last-badge`, nowrap) pushed past card edge on phones once the title wrapped.
Fix: under 640px, `.ep-last-watched` is relative and badge sits absolute on the card's top-right border.
Also covers "Last Read" in ChaptersList (same classes). Rebuilt + restarted shows-app; verified with mock card at 412px.
