# Next.js external consumer — planned

This folder is intentionally not a Next.js application yet. It is planned for feature 006,
after the first public components exist. Like `pnpm check:consumer` (Vite), it must install
packed artifacts from `pnpm pack`, never `workspace:*` links.

Release gate: Next SSR / hydration, CSS imports, font loading, tree-shaking, React peer
dependencies, theme switching and type declaration resolution.
