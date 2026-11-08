# Contract — quality gate scripts

Every gate is a root `pnpm` script, runs unchanged in PowerShell 7, cmd.exe, Bash and Zsh,
uses only Node/pnpm (no shell built-ins), exits `0` on success and non-zero on failure, and
prints actionable errors to stderr.

| Script                | Purpose                                                                                                | Requires build | Milestone               | In CI                                |
| --------------------- | ------------------------------------------------------------------------------------------------------ | -------------- | ----------------------- | ------------------------------------ |
| `pnpm run doctor`     | Node version, workspace layout, portability audit                                                      | No             | existing                | Yes                                  |
| `pnpm lint`           | Biome format + lint + import order on first-party files                                                | No             | 001.1 (CI)              | Yes (001.1)                          |
| `pnpm format`         | Apply Biome fixes (developer use)                                                                      | No             | existing                | No                                   |
| `pnpm typecheck`      | `tsc --noEmit` per workspace project                                                                   | No             | existing                | Yes                                  |
| `pnpm test`           | `node --test` workspace suites                                                                         | No             | existing                | Yes                                  |
| `pnpm build:packages` | Clean `packages/*/dist`, then emit JS, `.d.ts`, maps, CSS                                              | —              | existing (clean: 001.2) | Yes                                  |
| `pnpm check:exports`  | Export targets exist in `dist`                                                                         | Yes            | existing                | Yes                                  |
| `pnpm check:pack`     | Build (unless `--no-build`), `pnpm pack` each intended public package, validate tarballs (ADR 0004 §5) | Builds itself  | 001.2                   | Yes (`--no-build`, after build step) |
| `pnpm check`          | doctor → lint → typecheck → test → build:packages → check:exports → check:pack --no-build              | —              | existing                | No (CI runs steps individually)      |

Lint scope contract: everything tracked except build outputs and the Spec Kit CLI-owned
paths listed in `research.md` R2. Rules are not disabled to obtain a green result.

`check:pack` contract: exit 1 when any intended public package (`publishConfig.access: "public"`)
fails a manifest, target, declaration, source-map, side-effect, unexpected-file, publint
(`error` level), attw (`esm-only` profile) or external-consumer check; prints one `ERROR` line
per problem under the package name; never leaves its temporary directory behind.
