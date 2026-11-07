# Package contracts (planned public API)

## `@neshel-ui/config`

Default import: `@neshel-ui/config/styles.css` (explicit import). Intended JS API:
`defineConfig`, configuration typing, token validation and a future generated CSS
contract. Do not promise that installing the package injects CSS automatically.

- Semantic tokens: primary/foreground, background/foreground, surface/foreground,
  border, muted, destructive, focus, etc. The final list requires specification.
- Light/dark and user-defined named modes (defer extra modes until needed).
- Document contrast pairs and variable cascade.
- No heavy React or Node runtime dependency for CSS-only consumers.

## `@neshel-ui/layout`

Intended exports: `Box`, `Stack`, `Inline`, `Grid`, `Center`, `Container`.
API shape proposal:

```tsx
<Stack gap="4" align="start">
  <Grid columns={{ base: 1, md: 3 }} gap="6">
    <Box>Item</Box>
  </Grid>
</Stack>
```

Responsive props must translate to CSS variables/static variants, not runtime
Tailwind class interpolation. Clarify semantics and what unit names mean before coding.

## `@neshel-ui/typography`

Intended exports: `Heading`, `Text`, `Paragraph`, `Caption`.

```tsx
<Heading as="h2" size="2xl">Meaningful heading</Heading>
<Text tone="muted" size="sm">Supporting description</Text>
```

The `as` tag controls HTML semantics, not visual scale. Capsize uses font metrics
at generation time and must not embed proprietary font files or run layout probes.

## `@neshel-ui/components`

Initial components: `Button`, `Card`, `Badge`, `Input`, `Separator`, `Skeleton`.
They must support accessible markup, focus states, appropriate native props and
stable refs. Interactive components must have deterministic React/SSR behavior.
No commitment to a proprietary copy/paste registry in v0.1.

## `@neshel-ui/cli`

Planned commands:

```text
neshel init       (optional scaffolding; after MVP if needed)
neshel generate   (reads neshel.config.ts and writes CSS)
neshel validate   (validates settings, with actionable diagnostics)
```

The actual CLI is a **deliberate placeholder** in this foundation ZIP. File
loading, runtime evaluation safety, deterministic output, export shape and naming
must be specified and tested before making these commands available.

## Build conventions

- React `peerDependencies` and ESM declarations.
- Browser-safe code in visual packages; Node-specific code only in CLI.
- `./styles.css` export published per visual package.
- Tree-shakeable, no hidden global resets or network fonts.
- Tests against `pnpm pack` tarballs and independent Vite/Next consumers.

**All code examples above are proposed APIs, not implemented features.**
