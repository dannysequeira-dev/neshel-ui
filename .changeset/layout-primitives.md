---

## "@neshel-ui/layout": minor

Layout primitives (feature 003): `Box`, `Flex`, `Stack`, `Inline`, `Grid`, `Center` and
`Container`.

- Spacing props `space` (`gap`), `spaceX` (`column-gap`) and `spaceY` (`row-gap`); `space` cannot
  be combined with the other two (TypeScript error and runtime `NeshelLayoutError`).
- Alignment props `align`, `alignX`, `alignY` and `justify`, with precedence
  `justify` > `alignX`/`alignY` > `align`; Flex alignment follows its responsive `direction`.
- Responsive values `{ base, sm, md, lg, xl, "2xl" }` (40/48/64/80/96rem) compiled to static
  classes; Grid `columns` 1–12, Container `size`/`gutter`, Box `display`, `wrap` on Flex/Inline.
- `as` and `asChild` (Radix Slot) composition with React 19 refs; separators on Stack and
  Inline (`separator={true}` or a custom element).
- `@neshel-ui/layout/styles.css`: precompiled CSS in `@layer components.neshel`, generated from
  the same tables as the runtime classes. Works with or without Tailwind; no `@source` needed.
- New runtime dependencies: `@radix-ui/react-slot`, `tailwind-variants`.
