# Data model — Feature 002

Entities of the token contract and the CLI pipeline. Public shapes are defined in
[contracts/config-api.md](contracts/config-api.md); internal shapes (CLI-private) are marked.

## ColorRole (public)

- One of the 21 names in `colorRoles` (canonical order = emission order).
- Derived: CSS variable `--neshel-<kebab>`, Tailwind variable `--color-neshel-<kebab>`.
- Rules: names unique; kebab conversion `/[A-Z]/ → "-" + lower`.

## ContrastPair (public)

| Field        | Type                              | Rule                                   |
| ------------ | --------------------------------- | -------------------------------------- |
| `foreground` | ColorRole                         | must exist in `colorRoles`             |
| `background` | ColorRole                         | must exist; `foreground ≠ background`  |
| `minimum`    | `4.5 \| 3 \| null`                | `null` only with `criterion: "exempt"` |
| `criterion`  | `"1.4.3" \| "1.4.11" \| "exempt"` |                                        |

Contrast-checked roles = roles appearing in a pair with a non-null minimum (every role except
`border`, `disabled` and `disabledForeground`). Opacity rule (independent of checking): alpha
< 1 is allowed **only on `border`**; every other role must be opaque.

## Theme

| Kind     | Name                     | Base              | `color-scheme` | Selector(s)                                                |
| -------- | ------------------------ | ----------------- | -------------- | ---------------------------------------------------------- |
| built-in | `light`                  | —                 | light          | `:root`, `[data-neshel-theme="light"]`, `[…="system"]`     |
| built-in | `dark`                   | —                 | dark           | `[data-neshel-theme="dark"]`; `[…="system"]` in dark media |
| named    | `^[a-z][a-z0-9-]{0,31}$` | `light` \| `dark` | from base      | `[data-neshel-theme="<name>"]`                             |

- Reserved: `system`. `light`/`dark` cannot have `extends`. Named themes must have `extends`.
- No chains: a named theme's base is always a built-in.
- Resolved theme = complete map ColorRole → colour string.

## NeshelConfig (public input)

See contract. Validation state machine (CLI):

```text
loaded(unknown) ──structure──▶ structurally-valid ──colour──▶ colour-valid ──contrast(policy)──▶ valid
      │                              │                           │                              │
      └──── errors ─────────────────┴──────── errors ───────────┴─── errors (policy=error) ─────┘──▶ invalid (exit 1)
```

All stages run as far as possible to report every diagnostic in one pass (colour and contrast
stages skip values already rejected structurally).

## ResolvedConfig (CLI-internal)

| Field      | Content                                                                |
| ---------- | ---------------------------------------------------------------------- |
| `themes`   | ordered list: light, dark, then named sorted by code point             |
| each theme | `{ name, kind, base?, colorScheme, colors: complete ThemeColors }`     |
| `radius`   | `{ base, sm, md, lg, xl, full }` as CSS strings (derived via `calc()`) |
| `spacing`  | `{ unit }`                                                             |
| `fonts`    | `{ body, display, mono }` serialized stacks                            |
| `focus`    | `{ width, offset }`                                                    |
| `contrast` | effective policy                                                       |
| `source`   | config file base name (for the header only)                            |

## Diagnostic (CLI-internal)

| Field      | Type                             | Notes                                   |
| ---------- | -------------------------------- | --------------------------------------- |
| `severity` | `"error" \| "warning" \| "info"` |                                         |
| `code`     | string                           | see code list                           |
| `path`     | string                           | dotted config path, `""` for file-level |
| `message`  | string                           | includes received value and expectation |

Codes: `unknown-key`, `invalid-type`, `invalid-version`, `invalid-theme-name`, `reserved-theme`,
`missing-base`, `invalid-base`, `unexpected-base`, `invalid-length`, `invalid-font-stack`,
`invalid-output`, `invalid-metrics`, `unsupported-color-syntax`, `invalid-color`,
`alpha-not-allowed`, `out-of-gamut`, `contrast`, `reserved`. Sort: path (code-point), then code.

## Stylesheet

| Kind      | File                            | Layer             | Themes             | `@theme inline` |
| --------- | ------------------------------- | ----------------- | ------------------ | --------------- |
| shipped   | `tokens.css`                    | `neshel.defaults` | light, dark        | no              |
| shipped   | `tailwind.css` (= `styles.css`) | `neshel.defaults` | light, dark        | yes             |
| generated | consumer output                 | `neshel.config`   | light, dark, named | no              |

## OutputTarget (CLI-internal)

| Field    | Rule                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| `source` | `--out` (cwd-relative) › config `output` (config-dir-relative) › default               |
| `path`   | absolute, normalised; `.css`; no `node_modules` segment; ≠ config; not a dir           |
| `state`  | `missing` \| `unchanged` \| `stale` → write / no-op / write (or exit 4 with `--check`) |
