# Brief — Phase 017: Components Completion, Toast Migration & CI Stabilization

Owner direction, 2026-11-22 (summarised; the owner's message is the source of truth).

- Base: `main` `365a24d` (PR #17, Phase 016). Animations 157/157, private `0.0.0`.
- Five work items, in slices 017.0–017.7:
  1. **K-15 is a blocker** — nested-overlay Escape order fails intermittently in CI (runs 45117009871,
     45112369472, 45101418861; 45079243865 needed a rerun). Reproduce, find the cause, fix it without timeouts,
     sleeps, retries, skips or relaxed assertions; regression tests; ≥ 30 repetitions per scenario on the
     engines and OSes really available; a controlled regression must make the test fail.
  2. **Toast/Toaster moves to `@neshel-ui/components`** (store, timers, queue, actions, focus, a11y,
     rendering). Animations keeps **F06 only as a generic enter/exit motion primitive** (no messages, ARIA roles,
     actions, durations or queue). No second store. The catalogue stays 157/157. Toast works without Animations.
  3. **Accordion** (`Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`).
  4. **Collapsible** (`Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`).
  5. **Switch**.
- Audit recent CI failures by class (code, configuration, tests, functional, infrastructure, quality, flakes),
  with run, SHA, job, exact error, cause, reproduction, fix, regression test and later result. K-16 (Firefox on
  Ubuntu without WebGL2, six explicit skips) stays authorised. Issue #9 stays closed.
- Identity: navy `#193767`, ivory `#FBF9F6`, gold `#C49A59`, Inter — through semantic tokens only, never
  hard-coded in components.
- Components `0.1.0` APIs stay compatible. No Components ↔ Animations dependency. Budgets not raised without
  approval.
- Acceptance: one CI run 14/14 **on the first attempt** on the exact final PR SHA; every run recorded, including
  failures; after the owner's merge, main CI must also pass on the first attempt.
- No publish, version bump, release changeset, tag, GitHub Release, OIDC or release-workflow change; the
  Animations `private` guard stays. Commits, push and the Phase 017 PR are allowed; **never merge automatically**.
- Next phases (not started here): 018 public EN/ES documentation; 019 visual audit and docs sidebar; 020 release
  readiness.
