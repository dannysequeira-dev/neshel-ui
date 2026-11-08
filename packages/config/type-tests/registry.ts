// Without generated declarations, BreakpointName is the default union (FR-008).
import type { BreakpointName } from "../src/index.js";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
export const defaultsOnly: Equals<BreakpointName, "sm" | "md" | "lg" | "xl" | "2xl"> = true;
