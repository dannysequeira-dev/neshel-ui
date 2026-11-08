# ADR 0009 — Layout composition: `as`, `asChild`, refs, separators and prop validation

- Status: **Accepted** (2026-11-08, within the owner's Phase 003 brief); verification pending
- Date: 2026-11-08
- Feature: [003](../../specs/003-layout-system/spec.md); normative detail in
  [contracts/layout-api.md](../../specs/003-layout-system/contracts/layout-api.md)
- Resolves: "Stable polymorphism / `asChild` / refs contract for layouts and typography"
  (open decision in `docs/architecture.md`) for layout; typography may adopt it in 004.

## Context

Layout primitives must preserve semantic HTML, attach to existing elements without wrappers,
forward refs and native attributes, and reject ambiguous usage instead of guessing. The brief also
requires separators between Stack/Inline items and runtime validation that matches the
TypeScript contract for JavaScript consumers.

## Decision

1. **`as`**: a closed `LayoutElement` union (block, sectioning, list and phrasing containers),
   typed with `HTMLAttributes<HTMLElement>`; element-specific attributes use `asChild`.
2. **`asChild`** via `@radix-ui/react-slot` ^1.5.0 (runtime dependency of `layout`): exactly
   one non-Fragment element child, validated before the Slot with a Neshel error; className
   joined, style merged (child wins), handlers composed (child first), refs composed.
3. **`as` + `asChild`** together throws; the type forbids it.
4. **Refs**: React 19 ref-as-prop; no `forwardRef`.
5. **Separators** on Stack and Inline: inserted between `Children.toArray` items (dropping
   `""`), deterministic keys, no wrappers; default separator decorative (`aria-hidden`) with the
   tag chosen from the host (`li` for lists). `separator` + truthy `wrap` throws;
   `separator` + `asChild` works for host-element children and throws for component children.
6. **Validation**: spacing exclusivity, unknown breakpoints/values, Flex main-axis
   `stretch`/`baseline`, and composition errors throw `NeshelLayoutError` during render, so server
   and client fail identically. `null` means absent.

## Consequences

- One small, well-maintained dependency (`@radix-ui/react-slot` + `react-compose-refs`) instead of
  re-implementing React 19 ref extraction.
- Children that do not forward `className`/`ref` silently lose layout styles (documented).
- Fragments count as one separator item (documented).
- Strict runtime errors surface integration mistakes early; values that TypeScript rejects also
  fail in JavaScript.

## Alternatives considered

- Fully generic polymorphic typing (`as={Link}`): complex types, slower checking; `asChild` covers
  custom components.
- Own Slot implementation: duplicates subtle React 19 ref handling.
- Silently preferring `asChild` over `as`, or dropping separators under `wrap`: forbidden by the
  brief.

## Verification

Planned: unit tests (jsdom) for refs, handlers, merging, invalid children, separator sequences
and keys; type fixtures; SSR + hydration in packed consumers. Results:
`specs/003-layout-system/evidence.md`.
