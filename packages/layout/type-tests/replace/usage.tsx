// Replace mode (FR-008, SC-003): with the generated declarations in the program, only the
// configured names are accepted — the obsolete defaults are compile-time errors.
import type { BreakpointName } from "@neshel-ui/config";
import { Grid, Stack } from "../../src/index.js";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
export const exact: Equals<
  BreakpointName,
  "phone" | "phoneXL" | "tablet" | "laptop" | "desktop" | "wide"
> = true;

export const ok = (
  <Stack space={{ base: "2", phone: "3", tablet: "4", wide: "8" }}>
    <Grid columns={{ base: 1, tablet: 2, desktop: 4 }} space={{ base: "2", tablet: "4" }} />
  </Stack>
);

// @ts-expect-error "md" is not configured in replace mode
export const obsolete = <Stack space={{ base: "2", md: "4" }} />;

// @ts-expect-error "2xl" is not configured in replace mode
export const obsoleteGrid = <Grid columns={{ "2xl": 3 }} />;

// @ts-expect-error unknown name
export const typo = <Grid columns={{ tablett: 2 }} />;
