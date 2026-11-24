# Plan — Phase 017: Components Completion, Toast Migration & CI Stabilization

Spec: [spec.md](spec.md) · Research: [research.md](research.md) · Tasks: [tasks.md](tasks.md) · Evidence:
[evidence.md](evidence.md) · CI audit: [ci-audit.md](ci-audit.md)

## Technical context

- React 19, TypeScript strict, Node 26 (floor 22.13), pnpm 12; Windows/Linux/macOS parity (ADR 0003).
- Components: Radix (overlays) + Base UI 1.9 (selection; now also accordion, collapsible, switch) — no new
  dependency. Styles generated from `style-tables.ts` (semantic tokens, ADR 0013).
- Animations: private 0.0.0; family subpaths never import each other; Motion Host owns style writes (ADR 0022).
- No Components ↔ Animations dependency: composition through DOM contracts only (`data-state`, `neshel-exit`).

## Constitution check

| Principle                 | How the plan complies                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| II Modular packages       | Toast moves to Components; F06 stays generic in Animations; no cross dependency               |
| III CSS-first tokens      | All new styles from tokens; no hard-coded brand colours; no Tailwind requirement              |
| IV Accessibility          | Headings, `aria-expanded/controls`, `role=switch`, live regions, focus return, reduced motion |
| VI Evidence before claims | Deterministic K-15 reproduction, negative controls, packed consumers, three engines, CI runs  |
| VII Small slices          | 017.0–017.7 below, each committed separately                                                  |
| VIII Safe releases        | No version, changeset, tag, publish; Animations guard untouched; PR never merged by us        |
| IX Cross-platform         | Stress on Windows (validate job) and Ubuntu/macOS (browsers job); Node-only scripts           |

## Slices

| Slice | Content                                                                                                                                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 017.0 | Recover state; CI audit; instrumented reproduction of K-15; cause analysis (research R1)                                                                                                                         |
| 017.1 | Layer registry + Escape routing in `internal/layer.tsx`; roots own open state; jsdom regression tests; CI cases without delay + rapid Escape; `stress:overlays` in CI on three OSes; `tests/ts-paths` guard (R6) |
| 017.2 | Toast store/renderer in Components; F06 → `createEnterExit`/`<EnterExit>`; remove the Animations store; update lab, Storybook, packed consumer, budgets entries                                                  |
| 017.3 | Accordion (Base UI) + arrow navigation, headings, single/multiple/collapsible                                                                                                                                    |
| 017.4 | Collapsible (Base UI)                                                                                                                                                                                            |
| 017.5 | Switch (Base UI native button) + form reset                                                                                                                                                                      |
| 017.6 | Packed-consumer lab sections, Playwright + CDP cases, Storybook, Playground page, EN/ES docs pages, budgets (owner-approved 2026-11-23)                                                                          |
| 017.7 | Full CI on the final PR SHA (first attempt), extra independent runs, evidence                                                                                                                                    |

## Risks

- macOS minifies larger than Windows (audit A8): budgets keep ~10 % headroom (owner-approved values).
- Base UI future releases may change markup/attributes the CSS keys on (`data-panel-open`, `data-checked`,
  panel-height variables) — covered by computed-style and browser cases.
- Radix future releases may fix or change DismissableLayer ordering — the registry still decides at event time and
  the regression tests pin the contract.
