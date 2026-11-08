# ADR 0007 — Configuration engine location and CLI config loading

- Status: **Proposed** (2026-11-07) — pending owner review; not implemented
- Date: 2026-11-07
- Feature: [002](../../specs/002-config-and-tokens/spec.md); detail in
  [contracts/config-api.md](../../specs/002-config-and-tokens/contracts/config-api.md) and
  [contracts/cli.md](../../specs/002-config-and-tokens/contracts/cli.md)
- Amends: `docs/package-contracts.md` distribution table (`cli` runtime dependencies)

## Context

Consumers write `neshel.config.ts` with `defineConfig()`. The configuration must never be
evaluated in the browser, the browser entry must stay dependency-free, and the CLI supports
Node `>=22.13`, where unflagged TypeScript type stripping is not available.

## Decision

1. `@neshel-ui/config` `.` exports only `defineConfig` (identity) and types: no runtime
   dependencies, no `node:` imports, no side effects.
2. `@neshel-ui/config/engine` (experimental during 0.x) holds hand-written validation,
   resolution, contrast checking and CSS generation as pure functions. No schema library.
3. `@neshel-ui/cli` owns discovery (working directory only: `neshel.config.{ts,mts,js,mjs}`,
   ambiguity is an error), loading, file I/O, diagnostics and exit codes 0–5.
4. TypeScript configs are loaded with `jiti` (owner decision Q4), the CLI's only third-party
   runtime dependency. Alternative: raise the CLI Node floor to a release with unflagged type
   stripping and drop `jiti`.
5. Generation runs only through `neshel generate`; no install lifecycle scripts.
6. Package tests stay on `node:test` against built output; type contracts via `tsc` fixtures.

## Consequences

- First real inter-package runtime dependency: `cli → config` (both public). `check:pack`
  must accept public workspace dependencies while still rejecting internal ones.
- One engine produces both shipped stylesheets and consumer CSS: no drift between modes.
- Loading a config runs consumer code with their privileges (same model as `vite.config.ts`);
  no sandbox is claimed.

## Alternatives considered

- Schema library (`zod`, `valibot`) in the CLI: better messages for less code, but adds a
  dependency and separates types from the browser-safe entry.
- Engine inside `cli`: `config`'s build would depend on `cli`, inverting the dependency arrow.
- Native type stripping only: zero dependencies, but excludes supported Node versions and
  non-erasable TS syntax.

## Verification (planned)

CLI negative matrix on Windows, Linux and macOS in paths with spaces and Unicode; browser-
safety checks in `check:pack`; configured packed consumer (feature 002 SC-003, SC-004, SC-006).
