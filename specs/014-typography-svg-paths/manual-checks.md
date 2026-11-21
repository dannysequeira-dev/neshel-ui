# Manual checks — Phase 014 (reproducible; pending owner execution)

None of these checks has been run by the implementer. Record results here with date, OS, browser and
screen-reader versions. Automated equivalents (accessibility tree, `aria-hidden`, axe) are in the lab.

Setup: `pnpm build:playground`, then serve `apps/playground-vite/dist` (e.g. `pnpm --filter
@neshel-ui/playground-vite preview`) and open `/animations.html#text-svg-title`.

## M1 — NVDA (Windows) with Firefox and with Chrome

1. Browse mode, `H` to the "Typography & Text" heading, then `H` through the T01 heading demo. Expected: the
   heading text is read once as a whole sentence, never letter by letter.
2. Down arrow through T02 (typewriter) while it types. Expected: the complete sentence, no character
   announcements, the caret is not read.
3. T03 scramble during decoding. Expected: only the real text; no random characters.
4. T05 number roll: press "Change value". Expected: no automatic announcement; reading the value gives the
   localised target value (e.g. "−1.234,56 €").
5. T06 rotating words. Expected: the sentence with the full list once; no repeated announcements.
6. RTL demo (Hebrew/Arabic) and the emoji demo. Expected: words read in correct order; emoji names whole.
7. Select the T01 sentence with the mouse, copy, paste into Notepad. Expected: the sentence once.

## M2 — VoiceOver (macOS) with Safari

Repeat M1 steps 1–7 with VO+Right Arrow navigation and the rotor (headings). Expected results are the same.

## M3 — Keyboard

1. Tab to the S04 menu button; Enter and Space toggle the icon; `aria-expanded` changes (inspect); focus stays.
2. Tab through the gallery: no focus moves caused by any effect; T06 pauses while focus is inside it.

## M4 — Forced colours (Windows High Contrast)

T04 and T08 text stays readable (plain text / underline); T03 shows the real text; S05 is static.

## M5 — Reduced motion (OS setting toggled while the page is open)

T07 stops; T02 completes; S09 freezes with dashes visible; S07 filter disappears.
