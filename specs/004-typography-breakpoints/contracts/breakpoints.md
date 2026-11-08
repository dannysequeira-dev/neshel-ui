# Contract — custom responsive breakpoints

Normative for `@neshel-ui/config`, `@neshel-ui/cli`, `@neshel-ui/layout` and
`@neshel-ui/typography` (feature 004; research R1–R8; ADR 0010).

## 1. Configuration (`neshel.config.ts`)

```ts
import { defineConfig } from "@neshel-ui/config";

export default defineConfig({
  breakpoints: {
    mode: "replace", // "extend" (default) | "replace"
    values: {
      phone: "30rem",
      phoneXL: "40rem",
      tablet: "48rem",
      laptop: "64rem",
      desktop: "80rem",
      wide: "96rem",
    },
    tailwind: true, // optional: also emit Tailwind v4 @theme breakpoints
  },
  types: "./neshel.generated.d.ts", // optional; default shown
});
```

| Key                    | Type                    | Default                     | Notes                                       |
| ---------------------- | ----------------------- | --------------------------- | ------------------------------------------- |
| `breakpoints.mode`     | `"extend" \| "replace"` | `"extend"`                  | `extend` keeps `sm md lg xl 2xl`            |
| `breakpoints.values`   | `Record<string, rem>`   | — (required)                | name → `min-width` threshold                |
| `breakpoints.tailwind` | `boolean`               | `false`                     | `@theme` breakpoints in the generated CSS   |
| `types`                | `string` ending `.d.ts` | `"./neshel.generated.d.ts"` | relative to the config file; `--types` wins |

Default breakpoints (`defaults.breakpoints` in `@neshel-ui/config`): `sm` 40rem, `md` 48rem,
`lg` 64rem, `xl` 80rem, `2xl` 96rem (Tailwind v4 defaults).

### Validation (CLI)

| Code                         | Severity | Rule                                                                         |
| ---------------------------- | -------- | ---------------------------------------------------------------------------- |
| `invalid-type`/`unknown-key` | error    | shape of `breakpoints` (`values` required object, `mode`, `tailwind`)        |
| `invalid-breakpoint-name`    | error    | not `^[a-z][A-Za-z0-9]*$` or longer than 24 characters                       |
| `reserved-breakpoint-name`   | error    | `base`, class-key prefixes, prototype names, Tailwind variant names (R2)     |
| `duplicate-breakpoint-name`  | error    | equal ignoring case to another effective name (incl. defaults in `extend`)   |
| `breakpoint-redefined`       | error    | `extend` mode redefines a default name (use `replace`)                       |
| `invalid-breakpoint-width`   | error    | not `<number>rem` with ≤ 4 decimals, ≤ 0 or > 320rem                         |
| `duplicate-breakpoint-width` | error    | equal width to another effective breakpoint                                  |
| `too-many-breakpoints`       | error    | more than 12 effective breakpoints                                           |
| `empty-breakpoints`          | error    | `replace` without values                                                     |
| `breakpoint-order`           | warning  | `values` not declared in ascending width order (output is sorted regardless) |
| `invalid-types-output`       | error    | `types` not a string ending in `.d.ts`, or inside `node_modules`             |

Reserved names: `base`; `align`, `cols`, `d`, `dir`, `fw`, `gap`, `justify`, `mw`, `pi`, `text`;
`constructor`, `hasOwnProperty`, `prototype`, `toString`, `valueOf`; `active`, `contrast`, `dark`,
`disabled`, `even`, `first`, `focus`, `forced`, `group`, `has`, `hover`, `inert`, `landscape`,
`last`, `ltr`, `max`, `min`, `motion`, `not`, `odd`, `open`, `peer`, `portrait`, `print`, `rtl`,
`starting`, `visited`.

## 2. Effective breakpoints

`effective = (mode === "extend" ? defaults ∪ values : values)` sorted by width ascending. `base` is
implicit, first, and has no media query. Each breakpoint applies from its width upwards:
`@media (min-width: <width>)`. A value written at a breakpoint is inherited by every wider
breakpoint until another value is written.

## 3. Responsive values (runtime)

