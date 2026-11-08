# Contract — `neshel` CLI

Status: **approved for implementation** (ADR 0007 Accepted, 2026-11-07); not implemented.

- Package `@neshel-ui/cli`, ESM, Node `>=22.13`, executable `neshel`, `.` entry empty and
  side-effect free (no programmatic API in 0.x).
- `dependencies`: `jiti` (config loading), `colorjs.io` (colour parsing, gamut mapping, contrast).
- `peerDependencies`: `@neshel-ui/config` (`workspace:^`; token contract and `defaults`).
- Argument parsing with `node:util` `parseArgs`. No other dependency.

## Commands

```text
neshel validate [--config <path>] [--strict] [--debug]
neshel generate [--config <path>] [--out <path>] [--check] [--strict] [--debug]
neshel --help | -h
neshel --version | -v
```

| Option            | Meaning                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `--config <path>` | Use this file instead of discovery (relative to the working directory). |
| `--out <path>`    | Override `output` (relative to the working directory).                  |
| `--check`         | Generate in memory and compare with the existing file; never write.     |
| `--strict`        | Effective contrast policy `error`.                                      |
| `--debug`         | Print stack traces for load and internal errors.                        |

`validate` runs discovery, loading, structural validation, colour validation and contrast
checks; it never resolves or touches the output path. `generate` does the same, then resolves the
output and writes (or compares).

## Discovery

- Working directory only, no upward search. Candidates in order: `neshel.config.ts`,
  `neshel.config.mts`, `neshel.config.js`, `neshel.config.mjs`.
- More than one candidate → exit 3 listing all. None → exit 3 listing the searched names.
- `--config` bypasses discovery; the file must exist and have one of those extensions (else exit 3).
- `.cts`/`.cjs` unsupported (ESM-only).

## Loading (D4)

- `createJiti(<config file URL>, { fsCache: false, moduleCache: false })` then
  `import(file, { default: true })`. TypeScript is transformed in memory; no cache files are
  written (spike 2026-11-07: TS with `enum` loaded from a path with spaces and `ñ`).
- Relative imports and `@neshel-ui/config` resolve from the config file's directory.
- The default export must be a plain object. Missing default, a function, a promise or a
  primitive → exit 3.
- **Trust model** (FR-027): the config file is executable project code and runs with the user's
  privileges, like `vite.config.ts`. The CLI never fetches remote configs or loads from
  `node_modules`, and provides no sandbox.

## Validation pipeline

1. **Structural** (hand-written, no dependency): known keys only (with "did you mean"), types,
   `version`, theme names (`^[a-z][a-z0-9-]{0,31}$`, `system` reserved), `extends` only on named
   themes and only `light`/`dark`, lengths (`0` or number + `rem|em|px`), font stacks (non-empty
   strings without `;{}`), `output` (string ending `.css`), metrics shape.
2. **Colour syntax allowlist**: hex (3/4/6/8 digits) or `rgb()`, `rgba()`, `hsl()`, `hsla()`,
   `oklch()` by function name; anything else → `unsupported-color-syntax`. This is required
   because Color.js also accepts named colours.
3. **Parsing** with `colorjs.io/fn`, registering only `sRGB`, `HSL`, `OKLCH`; parse failure →
   `invalid-color`.
4. **Alpha**: alpha < 1 on any role other than `border` → `alpha-not-allowed` (error).
5. **Gamut**: not in sRGB gamut → `out-of-gamut` warning; mapped with Color.js CSS gamut mapping
   for contrast only (emitted CSS keeps the authored value).
6. **Contrast**: `contrastWCAG21` for every pair in `contrastPairs`, for every resolved custom
   theme (built-ins with overrides and named themes). Pure-default themes are covered by the
   built-in test, not re-reported.

All diagnostics of a run are collected (no fail-fast), sorted by path then code.

### Contrast policy

Effective policy = `error` if `--strict`, else config `contrast`, else `warn`. Under `warn`,
contrast failures are warnings (exit 0); under `error` they are errors (exit 1, nothing written).
Configuration cannot weaken `--strict`. Diagnostics never claim WCAG conformance.

## Output (amendment D)

Resolution:

1. `--out` → resolved against the working directory.
2. else config `output` → resolved against the **config file's directory**.
3. else `neshel.generated.css` in the config file's directory.

Rejections (exit 2, nothing written): extension not `.css` (case-insensitive); any path segment
named `node_modules`; the resolved path equals the config file; the path is an existing directory.
Parent directories are created (`mkdir -p` semantics).

