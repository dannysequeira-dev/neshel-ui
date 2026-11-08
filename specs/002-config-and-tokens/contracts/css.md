# Contract — Stylesheets, cascade and theme selection

Status: **approved for implementation** (ADR 0006 Accepted, 2026-11-07); not implemented.
Claims marked _verified by SC-005_ are design intent until the 002.2/002.5 browser checks pass.

## Package exports of `@neshel-ui/config`

```jsonc
"exports": {
  ".":              { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  "./tokens.css":   "./dist/tokens.css",
  "./tailwind.css": "./dist/tailwind.css",
  "./styles.css":   "./dist/styles.css"   // 0.x compatibility alias of tailwind.css (D2)
},
"sideEffects": ["**/*.css"]
```

No other subpath is exported (amendment C).

| Import                            | Contains                                     | Requires Tailwind |
| --------------------------------- | -------------------------------------------- | ----------------- |
| `@neshel-ui/config/tokens.css`    | layer statement + default tokens             | no                |
| `@neshel-ui/config/tailwind.css`  | everything in `tokens.css` + `@theme inline` | yes (v4.1+)       |
| `@neshel-ui/config/styles.css`    | byte-identical to `tailwind.css` (0.x alias) | yes               |
| `neshel.generated.css` (consumer) | layer statement + complete resolved tokens   | no                |

Consumers import **either** `tokens.css` **or** `tailwind.css` (or the alias), not both; doing
both only duplicates identical declarations. Files are self-contained (no nested `@import`).

## Canonical import order

```css
/* Tailwind consumers */
@import "tailwindcss"; /* 1. Tailwind (declares its layers first) */
@import "@neshel-ui/config/tailwind.css"; /* 2. Neshel defaults + utilities mapping   */
@import "./neshel.generated.css"; /* 3. optional: configured tokens           */
/* 4. application CSS */

/* Plain CSS consumers */
@import "@neshel-ui/config/tokens.css";
@import "./neshel.generated.css"; /* optional */
```

Supported alternative orders, **claimed only once verified by SC-005**:

- generated file imported before the Neshel stylesheet;
- generated file alone (plain CSS) — it is complete;
- generated file + `tailwind.css` without `tokens.css`.

## Cascade layers

Every Neshel stylesheet starts with:

```css
@layer neshel.defaults, neshel.config;
```

This creates a parent layer `neshel` with two sublayers. Facts the design relies on (CSS
Cascade 5) and their consequences:

1. **Layer order is fixed by first appearance.** The statement is identical in every Neshel file,
   so whichever is parsed first yields `defaults < config` inside `neshel`. A consumer may place
   the whole `neshel` layer relative to their own layers with an earlier statement such as
   `@layer reset, neshel, app;` without changing the sublayer order.
2. **Tailwind v4's layers** (`theme, base, components, utilities`) are declared by
   `@import "tailwindcss"`. Under the canonical order `neshel` comes after them. Neshel declares
   only `--neshel-*` custom properties and `color-scheme`; Tailwind's `theme` layer declares
   `--color-*`, `--font-*`, … — no overlap. The single shared property is `color-scheme`: an
   element carrying both `data-neshel-theme` and a Tailwind `scheme-*` utility gets the Neshel
   value under the canonical order (documented; regression-tested).
3. **Unlayered CSS beats all layers.** A consumer's unlayered `:root { --neshel-primary: … }`
   wins over every Neshel theme, including dark. Documented override pattern:

   ```css
   @layer neshel.config {
     :root, [data-neshel-theme="light"], [data-neshel-theme="system"] { --neshel-primary: #1d3f73; }
     @media (prefers-color-scheme: dark) { [data-neshel-theme="system"] { --neshel-primary: #a9c2ee; } }
     [data-neshel-theme="dark"] { --neshel-primary: #a9c2ee; }
   }
   ```

   (or use the CLI, which emits exactly this structure, complete).
4. **Layer precedence beats specificity.** Because `:root` also matches a root carrying
   `data-neshel-theme="dark"`, a partial `neshel.config` block on `:root` would leak into dark.
   Therefore every theme block in every Neshel file declares **all 21 colour roles** and
   `color-scheme` (FR-009). Within one layer, later blocks of equal specificity win.
5. **Custom properties inherit.** A scoped block on an element replaces inherited values for that
   subtree. Complete blocks guarantee a nested scope never inherits a role from its parent theme
   (no light/dark leakage, also for named themes).

## Theme block structure (shipped and generated)

```css
/* <header: see below> */
@layer neshel.defaults, neshel.config;

@layer neshel.defaults {
  /* generated files use neshel.config */
  :root {
    --neshel-radius-base: 0.75rem;
    /* radius scale, spacing, fonts, focus geometry */
  }

  :root,
  [data-neshel-theme="light"],
  [data-neshel-theme="system"] {
    color-scheme: light;
    /* all 21 roles, light values, canonical order */
  }

  @media (prefers-color-scheme: dark) {
    [data-neshel-theme="system"] {
      color-scheme: dark;
      /* all 21 roles, dark values */
    }
  }

  [data-neshel-theme="dark"] {
    color-scheme: dark;
    /* all 21 roles, dark values */
  }

  [data-neshel-theme="sepia"] {
    /* named themes, alphabetical, generated files only */
    color-scheme: light; /* from extends */
    /* all 21 roles, resolved */
  }
}
```

