# Contract — composition matrix (Phase 010)

**Status: implemented; verified by unit tests (`test/composition.test.mjs`) and the lab in three engines**
([evidence](../evidence.md)). Rules: 009 [channels-and-arbitration.md](../../009-motion-engine/contracts/channels-and-arbitration.md),
[style-ownership.md](../../009-motion-engine/contracts/style-ownership.md); ADR 0025.

## §1 What each family writes on the consumer's element

| Family                                | `transform` (compose) | `opacity` (multiply) | exclusive channels                             | tokens / layers                   |
| ------------------------------------- | --------------------- | -------------------- | ---------------------------------------------- | --------------------------------- |
| Entrance E01–E04, E08, E09, E11       | layer during the run  | contribution         | —                                              | —                                 |
| Entrance E05 / E06 / E07              | (E05: none)           | E05 contribution     | `filter` / `clip-path` / `mask` during the run | —                                 |
| Entrance E10                          | on each child         | on each child        | per child preset                               | —                                 |
| Tilt3D (H03)                          | layer                 | —                    | —                                              | `data-neshel-tilt`                |
| Lift, magnetic                        | layer                 | —                    | lift: `--neshel-lift-progress`                 | lift: `decor`                     |
| Glow, spotlight, underline, shine     | —                     | —                    | their `--neshel-<effect>-*`                    | `decor` (`::before`)              |
| Border sweep                          | —                     | —                    | `--neshel-layer-after`, `--neshel-sweep-*`     | `::after`                         |
| Media zoom / parallax                 | on the media / layers | —                    | —                                              | media zoom: overflow on the frame |
| Press scale, tap bounce, shake, nudge | layer                 | —                    | —                                              | —                                 |
| Ripple, burst                         | —                     | —                    | —                                              | owned child layer                 |

## §2 Required combinations (one element)

| Combination                                   | Result                                                                                          | Verified by    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------- |
| Entrance + Hover                              | transform layers add (fade-up translate + lift translate); decor independent; no conflict       | unit + lab     |
| Entrance + Press                              | entrance layer × press scale (scales multiply)                                                  | unit           |
| Hover + Press                                 | lift translate + press scale in one composed transform; ripple layer + decor `::before` coexist | unit + lab     |
| Tilt3D + Hover                                | tilt rotations + lift translate (same composer); glow/spotlight on `::before`                   | unit + lab     |
| Tilt3D + Press                                | tilt scale × press scale                                                                        | unit + lab     |
| Entrance + Tilt3D + Press                     | all three layers composed; destroying any one leaves the other two exact                        | unit + lab     |
| Consumer inline `transform`                   | kept as the prefix of the composed transform; restored exactly (009 ledger)                     | unit           |
| Consumer inline `opacity`                     | multiplied by the entrance contribution; restored exactly                                       | unit           |
| Consumer `translate` / `rotate` / `scale` CSS | untouched (the engine writes `transform`); both apply                                           | lab (008 case) |

## §3 Genuine conflicts and their resolution

| Conflict                                                         | Resolution (009 arbitration)                                                                                                |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `blurIn` + another `filter` owner                                | first owner keeps it on equal priority; the other is suspended (all-or-none) and resumes on release; dev warning names both |
| `clipReveal` / `maskWipe` + another `clip-path` / `mask` owner   | same                                                                                                                        |
| `borderSweep` + another `::after` user (`--neshel-layer-after`)  | same                                                                                                                        |
| The same exclusive effect twice on one element (e.g. two `glow`) | the second is suspended (its `--neshel-glow-*` are owned) with a warning                                                    |
| Same compose-only effect twice (two `lift`s)                     | both layers add (documented: compose channels never conflict)                                                               |

A suspended entrance never hides content: its setup did not run, so no start pose was written.

## §4 Known limits

- Consumer **stylesheet** `transform`/`opacity`/`filter` on the same element are invisible to the host and
  replaced by inline values while an effect contributes (009 §6). Use individual transform properties for
  static design transforms, or animate a wrapper.
- Hosts with their own `::before` content cannot use decor effects; hosts with their own `::after` cannot
  use the border sweep.
- Per-axis rotation sums are approximate for several rotating layers (008); flip + tilt on one element
  approximates the compound rotation.
- Several copies of the package on one page do not coordinate (009 §6).
