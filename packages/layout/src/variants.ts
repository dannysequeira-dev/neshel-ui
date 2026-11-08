/**
 * tailwind-variants composition (ADR 0008). The lite entry joins classes without
 * tailwind-merge: no emitted class is a Tailwind utility, and the resolver selects at most one
 * class per CSS property and breakpoint, so there is nothing to merge.
 */
import { tv } from "tailwind-variants/lite";
import { breakpoints, propertyClassName, propertyKeys, tokensFor } from "./style-tables.js";

/** One variant per (breakpoint, property key): `md_ai: { center: "neshel-md-ai-center", … }`. */
const responsiveVariants: Record<string, Record<string, string>> = {};
for (const bp of breakpoints) {
  for (const key of propertyKeys) {
    responsiveVariants[`${bp}_${key}`] = Object.fromEntries(
      Object.keys(tokensFor(bp, key)).map((token) => [token, propertyClassName(bp, key, token)]),
    );
  }
}

/** Shared responsive vocabulary; every primitive extends it. */
export const layoutVariants = tv({ variants: responsiveVariants });

export const boxVariants = tv({ extend: layoutVariants });
export const flexVariants = tv({ extend: layoutVariants, base: "neshel-flex" });
export const stackVariants = tv({ extend: layoutVariants, base: "neshel-stack" });
export const inlineVariants = tv({ extend: layoutVariants, base: "neshel-inline" });
export const gridVariants = tv({ extend: layoutVariants, base: "neshel-grid" });
export const centerVariants = tv({
  extend: layoutVariants,
  base: "neshel-center",
  defaultVariants: { base_ai: "center", base_jc: "center" },
});
export const containerVariants = tv({
  extend: layoutVariants,
  base: "neshel-container",
  defaultVariants: { base_mw: "xl" },
});

export const separatorVariants = tv({
  base: "neshel-separator",
  variants: {
    orientation: {
      horizontal: "neshel-separator-horizontal",
      vertical: "neshel-separator-vertical",
    },
  },
});

export type LayoutVariantFn = (props: Record<string, string | undefined>) => string | undefined;