Write procedure:

1. Generate content in memory.
2. If the target exists and is byte-identical → do nothing, report "unchanged" (exit 0).
3. Write to `<target>.<pid>-<random>.tmp` in the same directory, then `rename` over the target.
4. On Windows `EPERM`/`EBUSY` from `rename`, retry up to 5 times with a short back-off; on final
   failure remove the temporary file and exit 5. Any failure leaves the previous file intact.
5. `--check`: steps 1–2 only; missing or different → exit 4.

Content: header, layer statement, blocks per [css.md](css.md), LF, trailing newline, no
timestamps, versions or absolute paths. Byte-identical across OS and Node versions (FR-024).
Paths in messages are relative to the working directory and printed with `/`.

## Exit codes

| Code | Meaning                                                                          |
| ---- | -------------------------------------------------------------------------------- |
| 0    | Success (warnings may be printed); also "unchanged"                              |
| 1    | Validation failed: structural or colour errors, or contrast errors under `error` |
| 2    | Usage: unknown command/option, missing value, rejected output path               |
| 3    | Config not found, ambiguous, failed to load, or default export not an object     |
| 4    | `generate --check`: output missing or out of date                                |
| 5    | I/O or unexpected internal error (stack with `--debug`)                          |

## Diagnostics format

```text
error   themes.dark.colors.primary   unsupported-color-syntax  Expected #hex, rgb(), hsl() or oklch(); received "navy".
error   themes.light.colors.primay   unknown-key               Unknown key "primay". Did you mean "primary"?
error   themes.sepia.extends         invalid-base              "extends" must be "light" or "dark"; received "ocean".
error   radius.base                  invalid-length            Expected a length such as "0.75rem" (rem, em, px or 0); received 12.
warning themes.light                 contrast                  accentForeground on accent is 3.12:1; minimum 4.5:1 (WCAG 1.4.3).
warning themes.dark.colors.accent    out-of-gamut              Outside sRGB; contrast computed after gamut mapping.
info    typography.metrics           reserved                  Font metrics are reserved for feature 004 and produce no CSS yet.
```

Diagnostics → stderr; summary line → stdout (`neshel: wrote src/styles/neshel.generated.css
(3 themes, 1 warning)`, `neshel: 1 error — nothing written.`). No ANSI colour when `NO_COLOR` is
set or the stream is not a TTY.

## Recommended consumer scripts

```jsonc
"scripts": {
  "predev": "neshel generate",
  "prebuild": "neshel generate",
  "check:theme": "neshel generate --check --strict"
}
```

No `postinstall`/`prepare` hooks are used or recommended (FR-023).

## Negative test matrix (minimum, SC-004)

| Case                                                                                         | Expected                            |
| -------------------------------------------------------------------------------------------- | ----------------------------------- |
| No config / two configs / `--config` missing file                                            | exit 3                              |
| TS syntax error / config throws                                                              | exit 3, file + loader message       |
| No default export / default is a function or primitive                                       | exit 3                              |
| Unknown key / misspelled role                                                                | exit 1, path + suggestion           |
| Wrong type, `version: 2`                                                                     | exit 1                              |
| Invalid length, font stack, theme name, `system` theme                                       | exit 1                              |
| `extends` missing on named theme / unknown base / on `light`                                 | exit 1                              |
| Named colour, `var()`, `color-mix()`, `lab()`                                                | exit 1 (`unsupported-color-syntax`) |
| Malformed `oklch(`                                                                           | exit 1 (`invalid-color`)            |
| Alpha on a non-`border` role / alpha on `border`                                             | exit 1 / exit 0                     |
| Out-of-gamut `oklch()`                                                                       | exit 0, warning                     |
| Contrast failure: default / `contrast:"error"` / `--strict` / `contrast:"warn"` + `--strict` | 0 warn / 1 / 1 / 1                  |
| `--check` fresh / stale / missing                                                            | 0 / 4 / 4                           |
| `--out x.txt`, `--out node_modules/a.css`, `--out <dir>`, output = config                    | exit 2                              |
| Unknown option / command / missing option value                                              | exit 2                              |
| Unwritable target (read-only dir) / simulated rename failure                                 | exit 5, previous file intact        |
| Unchanged output                                                                             | exit 0, mtime unchanged             |
| All of the above in a path with spaces and Unicode                                           | same behaviour                      |
