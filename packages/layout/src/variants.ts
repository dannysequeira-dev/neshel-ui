/**
 * tailwind-variants composition (ADR 0008, ADR 0010). The lite entry joins classes without
 * tailwind-merge: no emitted class is a Tailwind utility, and responsive classes (resolved by
 * `resolve.ts` from table lookups) are passed through `class`, so there is nothing to merge.
 */
import { tv } from "tailwind-variants/lite";

export const flexVariants = tv({ base: "neshel-flex" });
export const stackVariants = tv({ base: "neshel-stack" });
export const inlineVariants = tv({ base: "neshel-inline" });
export const gridVariants = tv({ base: "neshel-grid" });
export const centerVariants = tv({ base: "neshel-center" });
export const containerVariants = tv({ base: "neshel-container" });

export const separatorVariants = tv({
  base: "neshel-separator",
  variants: {
    orientation: {
      horizontal: "neshel-separator-horizontal",
      vertical: "neshel-separator-vertical",
    },
  },
});
