# Typography and Capsize design

## Goals

- Visual alignment from real font metrics rather than guessed `line-height`.
- Semantics independent of visual scale (`Heading as="h2" size="3xl"`).
- Predictable SSR and generated CSS.
- No font files copied or redistributed by the library.

## Planned implementation

1. Declare supported font metrics in a typed `neshel.config.ts`.
2. At build time, `@neshel-ui/cli` validates metrics and computes cap-height-
   aware styles with `@capsizecss/core` (dependency to add in the feature slice).
3. Emit stable class names/variables for typography variants to generated CSS.
4. Render semantic `Heading`, `Text`, `Paragraph`, `Caption` components that
   reference the generated contract and have a sensible fallback without a CLI.
5. Test font swaps, different font metrics, multiline wrapping, text selection,
   fallback metrics and hydration.

## Non-goals

- Fetching Google Fonts from runtime.
- Shipping font binaries or embedding unlicensed fonts.
- Measuring every render in the browser.
- Applying Capsize indiscriminately to inputs, icons and all inline text.

## Research

Capsize: https://seek-oss.github.io/capsize/
