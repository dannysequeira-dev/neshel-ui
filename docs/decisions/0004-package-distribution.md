# ADR 0004 — Package distribution: ESM, NodeNext, source maps and validation

- Status: Accepted (2026-11-07); implementation scheduled for milestone 001.2
- Date: 2026-11-07

## Context

Packages compile with `tsc` and `moduleResolution: "Bundler"`. Packed tarballs included
`.js.map` and `.d.ts.map` files that point to `../src/*.ts`, which was not packed.
Packages had never been validated from their packed artifacts. React peer ranges
claimed React 18 and 20 support that had not been tested.

## Decision

1. **ESM only.** Public packages ship ESM; no CommonJS build for hypothetical demand.
2. **NodeNext for libraries.** Library packages compile with `module`/`moduleResolution`
   `NodeNext` and explicit relative `.js` extensions, so emitted JS and `.d.ts` resolve
   in Node and every TypeScript resolution mode we support. Applications (`apps/*`) may keep
   `Bundler` resolution.
3. **Source maps are published.** JS and declaration maps are kept, and the `src` files
   they reference are included in `files`. Tests, stories and fixtures are excluded.
   Every `sources` entry in a packed map must resolve inside the tarball.
4. **React 19 only.** React packages declare a React 19 peer range (e.g. `^19.0.0`) and
   React as a dev dependency. `config`, `cli` and `core` have no React dependency.
   React 18 compatibility is a future investigation, not a claim.
5. **Validation from real artifacts.** A portable Node script, `pnpm check:pack`, packs
   each intended public package into a temporary directory and checks: export targets,
   declarations, source maps, CSS assets, runtime import resolution, absence of
   `workspace:` protocols and of private/unpublished dependencies. It also runs `publint`
   and `@arethetypeswrong/cli` against the tarball.
6. An external-consumer smoke test installs tarballs outside the workspace (path with
   spaces and Unicode) and builds a Vite + Tailwind application.

## Consequences

- Slightly larger tarballs (sources) in exchange for usable debugging.
- Every new relative import needs a `.js` extension; the TypeScript compiler enforces it.
- Two new dev dependencies (`publint`, `@arethetypeswrong/cli`).

## Alternatives considered

- Remove maps: smaller but worse debugging, rejected by the maintainer (D5).
- Dual CJS/ESM: complexity without demonstrated demand.
- Keep `Bundler` everywhere: hides extensionless imports that fail under Node ESM.

## Verification

SC-001 to SC-005 in `specs/001-foundation/spec.md`.
