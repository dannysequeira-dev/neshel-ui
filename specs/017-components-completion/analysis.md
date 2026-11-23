# Analysis — spec ↔ plan ↔ tasks consistency (Phase 017)

| Requirement                                              | Covered by tasks | Verified by                                                                                                 |
| -------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| FR-001 one layer per Escape, topmost handler once        | T011–T013        | `layers.test.mjs` (9), `check:browsers` nested cases, `stress:overlays`                                     |
| FR-002 no timing dependence                              | T010, T014       | jsdom reproduction presses Escape before the deferred render; CI case has no delay                          |
| FR-003 focus return, no orphan overlay                   | T013, T014       | focus assertions (jsdom + browsers), overlay check in `nested-overlays-escape-order`                        |
| FR-004 APIs and Radix semantics unchanged                | T012             | existing interactive tests (unchanged, passing), typecheck of consumers, docs API diff limited to additions |
| FR-005 ≥ 30 repetitions per engine on three OSes         | T015, T016       | `stress:overlays` in validate (Windows) and browsers (Ubuntu, macOS) jobs                                   |
| FR-006 CI audit                                          | T004             | [ci-audit.md](ci-audit.md)                                                                                  |
| FR-010–FR-014 Toast API/behaviour/no provider            | T020             | `toast.test.mjs` (10), Playwright `toast-announce-hotkey-escape`, CDP `toast-hotkey-escape-focus`           |
| FR-015 no notification store in Animations               | T022             | exports diff in [evidence.md](evidence.md); bundle marker `toaster: false`                                  |
| FR-016 F06 generic, Motion Host, reduced motion, 157/157 | T021, T023       | `enter-exit-017.test.mjs` (7), lab F06 case on the Components Toaster (CDP + 3 engines)                     |
| FR-020–FR-022 Accordion/Collapsible                      | T030, T031, T033 | 13 unit tests, Playwright `accordion-keyboard`/`collapsible-toggle`, CDP case, axe                          |
| FR-030 Switch                                            | T032, T033       | 5 unit tests, Playwright `switch-keyboard-and-form` (real Space), CDP case, axe                             |
| FR-040 no cross dependency / new dependency              | —                | grep (comments only), package manifests unchanged except Playground                                         |
| FR-041 0.1.0 compatibility                               | —                | additions only; `check:pack`, `check:consumer`                                                              |
| FR-042 tests/stories/playground/consumers                | T040–T044        | listed in evidence                                                                                          |
| FR-043 budgets                                           | T045             | owner approval 2026-11-23; `check:bundles`, `check:animations:bundles`                                      |

## Findings

1. **Resolved — Switch form reset** (found while writing FR-030 tests): Base UI kept the toggled state after
   `form.reset()`; Neshel now owns the uncontrolled state and listens to the form's `reset`.
2. **Resolved — Collapsible inside an Accordion panel** would inherit `--accordion-panel-height` through a combined
   CSS fallback; each panel now reads only its own variable.
3. **Resolved — internal spec path leaking into public API docs** (module comment of the toaster store parsed as a
   description); turned into a plain comment.
4. **Recorded limitation** — layers not owned by Neshel roots (a consumer's own Radix popover, Neshel
   DropdownMenu/Tooltip/NavigationMenu) keep Radix behaviour ([overlay-escape.md](contracts/overlay-escape.md)).
5. **Recorded limitation** — Space activation of the native switch button is not simulated by jsdom; it is verified
   with real keyboard input in Chromium, Firefox, WebKit (Playwright) and Chrome (CDP).
