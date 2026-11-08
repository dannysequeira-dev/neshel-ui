# Feature brief 002 — typed configuration and semantic tokens

**Not yet specified or implemented.** Expand with official `/speckit-specify`
after feature 001 is verified.

Purpose: typed `defineConfig`, light/dark semantic tokens, CSS-first baseline,
custom config discovery, safe validation, deterministic generated CSS, Capsize
metrics hooks, and an explicitly invoked build-time `neshel generate` command.

Test categories: CSS-only integration, invalid values, deterministic output,
concurrent applications with different themes, missing metrics, color contrast,
zero runtime Node dependencies in public React/browser packages, tree shaking,
Node CLI exit codes and clean standalone consumer from tarball.

Carried-over decision (Phase 001, 2026-11-07): separate the standard CSS token
stylesheet (plain custom properties, usable without Tailwind) from the Tailwind-specific
`@theme inline` integration, as distinct package exports. Names are decided in this slice.

Non-goal: implementing Layout, Typography or interactive Components in this slice.
