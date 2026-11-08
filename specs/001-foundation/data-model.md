# Data model — Feature 001

Feature 001 has no runtime data. These entities describe what quality gates inspect and
what `evidence.md` records.

## WorkspacePackage

- `name` (`@neshel-ui/<dir>`), `dir` (`packages/<dir>`), `private` (must be `true` in Phase 001)
- `intendedPublic`: `true` for config, layout, typography, components, cli; `false` for core
- `exports`: map of subpath → targets (`types`, `import`, CSS)
- `dependencies` / `peerDependencies`
- Rules: name matches dir; ESM + types for `.`; no dependency on a non-public workspace
  package (ADR 0002); React packages peer on React 19 only (ADR 0004).
- Source of truth for lists: `pnpm-workspace.yaml` globs + manifests (FR-025, 001.2).

## PackedArtifact (001.2+)

- `package` → WorkspacePackage, `tarballPath`, `files[]`, `packedManifest`
- Rules: every export target, `.d.ts` and map `sources` entry exists in `files[]`;
  `packedManifest` has no `workspace:` ranges or private dependencies; `publint` and `attw`
  report no errors.

## GateResult

- `gate` (script name from [contracts/quality-gates.md](contracts/quality-gates.md))
- `scope`: `local` | `ci`; `platform` (os, arch), `node`, `pnpm`
- `outcome`: `pass` | `fail` | `not-run`; `details` (counts, first failure)
- `commit` (SHA when known)
- State transitions: `not-run` → `pass|fail`. A `local` pass never satisfies a `ci`
  requirement (FR-016).

## CIJob

- `os` ∈ {ubuntu-latest, windows-latest, macos-latest}, `node` ∈ {22, 24, 26}
- Steps: frozen install, doctor, lint, test, typecheck, build packages, check exports,
  (001.2) check pack, Vite build, Storybook build
- Target matrix after 001.4: Node 26 × 3 OSes + Node 22/24 × ubuntu (D1).
