# Contract — Composition matrix (Phase 013)

Each row has a unit test (jsdom, manual frames; `test/composition-013.test.mjs`) and, where marked, a
browser case. "Restored" means the element's `style` attribute string and its attribute set are equal to
the snapshot taken before the effects were attached.

| #   | Combination                               | Expectation                                                                                                                                                  | Browser |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| 1   | Timeline + Entrance (effect track)        | `scrub`: follows the timeline clock (seek/reverse/interruption), no own clock; `trigger`: its own controller clock; identity at the end; restored on destroy | yes     |
| 2   | Timeline + Hover/Press                    | hover lift layer composes with a pose track on the same element (sum); both release independently                                                            | yes     |
| 3   | Timeline + ScrollScene                    | scene chapters scrubbed by a scroll progress source; parallax layer and timeline layer compose                                                               | yes     |
| 4   | Timeline + FLIP                           | FLIP inversion layer and pose track compose during a layout change                                                                                           | —       |
| 5   | Timeline + Presence                       | a track whose element exits through `<Presence>` detaches without error; others continue                                                                     | —       |
| 6   | Timeline + reduced motion live            | on → finish with calls once; off → nothing replays                                                                                                           | yes     |
| 7   | Scene Chapters + Parallax                 | depth layer (scroll) + segment pose (timeline) on one element compose; scroll unaffected (no writes)                                                         | yes     |
| 8   | Camera + existing transforms              | consumer inline transform on the canvas kept as prefix; Tilt3D on a canvas child unaffected                                                                  | —       |
| 9   | Page transition + Presence                | exiting page kept by Presence does not duplicate shared names (old names cleared before new assigned)                                                        | —       |
| 10  | Shared-element morph + Layout             | FLIP fallback uses the 012 animator; with a layout item on the same element both layers compose                                                              | —       |
| 11  | Rapid navigation + interrupted transition | second `startPageTransition` interrupts the first (`interrupted`), final DOM = second update, names clean                                                    | yes     |
| 12  | Two transitions competing for one element | one name owner; the later transition owns the name; the earlier released without restoring stale values                                                      | yes     |
| 13  | Cleanup after a failed navigation         | update throws → `failed`, names/classes/attributes restored, progress bar back to idle                                                                       | yes     |
| 14  | Two timelines on one element              | two pose tracks compose; cancelling one keeps the other's contribution; destroy both → restored                                                              | —       |
| 15  | C08 blur + Entrance blurIn                | `filter` arbitration: higher priority wins, the other suspended and resumed; restored at the end                                                             | —       |
