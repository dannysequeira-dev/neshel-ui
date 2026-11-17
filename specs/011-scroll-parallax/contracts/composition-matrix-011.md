# Contract — composition matrix (Phase 011)

**Status: specified (011.0)**; implementation tracked in [tasks.md](../tasks.md). Extends
[010 composition-matrix.md](../../010-animation-effects/contracts/composition-matrix.md).

Scroll effects that move the consumer's element contribute **transform layers** and **opacity factors** to
its motion host (ADR 0019/0022): translations add, rotations/skews add, scales multiply, opacities
multiply. Custom-property outputs (`--neshel-view-progress`, `--neshel-scroll-progress`,
`--neshel-scene-progress`, `--neshel-scroll-color`, `--neshel-stack-index`) are exclusive channels.

| Pair on one element                                | Expected                                                                 | Test       |
| -------------------------------------------------- | ------------------------------------------------------------------------ | ---------- |
| SP01 parallax + Tilt3D                             | translate + rotate composed; destroying either keeps the other           | unit + lab |
| SP02 scrub + Hover lift                            | translateY sum; hover springs and scroll progress independent            | unit + lab |
| SP07 zoom + Press scale                            | scales multiply                                                          | unit       |
| SP11 skew + SP01 parallax                          | skew + translate in one transform                                        | unit       |
| ST01 reveal (Entrance) + Hover                     | entrance from-pose layer + hover layer; reveal end clears only its layer | unit + lab |
| ST01 + consumer inline transform/opacity           | consumer value is the prefix/base; restored exactly on destroy           | unit       |
| ST05 + another `--neshel-view-progress` writer     | second claim suspended (arbitration policy), resumes on release          | unit       |
| SP05 scene + nested SP01 layers + Hover on a layer | scene variable on section; layer transforms composed                     | lab        |
| ST06 header + Press on a header link               | different elements; no interaction                                       | lab        |
| Native SP03/ST05 + JS writes elsewhere             | native animates only its custom property; host ledger untouched          | lab        |

Rules: no scroll effect writes `transform`, `opacity` or `translate/scale/rotate` outside the host; no
package stylesheet declares `transition`/`animation`/`animation-timeline` on a consumer element (R-1 —
the contract test scans `scroll.css`); destroying any scroll effect restores the element's pre-existing
inline styles while other contributions continue.
