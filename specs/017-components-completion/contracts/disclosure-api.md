# Contract — Accordion and Collapsible (`@neshel-ui/components`)

Primitive: Base UI `@base-ui/react` 1.9 `accordion` / `collapsible` (existing dependency; research R3). Base UI parts,
event details and `render` props are not exposed. Implementation: `accordion.tsx`, `collapsible.tsx`.

## Accordion

```tsx
<Accordion
  type?="single" | "multiple"        // default "single"
  value? defaultValue? onValueChange?  // single: string | null; multiple: string[]
  collapsible?                          // single only, default false
  disabled? headingLevel?={2..6}        // default 3
  keepMounted? hiddenUntilFound? ref? ...div attributes>
  <AccordionItem value="faq-1" disabled? ref?>
    <AccordionTrigger asChild? ref?>Question</AccordionTrigger>   // h{level} > button
    <AccordionContent keepMounted? hiddenUntilFound? ref?>Answer</AccordionContent>
  </AccordionItem>
</Accordion>
```

- Neshel owns the value state (controlled or uncontrolled) and passes it to Base UI controlled; single +
  not collapsible ignores the request to close the open item.
- Header: `<h{level} class="neshel-accordion-header">` containing a native `<button>` with `aria-expanded`,
  `aria-controls`; panel labelled by its trigger. `asChild` must render a button (validated child).
- Keyboard: Enter/Space (native button); ArrowDown/ArrowUp (wrap), Home, End move among enabled headers of the same
  accordion (nested accordions keep their own). Base UI 1.9 dropped arrow keys after the APG update made them
  optional; Neshel keeps them on the root's `keydown`.
- Errors (dev and prod): invalid `type`, `headingLevel` outside 2–6, empty item `value`, invalid `asChild` child.

## Collapsible

```tsx
<Collapsible open? defaultOpen? onOpenChange? disabled? ref?>
  <CollapsibleTrigger asChild? ref?>Show more</CollapsibleTrigger>   // native button
  <CollapsibleContent keepMounted? hiddenUntilFound? ref?>…</CollapsibleContent>
</Collapsible>
```

Not an accordion item: no heading, group or value. Closed content is unmounted unless `keepMounted`/`hiddenUntilFound`.

## Shared styling

- Semantic tokens only (`--neshel-border`, `--neshel-foreground`, `--neshel-primary`, `--neshel-focus`,
  `--neshel-disabled-foreground`); focus ring on `:focus-visible`.
- Optional height transition (200 ms) using each panel's own variable (`--accordion-panel-height` or
  `--collapsible-panel-height` — never the other one, since custom properties inherit) with
  `data-starting-style`/`data-ending-style` at height 0; `transition: none` under reduced motion.
- SSR renders the initial state (open panels present, closed ones absent or hidden); hydration is clean.
