# Owner brief — Phase 003: Complete Layout System (historical input)

Received 2026-11-08. This file records the owner's authoritative brief for feature 003. The
clarified, normative version is [spec.md](spec.md); where the two differ, spec.md records the
decision and its rationale (see [research.md](research.md) §Brief audit).

Summary of the binding owner decisions (numbering follows the brief):

1. **Context** — Phases 001 and 002 closed with PASS (final 002 commit `a9158ca`, CI run
   42451640827, 5/5 jobs). The repository is the source of truth.
2. **Mission** — `@neshel-ui/layout` with Box, Flex, Stack, Inline, Grid, Center, Container;
   evaluate Spacer. Components work with or without Tailwind in the consumer.
3. **Flexbox-first** — Stack = flex column, Inline = flex row, Flex configurable, Center = flex
   centred both axes, Grid = real CSS Grid, Box = neutral block by default, Container =
   width-constrained block with automatic inline margins. Native `gap`, no margin hacks.
4. **Spacing API (mandatory)** — public props `space` (→ `gap`), `spaceX` (→ `column-gap`),
   `spaceY` (→ `row-gap`). No competing `gap`/`rowGap`/`columnGap` props. `space` is mutually
   exclusive with `spaceX`/`spaceY` (which may coexist), enforced by TypeScript (verified with
   TSX fixtures) **and** at runtime with a meaningful error. Spacing props are never forwarded
   to the DOM; SSR and hydration stay consistent.
5. **Alignment API** — `align` (both axes), `alignX`, `alignY` (axis overrides). X = horizontal,
   Y = vertical. Stack X→`align-items`, Y→`justify-content`; Inline X→`justify-content`,
   Y→`align-items`; Grid X→`justify-items`, Y→`align-items`; Center centred by default with
   overrides; Flex resolves by (responsive) direction. `justify` for main-axis distribution
   (start, center, end, between, around, evenly); `alignX="between"` is not a substitute.
   Precedence and LTR/RTL/writing-mode limitations documented and tested.
6. **Responsive API** — typed breakpoint objects (`{ base, md, lg }`), deterministic, no runtime
   interpolation of Tailwind class names, works without Tailwind, CSS kept reasonably small.
   Box/Container expose responsive size/width controls only where meaningful.
7. **tailwind-variants** — principal variant-composition tool (base, variants, default variants,
   compound variants where necessary, composition); evaluate normal vs lite entry. Consumers must
   not compile Tailwind for Neshel; all styles ship in `@neshel-ui/layout/styles.css`; no
   consumer `@source` into node_modules; verify runtime classes against distributed CSS; a
   Storybook build does not prove distribution.
8. **asChild** — on all seven primitives; evaluate `@radix-ui/react-slot`; merge className,
   style, refs, handlers, native attributes; custom components that forward props/refs; React
   19. Reject conflicting `as` + `asChild`; require one valid element; document fragment and
   non-forwarding limitations.
9. **Separators** — Stack and Inline: `separator?: boolean | React.ReactElement`; between items
   only; empty/conditional children; stable keys; no per-child wrappers; default separator
   decorative/hidden from AT using the semantic border token; Stack horizontal, Inline vertical;
   define and test interactions with space/spaceX/spaceY/wrap/responsive/asChild/0-1-n children;
   reject unsupported combinations with diagnostics. No dependency on `@neshel-ui/components`.
10. **Package architecture** — React 19 peer, ESM only, NodeNext declarations, source maps,
    independent exports, tree-shakeable, CSS side effects, no private dependency leaks, no Node
    imports in browser code, `core` private, no runtime dependency on the CLI, justified deps only.
11. **Testing** — unit/type (rendering, semantics, defaults, merging, responsive types, spacing
    exclusivity at type and runtime level, refs, asChild valid/invalid, separators, precedence,
    errors); browser computed CSS (directions, grid, centre, container, spacing, alignment,
    breakpoints, wrapping, separators, theme inheritance); packed external consumers with and
    without Tailwind (CSS inclusion, JSX, peers, declarations, SSR, hydration, exports, no
    leaks); negative tests proving the suite detects broken CSS, exports and invalid props.
12. **Storybook** — docs and stories for every primitive (spacing, X/Y spacing, alignment,
    justification, responsive, asChild, separators, nesting, light/dark, custom themes,
    realistic layouts) using the same distributable CSS.
13. **Spec Kit workflow** — specify, clarify (with these decisions), contracts, ADRs, plan,
    tasks, analyze, implement in milestones 003.0–003.5 (re-orderable), verify, evidence, close.
14. **Authorization** — autonomous implementation, justified dependencies, Conventional Commits,
    fast-forward pushes to `origin/main`, CI verification and fixes. No Co-Authored-By trailers,
    no force-push or rewriting pushed commits, no npm publish, releases or tags, no removal of
    `private: true`, no Phase 004, no unjustified change to established contracts; preserve the
    navy-blue rose identity, gold accents and tagline.
15. **Completion report** — primitives, props/examples, spacing/alignment contracts, responsive
    behaviour, asChild/separators, tailwind-variants architecture, distribution, test and CI
    results (five jobs), traceability and accepted risks, final commit/run IDs, closure
    recommendation (PASS / CONDITIONAL PASS / FAIL). Stop before Phase 004.

_Neshel-UI — Rooted in faith. Built with hope._
