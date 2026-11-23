# Private release-candidate readiness — `@neshel-ui/animations` (after Phase 016)

**This is a readiness report, not a publication.** No version, tag, npm publication, GitHub Release or release-
workflow change was made. The package stays `private: true` at `0.0.0`, outside the Changesets fixed group of the five
public packages. Completing the 157-entry catalogue does **not** authorise the first publication (owner decision D1).

## 1. Verified (with evidence)

| Area                       | Status                                                                                                       | Evidence                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Catalogue                  | 157/157 entries implemented (D01–D11 in this phase)                                                          | catalogue, [evidence.md](evidence.md) §2 |
| Unit and composition tests | 597 animations tests; composition matrices 009–016                                                           | `pnpm check`                             |
| Real engines               | CDP Chrome 196/196; Playwright Chromium, Firefox, WebKit 204 each                                            | evidence §17                             |
| Packed tarball             | publint/attw/external import and type checks (`check:pack --with animations`); exports, files, `sideEffects` | `pnpm check`                             |
| External consumers         | Vite SSR + hydration from the tarball; React Router 8.5.0 and Next.js 16.4.5                                 | evidence §16                             |
| Bundle sizes               | every entry measured from the tarball with tree-shaking markers                                              | evidence §14                             |
| SSR safety                 | no `window`/`document`/WebGL access at import (all subpaths)                                                 | contract tests                           |
| Accessibility (automated)  | axe on the full lab; inert/aria-hidden contracts; keyboard paths; reduced motion live                        | evidence §8–9                            |
| Dependencies               | runtime: `@radix-ui/react-slot` only; React peer; optional Next/React Router peers                           | contract test                            |
| Three-OS CI                | run 45104021295 success 14/14 (Firefox-on-Linux GPU rows skipped, K-16)                                      | CI                                       |

## 2. Accepted limitations (documented, not blockers in the owner's earlier reviews)

K-2, K-3, K-5–K-16 ([evidence.md](evidence.md) §19 and earlier phases): headless-only GPU figures, WebKit headless
costs of large layers, View Transition differences, M06 unverified in WebKit, D05 clone fidelity limits, expensive
animated tilt-shift with four bands, a WebKit context drop under churn (recovered).

## 3. Manual verification still pending

Screen readers (NVDA + Firefox, VoiceOver + Safari macOS/iOS) for flip, cube, ring, CornerRecede, glitch, GPU images and
the Phase 015 list; real Safari rendering; physical touch devices; Windows High Contrast; real-GPU frame timings and
real context loss on a low-end laptop and a phone ([manual-checks.md](manual-checks.md); Phase 015 manual checks).

## 4. Owner decisions taken (PR #17 review, 2026-11-23)

- ADR 0031 approved (Accepted after R1/R2); the 17 Phase 016 budgets approved as proposed; earlier budgets frozen.
- K-16 accepted as a narrow CI exception only (Firefox + Linux + genuine WebGL2 absence; a skip is not a pass).
- Manual checks are **mandatory before the first publication** (not before merge) and remain pending.

## 5. First-publication gate (owner list; all pending)

1. Screen readers: NVDA + Firefox (real Windows), VoiceOver + Safari (real macOS or iOS) — CardFlip, Cube, Ring,
   CornerRecede, Glitch, GPU native-image semantics, Phase 015 toast/lightbox/loading and focus restore; record steps.
2. Real Safari (macOS, iOS) and physical iPhone/Android touch: 3D transforms, D05, D11, WebGL fallback, M06 scrub,
   navigation transitions (Playwright WebKit is not Safari).
3. Physical GPU: an integrated-GPU laptop and a phone — D04/D06/D08/D10 timings vs baseline, resize/DPR, churn and
   memory budget, real `WEBGL_lose_context` recovery and fallback; no universal 60 FPS promise.
4. Windows High Contrast, reduced motion, photosensitivity (glitch ≤ 3/s, no full-screen flashing).
5. Release process: repeatable fresh first-attempt clean CI on the candidate; disposition of the Components
   nested-overlay macOS flake (K-15); independent packed installs; provenance, licence, docs, changelog, names,
   version and OIDC trusted-publishing plan reviewed. Every npm/version/tag/release-workflow/guard change needs
   separate, explicit permission.

K-2, K-3 and K-5–K-16 are documented, not waived for a public release.
