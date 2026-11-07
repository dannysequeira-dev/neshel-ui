# Theme and token model (proposed)

## Current working baseline

`packages/config/src/styles.css` contains a handful of experimental namespaced
variables. The CSS import is functional after `pnpm build:packages`; it is **not**
the final public schema. Dark theme uses `[data-neshel-theme="dark"]`.

## Design principles

- Prefer semantic tokens over component-specific hardcoded colors.
- Every interactive surface needs background/foreground and contrast expectations.
- Define light + dark with stable token names and readable defaults.
- `@theme inline` exposes namespaced Tailwind v4 utilities; be mindful of collisions.
- Avoid utility class strings synthesized from props (`bg-${color}-500`).
- Do not assume Tailwind scans packages under `node_modules`.

## Planned `neshel.config.ts`

```ts
import { defineConfig } from "@neshel-ui/config";

export default defineConfig({
  themes: {
    light: {
      primary: "#6d28d9",
      primaryForeground: "#ffffff",
      background: "#ffffff",
      foreground: "#18121f",
    },
    dark: {
      primary: "#c4a6ff",
      primaryForeground: "#18121f",
      background: "#0d0b13",
      foreground: "#f6f2fa",
    },
  },
  typography: {
    body: { family: "Inter" },
    display: { family: "Inter" },
  },
});
```

This is **illustrative**; `defineConfig` is NOT implemented.

## Consumption modes

**Simple:** import the default package stylesheet and optionally override
`--neshel-*` variables. No CLI or provider needed. Users import CSS themselves.

**Advanced:** CLI loads the local config in a build/dev tool context, validates
values and generates a `neshel.generated.css`. The application imports it **after**
base CSS. A generation script should be explicit (e.g. predev/prebuild), not an
opaque package-install hook.

## Tailwind source detection

Explicit stylesheet imports are required. If a consumer needs Tailwind to discover
classes used within a third-party package (because they are not shipped in a
compiled stylesheet), register a correct `@source` path relative to its CSS file.
Prefer precompiled package CSS to avoid this requirement.

Official background: https://tailwindcss.com/docs/detecting-classes-in-source-files
