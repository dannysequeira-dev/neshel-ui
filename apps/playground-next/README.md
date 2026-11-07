# Next.js external consumer — planned

This folder is intentionally NOT a Next.js application in the foundation ZIP.
Implement it after the first public components exist. It must install packed
artifacts (tarballs) from `pnpm pack`, not rely on `workspace:*` symlinks.

Release gate: Next SSR / hydration, CSS imports, font loading, tree-shaking,
React peer dependencies, theme switching and type declaration resolution.