Every selector has specificity (0,1,0). Order inside the layer: theme-independent `:root`, light,
system-dark media block, dark, named themes.

Headers: shipped — `/* @neshel-ui/config default tokens. Generated from defaults; do not edit. */`;
generated — `/* Generated by "neshel generate" from <config file name> (config schema 1); do not edit. */`.
No package versions, timestamps or absolute paths (FR-024).

## Theme selection (D1, D5)

| `data-neshel-theme` | Result                                                                                |
| ------------------- | ------------------------------------------------------------------------------------- |
| absent              | light                                                                                 |
| `light`             | light, regardless of OS preference                                                    |
| `dark`              | dark, regardless of OS preference                                                     |
| `system`            | follows `prefers-color-scheme`                                                        |
| `<named>`           | that configured theme (generated CSS only)                                            |
| unknown value       | on the root: light (`:root` still matches); elsewhere: inherits from the parent scope |

Works on the root or any element; no provider or script is required.

## Precedence matrix (SC-005, automated browser test)

Each row is checked for all 21 roles plus `color-scheme`, on an element with the attribute and on
a descendant, with OS preference emulated, for the plain-CSS and Tailwind fixtures.

| #   | Root attr | OS    | Nested attr | Expected root | Expected nested   |
| --- | --------- | ----- | ----------- | ------------- | ----------------- |
| 1   | —         | light | —           | light         | light             |
| 2   | —         | dark  | —           | light         | light             |
| 3   | `light`   | dark  | —           | light         | light             |
| 4   | `dark`    | light | —           | dark          | dark              |
| 5   | `system`  | light | —           | light         | light             |
| 6   | `system`  | dark  | —           | dark          | dark              |
| 7   | `dark`    | light | `light`     | dark          | light             |
| 8   | `light`   | dark  | `dark`      | light         | dark              |
| 9   | `dark`    | dark  | `system`    | dark          | dark              |
| 10  | `dark`    | light | `system`    | dark          | light             |
| 11  | `dark`    | any   | `sepia`     | dark          | sepia (generated) |
| 12  | `sepia`   | dark  | `light`     | sepia         | light (generated) |

Additional cascade cases:

| #   | Case                                                               | Expected                                  |
| --- | ------------------------------------------------------------------ | ----------------------------------------- |
| C1  | Generated after `tailwind.css` (canonical)                         | configured values in every theme          |
| C2  | Generated before `tailwind.css`                                    | configured values (claim depends on test) |
| C3  | Generated only (plain CSS)                                         | configured values                         |
| C4  | Config overrides only `light.primary`; root `dark`                 | dark `primary` = default dark (no leak)   |
| C5  | Consumer unlayered `:root{--neshel-primary}`; root `dark`          | consumer value (documented hazard)        |
| C6  | Documented `@layer neshel.config` override pattern; root `dark`    | dark override applies                     |
| C7  | Consumer statement `@layer neshel, app;` first; app-layer override | app value wins over all Neshel themes     |
| C8  | Utility `bg-neshel-primary` under each theme                       | computed background equals role value     |
| C9  | `data-neshel-theme="dark"` + `scheme-light` on the same element    | `color-scheme: dark` (documented)         |

## Tailwind integration (`tailwind.css` only)

```css
@theme inline {
  --color-neshel-background: var(--neshel-background);
  /* … one entry per colour role, canonical order … */
  --radius-neshel-base: var(--neshel-radius-base);
  --radius-neshel-sm: var(--neshel-radius-sm);
  --radius-neshel-md: var(--neshel-radius-md);
  --radius-neshel-lg: var(--neshel-radius-lg);
  --radius-neshel-xl: var(--neshel-radius-xl);
  --radius-neshel-full: var(--neshel-radius-full);
  --font-neshel-body: var(--neshel-font-body);
  --font-neshel-display: var(--neshel-font-display);
  --font-neshel-mono: var(--neshel-font-mono);
}
```

- `inline` makes utilities reference `var(--neshel-*)`, so scopes and generated values flow
  through without regenerating Tailwind variables.
- Reserved namespaces: `--neshel-*`, `--color-neshel-*`, `--radius-neshel-*`, `--font-neshel-*`.
  Consumer theme variables are untouched; no Tailwind defaults are overridden.
- No `@source` is needed. No custom variant in 0.x.

## Rules for every Neshel stylesheet

- Only `:root` and `[data-neshel-theme=…]` selectors; no resets, `@font-face` or `url()`.
- LF line endings, two-space indentation, trailing newline, canonical ordering.
