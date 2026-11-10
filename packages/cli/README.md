# @neshel-ui/cli

Validate a typed `neshel.config.ts` and generate a static Neshel-UI stylesheet (themes, font
metrics, custom breakpoints) and the matching TypeScript declarations.

**Status:** 0.1.0, the first public release (pre-1.0: breaking changes bump the minor version and are called out in the [changelog](./CHANGELOG.md)). Verified from the packed tarball in external applications on Linux, Windows and macOS. Node `>=22.13`, ESM only; requires `@neshel-ui/config` next to it. Documentation (English and Spanish): https://neshel-ui.vercel.app

```sh
pnpm add -D @neshel-ui/cli @neshel-ui/config
```

## Commands

```text
neshel validate [--config <path>] [--strict] [--debug]
neshel generate [--config <path>] [--out <path>] [--types <path>] [--check] [--strict] [--debug]
```

- **Discovery:** `neshel.config.ts`, `.mts`, `.js` or `.mjs` in the working directory only; two
  candidates are an error. `--config` points at a file explicitly.
- **Output:** `--out` (relative to the working directory) › `output` in the config (relative to
  the config file) › `neshel.generated.css` next to the config. The path must end in `.css`, must
  not be inside `node_modules`, the config file or a directory.
- **Breakpoints (feature 004):** with `breakpoints` in the config, the stylesheet also contains
  complete `@neshel-ui/layout` / `@neshel-ui/typography` styles for your breakpoints (read from
  the installed packages' `style-manifest.json`), optional Tailwind `@theme` breakpoints, and a
  declarations file (`--types` › `types` › `neshel.generated.d.ts`) to include in your
  `tsconfig.json`. Removing `breakpoints` removes a previously generated declarations file.
- **Fonts (feature 004):** Capsize metric tokens per font role and, with `typography.fallbacks`,
  Capsize fallback `@font-face` rules (`@capsizecss/core`).
- **Writes** are atomic (temporary sibling + rename) and skipped when the content is unchanged.
  `--check` compares every output without writing (for CI) and exits 4 if any is stale.
- **Contrast:** custom themes are checked against the token contract's pairs. Failures are
  warnings by default; `contrast: "error"` in the config or `--strict` makes them errors
  (`--strict` always wins). Passing these checks does not by itself make an interface WCAG
  conformant.
- Generation runs only when you invoke it. No install hooks. Chain it explicitly as below: pnpm
  skips `pre*` scripts unless `enable-pre-post-scripts` is set.

```jsonc
// package.json
"scripts": {
  "dev": "neshel generate && vite",
  "build": "neshel generate && vite build",
  "check:theme": "neshel generate --check --strict"
}
```

## Exit codes

| Code | Meaning                                                                             |
| ---- | ----------------------------------------------------------------------------------- |
| 0    | Success (warnings may be printed), including "unchanged"                            |
| 1    | Invalid configuration (structure, colours, config `output`, contrast under errors)  |
| 2    | Usage error (unknown command or option, rejected `--out` path)                      |
| 3    | Configuration not found, ambiguous, failed to load, or default export not an object |
| 4    | `generate --check`: output missing or out of date                                   |
| 5    | I/O or unexpected internal error (`--debug` prints the stack)                       |

## Trust model

`neshel.config.*` is **executable, trusted project code**: the CLI loads it with
[jiti](https://github.com/unjs/jiti) and runs it with your privileges, like `vite.config.ts`.
It is never evaluated in the browser, never fetched remotely and never loaded from
`node_modules`. The CLI provides no sandbox.

The package has no programmatic API in 0.x; its contract is the command line and the generated
CSS ([contracts/cli.md](https://github.com/dannysequeira-dev/neshel-ui/blob/main/specs/002-config-and-tokens/contracts/cli.md)).
