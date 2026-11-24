# Tasks — Phase 017

Legend: `[x]` done and verified locally; `[~]` done, awaiting CI; `[ ]` open. Evidence: [evidence.md](evidence.md).

## 017.0 Recovery & CI investigation

- [x] T001 Read CLAUDE.md, constitution, roadmap, package contracts (start); vision, architecture, ADRs 0012–0014, 0018,
  0020, 0022, 0030 only on 2026-11-24 (found the ADR 0012 §2 deviation, see its amendment); other ADRs not read
- [x] T002 Branch `feature/017-components-completion` from `origin/main` `365a24d`
- [x] T003 Final state of main run 45117009871: 13/14, `browsers / macos-latest` failed (K-15)
- [x] T004 CI audit of every failed run 2026-11-16 → 2026-11-23 ([ci-audit.md](ci-audit.md))
- [x] T005 Instrumented Playwright reproduction (listener ownership, layer updates, focus, dialog count)
- [x] T006 Root cause identified (Radix DismissableLayer deferred highest-layer render) — research R1
- [x] T007 Update CLAUDE.md and roadmap (016 merged, 017 current)

## 017.1 CI stabilization (K-15)

- [x] T010 Deterministic jsdom reproduction, red before the fix (7/9 failing)
- [x] T011 `useLayerOpenState`, layer registry, `useEscapeLayer`, document fallback (`internal/layer.tsx`)
- [x] T012 Dialog/Sheet/MobileMenu, AlertDialog, Popover wired; public APIs unchanged
- [x] T013 Regression tests: sequential, rapid, prevented, consumer handler once, StrictMode + controlled,
  defaultOpen on both, AlertDialog/Sheet/Popover nested, unmount while nested open
- [x] T014 `check:browsers`: no grace delay, failure trace, `nested-overlays-rapid-escape`
- [x] T015 `pnpm stress:overlays` (30× per engine, both cases) — local Windows: before 181/360, after 360/360
- [x] T016 Stress in CI: Windows (validate job), Ubuntu and macOS (browsers job)
- [x] T017 `tests/ts-paths.test.mjs` guard (audit A2) with negative control

## 017.2 Toast migration

- [x] T020 `toast-store.ts` + `toast.tsx` in Components (warning tone, queue overflow, announcements per store)
- [x] T021 F06 → `createEnterExit` / `<EnterExit>` (Motion Host, reduced: fade, `neshel-exit` contract)
- [x] T022 Remove store, Toaster, toast CSS and counters from Animations; type tests updated
- [x] T023 Migrate tests (7 Animations tests → Components; 7 new F06 tests); Animations total stays 602
- [x] T024 Playground lab, Storybook story, packed animations consumer, bundle entries updated

## 017.3–017.5 Accordion, Collapsible, Switch

- [x] T030 Accordion (single/multiple/collapsible, headings, arrows/Home/End, keepMounted, asChild)
- [x] T031 Collapsible (controlled/uncontrolled, disabled, keepMounted, asChild)
- [x] T032 Switch (native button, forms, required, reset fix, Label, sizes, invalid)
- [x] T033 Styles from tokens; reduced motion; forced colours; RTL thumb
- [x] T034 18 unit tests (SSR, hydration, keyboard, controlled/uncontrolled, StrictMode, forms, dialog integration)

## 017.6 Integration & regression

- [x] T040 Packed-consumer lab section (SSR prerender + hydration) for the four components
- [x] T041 Playwright cases (accordion, collapsible, switch, toast) + axe light/dark — 216/216 locally
- [x] T042 CDP cases (Chrome; Windows coverage) — 166/166 locally
- [x] T043 Storybook stories (Disclosure, Switch & Toast) and Playground `components.html`
- [x] T044 EN/ES docs pages + demos + API translations (CI docs gate)
- [x] T045 Budgets measured; owner approved the proposal (2026-11-23)
- [x] T046 Package contracts, READMEs, 015 contract marked superseded

## 017.7 Final validation

- [x] T054 PR #18 review R1/R2 (tests first) and R3 (run table, audit corrections)

- [x] T050 Full local gates (`pnpm check`, Storybook, docs, Next, starters, release simulation)
- [x] T051 PR #18 opened; CI 14/14 on the first attempt (run 45297051951, `d946298`)
- [x] T052 Extra independent runs on the same SHA: 45299935827 and 45299961886, both 14/14; earlier failed runs recorded (ci-audit B1–B4)
- [ ] T053 Owner review and merge (owner only); main CI first attempt after merge
