# Manual checks — Phase 015 (pending until actually run)

None of these has been run. Each needs a person, real assistive technology or real hardware; automated checks do
not replace them.

| #   | Check                                                                                           | Tool / device                      | Status  |
| --- | ----------------------------------------------------------------------------------------------- | ---------------------------------- | ------- |
| 1   | Compare slider announces name, value text and orientation; arrows/Home/End/Page work            | NVDA + Firefox, VoiceOver + Safari | pending |
| 2   | Lightbox: focus lands on Close, Escape closes, focus returns to the thumbnail, background inert | NVDA, VoiceOver (macOS and iOS)    | pending |
| 3   | Toasts announced once (status vs alert), F8 reaches them, Escape closes                         | NVDA, VoiceOver                    | pending |
| 4   | Spinner/progress bar/ring read as busy/progress; no invented value                              | NVDA, VoiceOver                    | pending |
| 5   | Loading button keeps name and focus; Enter/Space do nothing while loading                       | NVDA, VoiceOver                    | pending |
| 6   | Skeleton shimmer never read; container busy state announced                                     | NVDA, VoiceOver                    | pending |
| 7   | Video scrub on iOS Safari (`playsinline muted`, short-GOP clip): frames follow scroll           | iPhone, real Safari                | pending |
| 8   | Compare slider drag + vertical page scroll on touch                                             | physical Android + iOS             | pending |
| 9   | Ambient effects in Windows High Contrast; pending text legible                                  | Windows contrast themes            | pending |
| 10  | Real-GPU frame timings for B02/B04/B05/B07/M09 on a low-end laptop and a phone                  | DevTools performance panel         | pending |
| 11  | Real Safari rendering of duotone filter, dissolve canvas and lightbox dialog                    | Safari (macOS)                     | pending |
