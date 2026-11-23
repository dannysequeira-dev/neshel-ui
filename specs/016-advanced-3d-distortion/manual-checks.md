# Manual checks — Phase 016 (pending until actually run)

None of these has been run. Each needs a person, real assistive technology or real hardware; automated checks do
not replace them.

| #   | Check                                                                                                   | Tool / device                      | Status  |
| --- | ------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------- |
| 1   | Card flip: the hidden face is never announced or reachable; focus lands on the visible face             | NVDA + Firefox, VoiceOver + Safari | pending |
| 2   | Cube rotation: only the active panel is read; focus is kept when a control changes the panel            | NVDA, VoiceOver                    | pending |
| 3   | Ring carousel: "carousel"/"slide n of N" announced; arrows/Home/End; live region announces once         | NVDA, VoiceOver                    | pending |
| 4   | CornerRecede: the flap copy is never announced; links and buttons inside the card stay operable         | NVDA, VoiceOver                    | pending |
| 5   | Glitch: text read once; no perceived flashing (subjective review with photosensitivity guidance)        | NVDA, a person, PEAT-like analyser | pending |
| 6   | GPU effects: images keep their alt text; nothing disappears with WebGL disabled in the browser settings | NVDA, VoiceOver; browser flags     | pending |
| 7   | Real-GPU frame timings for D04/D06/D08/D10 on a low-end laptop (integrated GPU) and a phone             | DevTools performance panel         | pending |
| 8   | Context loss on a real GPU (driver reset / tab backgrounding on mobile) restores the effects            | Chrome/Edge, Safari iOS            | pending |
| 9   | Real Safari rendering of `preserve-3d` (D01–D03), the hinged fold (D05) and `backdrop-filter` (D11)     | Safari (macOS, iOS)                | pending |
| 10  | Ring carousel drag and vertical page scroll on touch                                                    | physical Android + iOS             | pending |
| 11  | Windows High Contrast / forced colours: flip faces, panels and carousel items remain legible            | Windows contrast themes            | pending |
