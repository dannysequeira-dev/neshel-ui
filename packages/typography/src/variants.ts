/**
 * tailwind-variants composition (ADR 0008/0011). The lite entry joins classes without
 * tailwind-merge: no emitted class is a Tailwind utility, and the resolver emits at most one class
 * per property and breakpoint, so there is nothing to merge.
 */
import { tv } from "tailwind-variants/lite";

export const typographyVariants = tv({ base: "neshel-typography" });
