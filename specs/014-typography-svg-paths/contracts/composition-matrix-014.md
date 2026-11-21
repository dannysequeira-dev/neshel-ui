# Contract — Composition matrix (Phase 014)

Each row has a unit test (`test/composition-014.test.mjs`; rows 19–20 in `test/review-014.test.mjs`; jsdom, manual frames) and, where marked, a
browser case in the Phase 014 gallery suite. "Restored" = the element's `style` attribute string, attribute
set and child nodes (identity and order) equal the snapshot taken before.

| #   | Combination                                    | Expectation                                                                                             | Browser |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Split text + Entrance                          | Entrance layer/opacity on the element, reveal on the pieces; both end visible; restored                 | yes     |
| 2   | Split text + Capsize                           | `neshel-text-trim` element: trim pseudo-elements untouched; box height equal before/after the split     | yes     |
| 3   | Split text + Timeline                          | `track()` in `createTimeline`: seek/reverse render the same values as `seek()`; destroy restores        | yes     |
| 4   | Typewriter + reduced motion                    | on mid-run → finish (all text, no blink); off → nothing replays                                         | yes     |
| 5   | Scramble + content change                      | React re-render with new text re-splits; no stale glyphs; one accessible copy                           | yes     |
| 6   | Rotating words + resize                        | box = largest word at every width; no layout shift during swaps                                         | yes     |
| 7   | Line reveal + ScrollScene                      | scroll progress drives lines; reduced motion shows all and ignores the source                           | yes     |
| 8   | Path draw + Timeline                           | dash offset follows the timeline (seek/reverse); release restores consumer dashes                       | yes     |
| 9   | Path morph + interruption                      | a new `to()` mid-run continues from the rendered shape; `d` restored on destroy                         | yes     |
| 10  | Motion path + existing transforms              | consumer inline `transform` kept; native offset or fallback layer composes; restored                    | yes     |
| 11  | Icon morph + keyboard                          | Enter/Space on the consumer button toggle state; focus and `aria-expanded` owned by the consumer        | yes     |
| 12  | Gradient stops + forced colours                | forced colours → static; stops untouched                                                                | yes     |
| 13  | Logo reveal + reduced motion                   | instant: logo visible, no mask written                                                                  | yes     |
| 14  | Turbulence + hidden page                       | page hidden → no scheduler task; visible → resumes; destroy removes the filter and the claim            | yes     |
| 15  | Text and SVG simultaneously                    | one timeline with a text track and a path track; one scheduler task; both restored                      | yes     |
| 16  | Highlighter + gradient sweep                   | two tokens, two host properties, independent release                                                    | —       |
| 17  | Path draw + dash flow on one path              | exclusive dash channels: the later claim waits (arbitration) and resumes when the first releases        | —       |
| 18  | Font axes + consumer `font-variation-settings` | consumer axes preserved in the merged value; exact restoration                                          | yes     |
| 19  | Two morphs on one `<path>` (review R2)         | one writer of `d`: the later waits and resumes with its last shape; either destroy order; restored once | —       |
| 20  | Two gradient-stop loops on one stop (R2)       | one writer of `offset` at a time; the waiting loop resumes; original offset restored                    | —       |
