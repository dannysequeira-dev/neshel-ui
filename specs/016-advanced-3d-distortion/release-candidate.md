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

## 4. Decisions that need the owner

1. Accept, amend or reject **ADR 0031** (WebGL2 own layer in `./gpu`, no graphics dependency).
2. Approve the **17 proposed bundle budgets** (evidence §14).
3. Whether the manual checks above must run before a first publication, and on which devices.
4. The first version number and line for animations (D2: independent version line), the changelog entry, and whether
   `./gpu` ships in the first release or later.
5. Lifting the `private` guard, adding the package to the release scripts (outside or inside the fixed group),
   trusted publishing for it, and the release run itself — each a separate, explicit authorisation.
6. Whether the experimental status badge and README wording change for a first release.