```ts
type Responsive<T> = T | { readonly [K in "base" | BreakpointName]?: T };
```

- `base` is optional (R7). Typography uses the component default below the first written key;
  Layout leaves the property unset.
- `undefined` / `null` entries are ignored.
- Keys are validated by grammar: `base`, a default name, or `^[a-z][A-Za-z0-9]*$`. Anything else
  throws `NeshelLayoutError` / `NeshelTypographyError`.
- Values are validated per prop; invalid values throw.
- For every written key `k` with value `v` the component emits exactly one class:
  `neshel-<key>-<token>` for `base`, `neshel-<k>-<key>-<token>` otherwise. The output depends only
  on the props (not on configuration, environment or breakpoint order).

### Unknown well-formed keys (JavaScript)

The runtime has no authoritative list of configured names. In the browser only, a component that
meets a key not listed in the computed value of `--neshel-breakpoints` on `<html>` logs once per
key:

```text
[@neshel-ui/layout] <Grid>: breakpoint "tablet" is not defined by the loaded Neshel stylesheet (defined: sm md lg xl 2xl). Configure it in neshel.config.ts and run "neshel generate".
```

Nothing is logged during SSR, when `--neshel-breakpoints` is empty (no stylesheet loaded), or for
`base` and listed keys. The check never changes markup.

## 4. Types

```ts
// @neshel-ui/config
export interface BreakpointRegistry {}
export type DefaultBreakpointName = "sm" | "md" | "lg" | "xl" | "2xl";
export type BreakpointName = BreakpointRegistry extends { readonly names: infer N extends string }
  ? N
  : DefaultBreakpointName;
```

Generated declarations (`neshel generate`, when breakpoints are configured):

```ts
// Generated by "neshel generate" from neshel.config.ts; do not edit.
// Add this file to your TypeScript project ("include" or "files" in tsconfig.json).
export {};

declare module "@neshel-ui/config" {
  interface BreakpointRegistry {
    readonly names: "phone" | "phoneXL" | "tablet" | "laptop" | "desktop" | "wide";
  }
}
```

- Names are listed in ascending width order; `extend` lists defaults and custom names.
- Layout and Typography use `BreakpointName` from `@neshel-ui/config`, which they declare as a
  peer dependency. The consumer must have `@neshel-ui/config` installed (it already needs its
  tokens stylesheet).
- Supported resolution: `moduleResolution` `NodeNext` and `Bundler` (tested).
- Excess-property checks reject unknown keys in object literals; values stored in variables typed
  as `Record<string, …>` bypass them (TypeScript limitation; the runtime warning still applies).

## 5. Stylesheets

- Every Neshel component stylesheet declares its effective names:
  `@layer components.neshel { :root { --neshel-breakpoints: "sm md lg xl 2xl"; } }` (space
  separated, ascending).
- Package stylesheets (`@neshel-ui/layout/styles.css`, `@neshel-ui/typography/styles.css`) use the
  defaults. With configured breakpoints, `neshel generate` emits complete equivalents for the
  installed packages into the generated stylesheet; import it after the package stylesheets or
  instead of them:

```css
@import "tailwindcss"; /* optional */
@import "@neshel-ui/config/tailwind.css"; /* or tokens.css */
@import "@neshel-ui/layout/styles.css"; /* optional with configured breakpoints */
@import "@neshel-ui/typography/styles.css"; /* optional with configured breakpoints */
@import "./neshel.generated.css";
```

> Feature 002/003 documented "generated config CSS → package stylesheets". That order still works
> when no breakpoints are configured. With configured breakpoints the generated file must come
> after the package stylesheets (or replace them).

## 6. Tailwind v4 (`tailwind: true`)

Appended to the generated stylesheet (which must be imported from the Tailwind entry CSS):

```css
/* replace */
@theme {
  --breakpoint-*: initial;
  --breakpoint-phone: 30rem;
  --breakpoint-phoneXL: 40rem;
}
/* extend: only the custom names */
@theme {
  --breakpoint-phone: 30rem;
}
```

Tailwind variant names are case-sensitive (`phoneXL:`). Only the `--breakpoint-` namespace is
written.
