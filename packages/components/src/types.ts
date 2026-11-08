import type { BreakpointName } from "@neshel-ui/config";

/**
 * Responsive keys: `base` (no media query) plus the application's breakpoint names — the defaults
 * `sm md lg xl 2xl`, or the names configured in neshel.config.ts once the declarations generated
 * by `neshel generate` are part of the program (ADR 0010).
 */
export type Breakpoint = "base" | BreakpointName;

/** A value, or values per breakpoint that cascade upwards (mobile first). */
export type Responsive<T> = T | { readonly [K in Breakpoint]?: T };

/** Styling size of form fields (`uiSize`; the native `size` attribute keeps its HTML meaning). */
export type FieldSize = "sm" | "md" | "lg";
