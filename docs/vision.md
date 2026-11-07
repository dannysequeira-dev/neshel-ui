# Product vision

Neshel-UI is a small, carefully crafted set of **independent building blocks** for
React interfaces. A new application should be able to adopt theme tokens, layout
composition, or semantic typography without importing a full component system.

## Who it serves

- Developers shipping React applications with Tailwind CSS v4.
- Teams wanting consistent accessible UI without surrendering visual ownership.
- Open source contributors who value clarity, small packages, and careful typography.

## Product principles

1. **Install only what you need**: package boundaries and optional features are real.
2. **Configuration over duplication**: semantic tokens drive every implementation.
3. **Familiar React**: HTML semantics, refs, native props, composition.
4. **Works with tools developers already use**: Tailwind CSS v4, Vite, Next, Storybook.
5. **Honor typography**: font metrics, readability, line heights, text semantics.
6. **Accessible by default**: keyboard, focus, contrast and reduced-motion.
7. **Hopeful craftsmanship**: helpful software, honest documentation, patient iteration.

## MVP boundaries

Six packages exist structurally; first release aims to implement:

- Tokens / light+dark themes / typed config and build-time CSS generation.
- Layout: Box, Stack, Inline, Grid, Center, Container.
- Typography: Heading, Text, Paragraph, Caption (with Capsize where appropriate).
- Components: Button, Card, Badge, Input, Separator, Skeleton.
- Storybook stories and Vite + packed Next consumer verification.

**Not MVP**: complex tables, date pickers, full forms/validation, headless menus,
animation framework, icon library, localization engine, native mobile, or theming UI editor.

## Success looks like

A developer can install only `@neshel-ui/config` and obtain a stable CSS theme;
install `@neshel-ui/layout` and compose a page; then add typography/components as
needed. An external application can build from published artifacts with no repo
source aliases, hidden PostCSS setup or unversioned imports.
