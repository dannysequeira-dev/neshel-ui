/**
 * Shared marks (Phase 015, internal; ADR 0030 §1): the success checkmark geometry used by `./svg` S10
 * (`SuccessCheck`) and `./feedback` F05 (`SuccessMark`), so neither family imports the other. 52×52 viewBox.
 */
export const CHECK_VIEWBOX = "0 0 52 52";
export const CHECK_CIRCLE = { cx: 26, cy: 26, r: 23 } as const;
export const CHECK_PATH = "M15 27l7 7 15-16";
