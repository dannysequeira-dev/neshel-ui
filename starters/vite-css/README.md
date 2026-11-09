# Neshel-UI starter — Vite + plain CSS

React 19, Vite 8, TypeScript and Neshel-UI **without Tailwind**: the packages ship precompiled CSS,
so a plain stylesheet import is all you need.

```bash
pnpm install   # or npm install / yarn
pnpm dev
```

- `src/index.css` imports `@neshel-ui/config/tokens.css` and the package stylesheets.
- Add `@neshel-ui/cli` and a `neshel.config.ts` later to customise the theme.

The `@neshel-ui/*` dependencies resolve from npm once version 0.1.0 is published. Before that,
see "Starters" in the documentation for installing local tarballs.

Documentation: https://github.com/dannysequeira-dev/neshel-ui
