# @neshel-ui/cli

Validate a typed `neshel.config.ts` and generate a static Neshel-UI theme stylesheet.

**Status:** pre-release, **not published to npm**. Node `>=22.13`, ESM only. Requires
`@neshel-ui/config` (peer dependency) in the same project.

## Commands

```text
neshel validate [--config <path>] [--strict] [--debug]
neshel generate [--config <path>] [--out <path>] [--check] [--strict] [--debug]
```

- **Discovery:** `neshel.config.ts`, `.mts`, `.js` or `.mjs` in the working directory only; two
  candidates are an error. `--config` points at a file explicitly.
- **Output:** `--out` (relative to the working directory) › `output` in the config (relative to
  the config file) › `neshel.generated.css` next to the config. The path must end in `.css`, must
  not be inside `node_modules`, the config file or a directory.
- **Writes** are atomic (temporary sibling + rename) and skipped when the content is unchanged.
  `--check` compares without writing (for CI).
- **Contrast:** custom themes are checked against the token contract's pairs. Failures are
  warnings by default; `contrast: "error"` in the config or `--strict` makes them errors
  (`--strict` always wins). Passing these checks does not by itself make an interface WCAG
  conformant.
- Generation runs only when you invoke it. No install hooks.

```jsonc
// package.json
"scripts": {
  "predev": "neshel generate",
  "prebuild": "neshel generate",
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
