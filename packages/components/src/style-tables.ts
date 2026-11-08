/**
 * Single source of truth for the components stylesheet (ADR 0013,
 * specs/005-components-navigation-shell/contracts/components-css.md). The style manifest
 * (schema 2) and therefore `styles.css` and configured-breakpoint stylesheets are generated from
 * these tables. No React, no tailwind-variants: importable from plain Node.
 *
 * Every colour is a semantic token (`var(--neshel-<role>)`) or a `color-mix()` of tokens.
 */

/** Style manifest schema (2: keyframes and media conditions, ADR 0013). */
export const manifestSchema = 2;

export type Declaration = readonly [property: string, value: string];
type Block = Readonly<Record<string, string>> | readonly Declaration[];

export interface StyleRule {
  readonly selector: string;
  readonly declarations: readonly Declaration[];
  readonly media?: string;
}

export interface Keyframes {
  readonly name: string;
  readonly frames: ReadonlyArray<{ selector: string; declarations: readonly Declaration[] }>;
}

const toDeclarations = (block: Block): Declaration[] =>
  Array.isArray(block)
    ? [...(block as readonly Declaration[])]
    : Object.entries(block as Record<string, string>);

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** `n` spacing units (`--neshel-spacing`, 0.25rem by default). */
const sp = (n: number) => `calc(var(--neshel-spacing) * ${n})`;
const role = (name: string) => `var(--neshel-${name})`;
/** A mix of two roles; `weight` is the percentage of the first one. */
const mix = (a: string, weight: number, b: string) =>
  `color-mix(in srgb, ${role(a)} ${weight}%, ${b === "transparent" ? "transparent" : role(b)})`;
const shadow = (y: number, blur: number, alpha: number) =>
  `0 ${y}px ${blur}px color-mix(in srgb, var(--neshel-foreground) ${alpha}%, transparent)`;
const focusRing: Block = {
  outline: `var(--neshel-focus-width) solid ${role("focus")}`,
  "outline-offset": "var(--neshel-focus-offset)",
};
const focusRingInset: Block = {
  outline: `var(--neshel-focus-width) solid ${role("focus")}`,
  "outline-offset": "calc(var(--neshel-focus-width) * -1)",
};
const visuallyHidden: Block = {
  position: "absolute",
  "inline-size": "1px",
  "block-size": "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  "clip-path": "inset(50%)",
  "white-space": "nowrap",
  border: "0",
};
const popupSurface: Block = {
  "box-sizing": "border-box",
  border: `1px solid ${role("border")}`,
  "border-radius": role("radius-md"),
  "background-color": role("surface"),
  color: role("surface-foreground"),
  "box-shadow": shadow(8, 24, 14),
  "font-family": role("font-body"),
  "font-size": "0.875rem",
  "line-height": "1.4",
  outline: "none",
};

const rules: StyleRule[] = [];
function rule(selector: string | readonly string[], block: Block, media?: string): void {
  const joined = typeof selector === "string" ? selector : selector.join(", ");
  rules.push({
    selector: joined,
    declarations: toDeclarations(block),
    ...(media ? { media } : {}),
  });
}

// ---------------------------------------------------------------------------------------------
// Keyframes
// ---------------------------------------------------------------------------------------------

const frames = (from: Block, to: Block) => [
  { selector: "from", declarations: toDeclarations(from) },
  { selector: "to", declarations: toDeclarations(to) },
];
const slide: Record<string, string> = {
  left: "translateX(-100%)",
  right: "translateX(100%)",
  top: "translateY(-100%)",
  bottom: "translateY(100%)",
};

export const keyframes: readonly Keyframes[] = [
  { name: "neshel-fade-in", frames: frames({ opacity: "0" }, { opacity: "1" }) },
  { name: "neshel-fade-out", frames: frames({ opacity: "1" }, { opacity: "0" }) },
  {
    name: "neshel-zoom-in",
    frames: frames({ opacity: "0", transform: "scale(0.96)" }, { opacity: "1", transform: "none" }),
  },
  {
    name: "neshel-zoom-out",
    frames: frames({ opacity: "1", transform: "none" }, { opacity: "0", transform: "scale(0.96)" }),
  },
  ...Object.entries(slide).flatMap(([side, transform]) => [
    { name: `neshel-slide-in-${side}`, frames: frames({ transform }, { transform: "none" }) },
    { name: `neshel-slide-out-${side}`, frames: frames({ transform: "none" }, { transform }) },
  ]),
  {
    name: "neshel-pulse",
    frames: [
      { selector: "from", declarations: [["opacity", "1"]] },
      { selector: "50%", declarations: [["opacity", "0.5"]] },
      { selector: "to", declarations: [["opacity", "1"]] },
    ],
  },
  {
    name: "neshel-spin",
    frames: frames({ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }),
  },
];

// ---------------------------------------------------------------------------------------------
// Shared: visually hidden, field sizes, icons
// ---------------------------------------------------------------------------------------------

rule(".neshel-visually-hidden", visuallyHidden);

/** Field sizes shared by Input, Select, MultiSelect and Combobox (`uiSize`). */
export const fieldSizes = {
  sm: { height: "2rem", px: sp(2.5), font: "0.8125rem" },
  md: { height: "2.5rem", px: sp(3), font: "0.875rem" },
  lg: { height: "3rem", px: sp(4), font: "1rem" },
} as const;
for (const [size, { height, px, font }] of Object.entries(fieldSizes)) {
  rule(`.neshel-field-size-${size}`, {
    "--neshel-field-height": height,
    "--neshel-field-px": px,
    "--neshel-field-font-size": font,
  });
}

rule(".neshel-icon", {
  flex: "none",
  "inline-size": "1em",
  "block-size": "1em",
  "pointer-events": "none",
});

// ---------------------------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------------------------

export const buttonVariantNames = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;

rule(".neshel-button", {
  position: "relative",
  display: "inline-flex",
  "align-items": "center",
  "justify-content": "center",
  gap: sp(2),
  "box-sizing": "border-box",
  "min-block-size": "var(--neshel-button-height, 2.5rem)",
  margin: "0",
  "padding-block": "0",
  "padding-inline": `var(--neshel-button-px, ${sp(4)})`,
  border: "1px solid transparent",
  "border-radius": role("radius-md"),
  "font-family": "inherit",
  "font-size": "var(--neshel-button-font-size, 0.875rem)",
  "font-weight": "500",
  "line-height": "1.25",
  "text-decoration": "none",
  "white-space": "nowrap",
  cursor: "pointer",
  "user-select": "none",
  transition: "background-color 150ms ease, border-color 150ms ease, color 150ms ease",
});
rule(".neshel-button:focus-visible", focusRing);
rule([".neshel-button > svg", ".neshel-button-content > svg"], {
  flex: "none",
  "inline-size": "1.125em",
  "block-size": "1.125em",
  "pointer-events": "none",
});
rule(".neshel-button-icon-only", {
  "inline-size": "var(--neshel-button-height, 2.5rem)",
  "padding-inline": "0",
});
rule(".neshel-button-full-width", { "inline-size": "100%" });

const solid = (name: string, bg: string, fg: string) => {
  rule(`.neshel-button-variant-${name}`, { "background-color": role(bg), color: role(fg) });
  rule(`.neshel-button-variant-${name}:hover:not(:disabled, [aria-disabled="true"])`, {
    "background-color": mix(bg, 86, fg),
  });
  rule(`.neshel-button-variant-${name}:active:not(:disabled, [aria-disabled="true"])`, {
    "background-color": mix(bg, 78, fg),
  });
};
solid("primary", "primary", "primary-foreground");
solid("secondary", "secondary", "secondary-foreground");
solid("destructive", "destructive", "destructive-foreground");
rule(".neshel-button-variant-outline", {
  "background-color": "transparent",
  "border-color": role("input"),
  color: role("foreground"),
});
rule(".neshel-button-variant-ghost", {
  "background-color": "transparent",
  color: role("foreground"),
});
rule(
  [
    '.neshel-button-variant-outline:hover:not(:disabled, [aria-disabled="true"])',
    '.neshel-button-variant-ghost:hover:not(:disabled, [aria-disabled="true"])',
  ],
  { "background-color": role("muted"), color: role("foreground") },
);
rule(
  [
    '.neshel-button-variant-outline:active:not(:disabled, [aria-disabled="true"])',
    '.neshel-button-variant-ghost:active:not(:disabled, [aria-disabled="true"])',
  ],
  { "background-color": mix("muted", 85, "foreground") },
);
rule(".neshel-button-variant-link", {
  "background-color": "transparent",
  color: role("primary"),
  "text-underline-offset": "0.2em",
});
rule('.neshel-button-variant-link:hover:not(:disabled, [aria-disabled="true"])', {
  "text-decoration": "underline",
});
rule(".neshel-button:disabled", {
  "background-color": role("disabled"),
  color: role("disabled-foreground"),
  "border-color": "transparent",
  cursor: "not-allowed",
});
rule([".neshel-button-variant-ghost:disabled", ".neshel-button-variant-link:disabled"], {
  "background-color": "transparent",
});
rule('.neshel-button[aria-disabled="true"]', { cursor: "not-allowed" });
rule(".neshel-button[data-loading]", { cursor: "progress" });
rule(".neshel-button-content", {
  display: "inline-flex",
  "align-items": "center",
  gap: "inherit",
});
rule(".neshel-button[data-loading] > .neshel-button-content", { opacity: "0" });
rule(".neshel-button-spinner", {
  position: "absolute",
  inset: "0",
  margin: "auto",
  "inline-size": "1.125em",
  "block-size": "1.125em",
  "box-sizing": "border-box",
  border: "2px solid currentColor",
  "border-inline-end-color": "transparent",
  "border-radius": role("radius-full"),
  animation: "neshel-spin 700ms linear infinite",
});
rule(".neshel-button-spinner", { "animation-duration": "1500ms" }, REDUCED_MOTION);
rule(".neshel-button", { transition: "none" }, REDUCED_MOTION);

/** Responsive Button sizes (`neshel-[<bp>-]button-size-<size>`). */
export const buttonSizes = {
  sm: { height: "2rem", px: sp(3), font: "0.8125rem" },
  md: { height: "2.5rem", px: sp(4), font: "0.875rem" },
  lg: { height: "3rem", px: sp(6), font: "1rem" },
} as const;

// ---------------------------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------------------------

export const cardPaddings = { sm: [4, 3], md: [6, 4], lg: [8, 6] } as const;
rule(".neshel-card", {
  display: "flex",
  "flex-direction": "column",
  gap: `var(--neshel-card-gap, ${sp(4)})`,
  "box-sizing": "border-box",
  "min-inline-size": "0",
  padding: `var(--neshel-card-padding, ${sp(6)})`,
  "border-radius": role("radius-lg"),
  border: `1px solid ${role("border")}`,
});
for (const [size, [padding, gap]] of Object.entries(cardPaddings)) {
  rule(`.neshel-card-padding-${size}`, {
    "--neshel-card-padding": sp(padding),
    "--neshel-card-gap": sp(gap),
  });
}
rule(".neshel-card-variant-default", {
  "background-color": role("surface"),
  color: role("surface-foreground"),
  "box-shadow": shadow(1, 2, 8),
});
rule(".neshel-card-variant-outline", { "background-color": "transparent", color: "inherit" });
rule(".neshel-card-variant-muted", {
  "background-color": role("muted"),
  color: role("foreground"),
  "border-color": "transparent",
});
rule(".neshel-card-header", {
  display: "grid",
  "grid-template-columns": "minmax(0, 1fr) auto",
  "column-gap": sp(4),
  "row-gap": sp(1.5),
  "align-items": "start",
});
rule(".neshel-card-header > :not(.neshel-card-action)", { "grid-column": "1" });
rule(".neshel-card-action", {
  "grid-column": "2",
  "grid-row": "1 / span 2",
  "align-self": "start",
  "justify-self": "end",
});
rule(".neshel-card-title", {
  margin: "0",
  "font-size": "1.125rem",
  "font-weight": "600",
  "line-height": "1.3",
  color: "inherit",
});
rule(".neshel-card-description", {
  margin: "0",
  "font-size": "0.875rem",
  "line-height": "1.5",
  color: role("muted-foreground"),
});
rule(".neshel-card-content", { "min-inline-size": "0" });
rule(".neshel-card-footer", {
  display: "flex",
  "flex-wrap": "wrap",
  "align-items": "center",
  gap: sp(2),
});

// ---------------------------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------------------------

rule(".neshel-badge", {
  display: "inline-flex",
  "align-items": "center",
  gap: sp(1),
  "box-sizing": "border-box",
  border: "1px solid transparent",
  "border-radius": role("radius-full"),
  "font-family": "inherit",
  "font-weight": "500",
  "line-height": "1",
  "white-space": "nowrap",
  "vertical-align": "middle",
});
rule(".neshel-badge > svg", { flex: "none", "inline-size": "0.875em", "block-size": "0.875em" });
rule(".neshel-badge-size-sm", { padding: `${sp(0.5)} ${sp(2)}`, "font-size": "0.75rem" });
rule(".neshel-badge-size-md", { padding: `${sp(1)} ${sp(2.5)}`, "font-size": "0.8125rem" });
export const badgeVariants = {
  default: ["primary", "primary-foreground"],
  secondary: ["secondary", "secondary-foreground"],
  success: ["success", "success-foreground"],
  warning: ["warning", "warning-foreground"],
  destructive: ["destructive", "destructive-foreground"],
  accent: ["accent", "accent-foreground"],
} as const;
for (const [name, [bg, fg]] of Object.entries(badgeVariants)) {
  rule(`.neshel-badge-variant-${name}`, { "background-color": role(bg), color: role(fg) });
}
rule(".neshel-badge-variant-outline", {
  "background-color": "transparent",
  "border-color": role("border"),
  color: role("foreground"),
});

// ---------------------------------------------------------------------------------------------
// Input, Label
// ---------------------------------------------------------------------------------------------

const fieldBox: Block = {
  "box-sizing": "border-box",
  "inline-size": "100%",
  "min-inline-size": "0",
  margin: "0",
  border: `1px solid ${role("input")}`,
  "border-radius": role("radius-md"),
  "background-color": role("surface"),
  color: role("surface-foreground"),
  "font-family": "inherit",
  "font-size": "var(--neshel-field-font-size, 0.875rem)",
  "line-height": "1.25",
};
rule(".neshel-input", {
  ...fieldBox,
  "min-block-size": "var(--neshel-field-height, 2.5rem)",
  "padding-block": sp(1.5),
  "padding-inline": `var(--neshel-field-px, ${sp(3)})`,
});
rule(".neshel-input::placeholder", { color: role("muted-foreground"), opacity: "1" });
rule(".neshel-input:focus-visible", focusRing);
rule(".neshel-input::file-selector-button", {
  "margin-inline-end": sp(3),
  border: "0",
  "background-color": "transparent",
  color: role("foreground"),
  font: "inherit",
  "font-weight": "500",
});
rule(".neshel-input:read-only:not(:disabled)", {
  "background-color": role("muted"),
  color: role("foreground"),
});
rule(
  [
    '.neshel-input[aria-invalid="true"]',
    '.neshel-select-trigger[aria-invalid="true"]',
    ".neshel-combobox[data-invalid]",
  ],
  { "border-color": role("destructive") },
);
rule(
  [
    '.neshel-input[aria-invalid="true"]:focus-visible',
    '.neshel-select-trigger[aria-invalid="true"]:focus-visible',
    ".neshel-combobox[data-invalid]:focus-within",
  ],
  { "outline-color": role("destructive") },
);
rule(".neshel-input:disabled", {
  "background-color": role("disabled"),
  color: role("disabled-foreground"),
  "border-color": role("border"),
  cursor: "not-allowed",
});
rule(".neshel-label", {
  display: "inline-flex",
  "align-items": "center",
  gap: sp(1),
  "font-family": "inherit",
  "font-size": "0.875rem",
  "font-weight": "500",
  "line-height": "1.25",
  color: "inherit",
});
rule(".neshel-label-required", { color: role("destructive") });

// ---------------------------------------------------------------------------------------------
// Separator (`neshel-rule`; visually identical to the layout separators)
// ---------------------------------------------------------------------------------------------

rule(".neshel-rule", {
  flex: "none",
  "align-self": "stretch",
  margin: "0",
  padding: "0",
  border: `0 solid ${role("border")}`,
});
rule(".neshel-rule-horizontal", { "border-block-start-width": "1px", "block-size": "0" });
rule(".neshel-rule-vertical", {
  "border-inline-start-width": "1px",
  "inline-size": "0",
  "min-block-size": "1em",
});

// ---------------------------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------------------------

rule(".neshel-skeleton", {
  display: "block",
  "box-sizing": "border-box",
  "inline-size": "100%",
  "block-size": "1rem",
  "border-radius": role("radius-md"),
  "background-color": role("muted"),
  animation: "neshel-pulse 2s ease-in-out infinite",
});
rule(".neshel-skeleton-shape-circle", {
  "inline-size": "2.5rem",
  "block-size": "auto",
  "aspect-ratio": "1",
  "border-radius": role("radius-full"),
});
rule(".neshel-skeleton-shape-text", { "block-size": "1em", "border-radius": role("radius-sm") });
rule(".neshel-skeleton", { animation: "none" }, REDUCED_MOTION);

// ---------------------------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------------------------

rule(".neshel-tooltip", {
  "z-index": "var(--neshel-z-popover, 60)",
  "box-sizing": "border-box",
  "max-inline-size": "20rem",
  padding: `${sp(1.5)} ${sp(2.5)}`,
  "border-radius": role("radius-sm"),
  "background-color": role("foreground"),
  color: role("background"),
  "font-family": role("font-body"),
  "font-size": "0.75rem",
  "line-height": "1.4",
  animation: "neshel-fade-in 150ms ease-out",
});

// ---------------------------------------------------------------------------------------------
// Overlays: backdrop, dialog, sheet, popover
// ---------------------------------------------------------------------------------------------

rule(".neshel-portal", { display: "contents" });
rule(".neshel-overlay", [
  ["position", "fixed"],
  ["inset", "0"],
  ["z-index", "var(--neshel-z-overlay, 50)"],
  [
    "background-color",
    `var(--neshel-overlay-backdrop, light-dark(${mix("foreground", 45, "transparent")}, ${mix("background", 75, "transparent")}))`,
  ],
]);
rule('.neshel-overlay[data-state="open"]', { animation: "neshel-fade-in 180ms ease-out" });
rule('.neshel-overlay[data-state="closed"]', { animation: "neshel-fade-out 120ms ease-in" });

export const dialogSizes = { sm: "24rem", md: "32rem", lg: "42rem", xl: "56rem" } as const;
const panel: Block = {
  position: "fixed",
  "z-index": "var(--neshel-z-overlay, 50)",
  display: "flex",
  "flex-direction": "column",
  gap: sp(4),
  "box-sizing": "border-box",
  padding: sp(6),
  "overflow-y": "auto",
  "background-color": role("surface"),
  color: role("surface-foreground"),
  "box-shadow": shadow(16, 48, 20),
  "font-family": role("font-body"),
  "font-size": "0.875rem",
  "line-height": "1.5",
};
rule(".neshel-dialog-content", {
  ...panel,
  inset: "0",
  margin: "auto",
  "inline-size": `min(calc(100% - ${sp(8)}), var(--neshel-dialog-width, 32rem))`,
  "block-size": "fit-content",
  "max-block-size": `calc(100dvh - ${sp(8)})`,
  border: `1px solid ${role("border")}`,
  "border-radius": role("radius-lg"),
});
for (const [size, width] of Object.entries(dialogSizes)) {
  rule(`.neshel-dialog-size-${size}`, { "--neshel-dialog-width": width });
}
rule(".neshel-dialog-size-full", {
  "--neshel-dialog-width": "100%",
  "block-size": `calc(100dvh - ${sp(8)})`,
});
rule([".neshel-dialog-content:focus", ".neshel-sheet-content:focus"], { outline: "none" });
rule('.neshel-dialog-content[data-state="open"]', { animation: "neshel-zoom-in 180ms ease-out" });
rule('.neshel-dialog-content[data-state="closed"]', { animation: "neshel-zoom-out 120ms ease-in" });
rule(".neshel-dialog-close", {
  position: "absolute",
  "inset-block-start": sp(3),
  "inset-inline-end": sp(3),
});
rule(".neshel-dialog-header", {
  display: "flex",
  "flex-direction": "column",
  gap: sp(1.5),
  "padding-inline-end": sp(8),
});
rule(".neshel-dialog-title", {
  margin: "0",
  "font-size": "1.125rem",
  "font-weight": "600",
  "line-height": "1.3",
  color: "inherit",
});
rule(".neshel-dialog-description", {
  margin: "0",
  "font-size": "0.875rem",
  color: role("muted-foreground"),
});
rule(".neshel-dialog-body", { "min-block-size": "0" });
rule(".neshel-dialog-footer", {
  display: "flex",
  "flex-wrap": "wrap",
  "justify-content": "flex-end",
  gap: sp(2),
});

export const sheetSizes = { sm: "20rem", md: "24rem", lg: "32rem" } as const;
rule(".neshel-sheet-content", panel);
for (const [size, width] of Object.entries(sheetSizes)) {
  rule(`.neshel-sheet-size-${size}`, { "--neshel-sheet-size": width });
}
const sideRules: Record<string, Block> = {
  left: {
    top: "0",
    bottom: "0",
    left: "0",
    "inline-size": `min(var(--neshel-sheet-size, 24rem), calc(100% - ${sp(10)}))`,
    "border-right": `1px solid ${role("border")}`,
  },
  right: {
    top: "0",
    bottom: "0",
    right: "0",
    "inline-size": `min(var(--neshel-sheet-size, 24rem), calc(100% - ${sp(10)}))`,
    "border-left": `1px solid ${role("border")}`,
  },
  top: {
    top: "0",
    left: "0",
    right: "0",
    "max-block-size": "85dvh",
    "border-bottom": `1px solid ${role("border")}`,
  },
  bottom: {
    bottom: "0",
    left: "0",
    right: "0",
    "max-block-size": "85dvh",
    "border-top": `1px solid ${role("border")}`,
  },
};
for (const [side, block] of Object.entries(sideRules)) {
  rule(`.neshel-sheet-side-${side}`, block);
  rule(`.neshel-sheet-side-${side}[data-state="open"]`, {
    animation: `neshel-slide-in-${side} 220ms ease-out`,
  });
  rule(`.neshel-sheet-side-${side}[data-state="closed"]`, {
    animation: `neshel-slide-out-${side} 160ms ease-in`,
  });
}

rule(".neshel-popover-content", {
  ...popupSurface,
  "z-index": "var(--neshel-z-popover, 60)",
  "inline-size": "max-content",
  "max-inline-size": `min(22rem, calc(100vw - ${sp(4)}))`,
  padding: sp(4),
  "transform-origin": "var(--radix-popover-content-transform-origin)",
});
rule(['.neshel-popover-content[data-state="open"]', '.neshel-menu-content[data-state="open"]'], {
  animation: "neshel-zoom-in 140ms ease-out",
});
rule(
  ['.neshel-popover-content[data-state="closed"]', '.neshel-menu-content[data-state="closed"]'],
  { animation: "neshel-zoom-out 100ms ease-in" },
);

// ---------------------------------------------------------------------------------------------
// DropdownMenu
// ---------------------------------------------------------------------------------------------

rule(".neshel-menu-content", {
  ...popupSurface,
  "z-index": "var(--neshel-z-popover, 60)",
  "min-inline-size": "10rem",
  "max-block-size": "var(--radix-dropdown-menu-content-available-height, 24rem)",
  "overflow-y": "auto",
  padding: sp(1),
  "transform-origin": "var(--radix-dropdown-menu-content-transform-origin)",
});
const listItem: Block = {
  position: "relative",
  display: "flex",
  "align-items": "center",
  gap: sp(2),
  "box-sizing": "border-box",
  "min-block-size": "2rem",
  padding: `${sp(1.5)} ${sp(2)}`,
  "border-radius": role("radius-sm"),
  color: "inherit",
  "text-decoration": "none",
  cursor: "default",
  "user-select": "none",
  outline: "none",
};
rule(".neshel-menu-item", listItem);
rule(".neshel-menu-item > svg", { flex: "none", "inline-size": "1rem", "block-size": "1rem" });
rule([".neshel-menu-item[data-highlighted]", '.neshel-menu-item[data-state="open"]'], {
  "background-color": role("selected"),
  color: role("selected-foreground"),
});
rule([".neshel-menu-item:focus-visible", ".neshel-select-item:focus-visible"], focusRingInset);
rule(".neshel-menu-item[data-disabled]", {
  color: role("disabled-foreground"),
  "pointer-events": "none",
});
rule(".neshel-menu-item-destructive", { color: role("destructive") });
rule(".neshel-menu-item-destructive[data-highlighted]", {
  "background-color": role("destructive"),
  color: role("destructive-foreground"),
});
rule([".neshel-menu-item-inset", ".neshel-menu-item-indicated"], {
  "padding-inline-start": sp(8),
});
rule(".neshel-menu-indicator", {
  position: "absolute",
  "inset-inline-start": sp(2),
  display: "inline-flex",
  "justify-content": "center",
  "inline-size": "1rem",
});
rule(".neshel-menu-label", {
  padding: `${sp(1.5)} ${sp(2)}`,
  "font-size": "0.75rem",
  "font-weight": "600",
  color: role("muted-foreground"),
});
rule(".neshel-menu-separator", {
  "block-size": "1px",
  margin: `${sp(1)} calc(${sp(1)} * -1)`,
  "background-color": role("border"),
});
rule(".neshel-menu-shortcut", {
  "margin-inline-start": "auto",
  "padding-inline-start": sp(4),
  "font-size": "0.75rem",
  "letter-spacing": "0.05em",
  color: role("muted-foreground"),
});
rule(".neshel-menu-item[data-highlighted] .neshel-menu-shortcut", { color: "inherit" });
rule(".neshel-menu-chevron", { "margin-inline-start": "auto" });

// ---------------------------------------------------------------------------------------------
// Select, MultiSelect, Combobox (Base UI)
// ---------------------------------------------------------------------------------------------

rule(".neshel-select-trigger", {
  ...fieldBox,
  display: "inline-flex",
  "align-items": "center",
  "justify-content": "space-between",
  gap: sp(2),
  "min-block-size": "var(--neshel-field-height, 2.5rem)",
  "padding-block": sp(1),
  "padding-inline": `var(--neshel-field-px, ${sp(3)})`,
  "text-align": "start",
  cursor: "pointer",
});
rule([".neshel-select-trigger:focus-visible", ".neshel-combobox:focus-within"], focusRing);
rule([".neshel-select-trigger[data-disabled]", ".neshel-combobox[data-disabled]"], {
  "background-color": role("disabled"),
  color: role("disabled-foreground"),
  "border-color": role("border"),
  cursor: "not-allowed",
});
rule([".neshel-select-trigger[data-readonly]", ".neshel-combobox[data-readonly]"], {
  "background-color": role("muted"),
  color: role("foreground"),
});
rule(".neshel-select-value", {
  flex: "1 1 auto",
  "min-inline-size": "0",
  overflow: "hidden",
  "text-overflow": "ellipsis",
  "white-space": "nowrap",
});
rule(".neshel-select-placeholder", { color: role("muted-foreground") });
rule(".neshel-select-trigger[data-disabled] .neshel-select-placeholder", { color: "inherit" });
rule(".neshel-select-icon", {
  display: "inline-flex",
  flex: "none",
  color: role("muted-foreground"),
});
rule(".neshel-select-positioner", { "z-index": "var(--neshel-z-popover, 60)", outline: "0" });
rule(".neshel-select-popup", {
  ...popupSurface,
  "min-inline-size": "var(--anchor-width)",
  "max-inline-size": "var(--available-width)",
  "max-block-size": "min(var(--available-height), 20rem)",
  "overflow-y": "auto",
  padding: sp(1),
  "transform-origin": "var(--transform-origin)",
  transition: "opacity 120ms ease, transform 120ms ease",
});
rule([".neshel-select-popup[data-starting-style]", ".neshel-select-popup[data-ending-style]"], {
  opacity: "0",
  transform: "scale(0.98)",
});
rule(".neshel-select-item", {
  ...listItem,
  "padding-inline-start": sp(8),
  "scroll-margin-block": sp(1),
});
rule(".neshel-select-item[data-highlighted]", {
  "background-color": role("selected"),
  color: role("selected-foreground"),
});
rule(".neshel-select-item[data-selected]", { "font-weight": "600" });
rule(".neshel-select-item[data-disabled]", {
  color: role("disabled-foreground"),
  cursor: "not-allowed",
});
rule(".neshel-select-item-indicator", {
  position: "absolute",
  "inset-inline-start": sp(2),
  display: "inline-flex",
  "justify-content": "center",
  "inline-size": "1rem",
});
rule(".neshel-select-group-label", {
  padding: `${sp(1.5)} ${sp(2)}`,
  "font-size": "0.75rem",
  "font-weight": "600",
  color: role("muted-foreground"),
});
rule(".neshel-select-group + .neshel-select-group", {
  "margin-block-start": sp(1),
  "padding-block-start": sp(1),
  "border-block-start": `1px solid ${role("border")}`,
});
rule(".neshel-select-empty:empty", { display: "none" });
rule(".neshel-select-empty", {
  padding: `${sp(2)} ${sp(3)}`,
  color: role("muted-foreground"),
});
rule(".neshel-multi-select", {
  display: "flex",
  "flex-direction": "column",
  gap: sp(2),
  "min-inline-size": "0",
});
rule(".neshel-chip-list", {
  display: "flex",
  "flex-wrap": "wrap",
  "align-items": "center",
  gap: sp(1.5),
  margin: "0",
  padding: "0",
  "list-style": "none",
});
rule(".neshel-chip", {
  display: "inline-flex",
  "align-items": "center",
  gap: sp(1),
  "max-inline-size": "100%",
  "box-sizing": "border-box",
  padding: `${sp(0.5)} ${sp(1)} ${sp(0.5)} ${sp(2.5)}`,
  "border-radius": role("radius-full"),
  "background-color": role("secondary"),
  color: role("secondary-foreground"),
  "font-size": "0.8125rem",
  "line-height": "1.25",
});
rule(".neshel-chip-label", {
  overflow: "hidden",
  "text-overflow": "ellipsis",
  "white-space": "nowrap",
});
rule([".neshel-chip-remove", ".neshel-field-icon-button"], {
  display: "inline-flex",
  "align-items": "center",
  "justify-content": "center",
  flex: "none",
  "inline-size": "1.5rem",
  "block-size": "1.5rem",
  margin: "0",
  padding: "0",
  border: "0",
  "border-radius": role("radius-full"),
  "background-color": "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
});
rule([".neshel-chip-remove:hover", ".neshel-field-icon-button:hover"], {
  "background-color": mix("foreground", 12, "transparent"),
});
rule([".neshel-chip-remove:focus-visible", ".neshel-field-icon-button:focus-visible"], focusRing);
rule(".neshel-field-icon-button", { color: role("muted-foreground") });
rule(".neshel-multi-select-clear", {
  "align-self": "flex-start",
  margin: "0",
  padding: "0",
  border: "0",
  "background-color": "transparent",
  color: role("primary"),
  font: "inherit",
  "font-size": "0.8125rem",
  "text-decoration": "underline",
  "text-underline-offset": "0.2em",
  cursor: "pointer",
});
rule(".neshel-multi-select-clear:focus-visible", focusRing);
rule(".neshel-combobox", {
  ...fieldBox,
  position: "relative",
  display: "flex",
  "flex-wrap": "wrap",
  "align-items": "center",
  gap: sp(1),
  "min-block-size": "var(--neshel-field-height, 2.5rem)",
  padding: `${sp(1)} ${sp(1)} ${sp(1)} calc(var(--neshel-field-px, ${sp(3)}) - ${sp(1)})`,
  cursor: "text",
});
rule(".neshel-combobox-input", {
  flex: "1 1 6rem",
  "min-inline-size": "4rem",
  "block-size": "1.75rem",
  margin: "0",
  padding: `0 ${sp(1)}`,
  border: "0",
  outline: "none",
  "background-color": "transparent",
  color: "inherit",
  font: "inherit",
});
rule(".neshel-combobox-input::placeholder", { color: role("muted-foreground"), opacity: "1" });
rule(".neshel-combobox-input:disabled", { cursor: "not-allowed" });
rule(".neshel-combobox-actions", {
  display: "inline-flex",
  "align-items": "center",
  "margin-inline-start": "auto",
});
rule(".neshel-combobox .neshel-chip", { "background-color": role("secondary") });

// ---------------------------------------------------------------------------------------------
// Navigation: Navbar, NavigationMenu, MobileMenu
// ---------------------------------------------------------------------------------------------

const navLink: Block = {
  display: "inline-flex",
  "align-items": "center",
  gap: sp(1.5),
  "box-sizing": "border-box",
  "min-block-size": "2.25rem",
  margin: "0",
  padding: `0 ${sp(3)}`,
  border: "0",
  "border-radius": role("radius-md"),
  "background-color": "transparent",
  color: role("foreground"),
  font: "inherit",
  "font-size": "0.875rem",
  "font-weight": "500",
  "text-decoration": "none",
  "white-space": "nowrap",
  cursor: "pointer",
};
rule(".neshel-navbar", {
  display: "flex",
  "align-items": "center",
  gap: sp(4),
  "box-sizing": "border-box",
  "min-block-size": "var(--neshel-navbar-height, 3.5rem)",
  padding: `0 ${sp(4)}`,
  "border-block-end": `1px solid ${role("border")}`,
  "background-color": role("background"),
  color: role("foreground"),
});
rule(".neshel-navbar-sticky", {
  position: "sticky",
  "inset-block-start": "0",
  "z-index": "var(--neshel-z-navbar, 40)",
});
rule(".neshel-navbar-brand", {
  display: "inline-flex",
  "align-items": "center",
  gap: sp(2),
  flex: "none",
  "font-size": "1rem",
  "font-weight": "600",
  color: "inherit",
  "text-decoration": "none",
});
rule(".neshel-navbar-brand:focus-visible", focusRing);
rule(".neshel-navbar-nav", { display: "flex", "min-inline-size": "0" });
rule(".neshel-navbar-nav-responsive", { display: "none" });
rule([".neshel-navbar-list", ".neshel-navigation-menu-list"], {
  display: "flex",
  "align-items": "center",
  gap: sp(1),
  margin: "0",
  padding: "0",
  "list-style": "none",
});
rule(
  [".neshel-navbar-link", ".neshel-navigation-menu-trigger", ".neshel-navigation-menu-link"],
  navLink,
);
rule(
  [
    ".neshel-navbar-link:hover",
    ".neshel-navigation-menu-trigger:hover",
    '.neshel-navigation-menu-trigger[data-state="open"]',
    ".neshel-navigation-menu-link:hover",
  ],
  { "background-color": role("muted"), color: role("foreground") },
);
rule(
  [
    ".neshel-navbar-link:focus-visible",
    ".neshel-navigation-menu-trigger:focus-visible",
    ".neshel-navigation-menu-link:focus-visible",
    ".neshel-mobile-menu-link:focus-visible",
  ],
  focusRing,
);
rule(
  ['.neshel-navbar-link[aria-current="page"]', '.neshel-navigation-menu-link[aria-current="page"]'],
  {
    color: role("primary"),
    "font-weight": "600",
    "text-decoration": "underline",
    "text-decoration-thickness": "2px",
    "text-underline-offset": "0.4em",
  },
);
rule(".neshel-navbar-actions", {
  display: "flex",
  "align-items": "center",
  gap: sp(2),
  "margin-inline-start": "auto",
});
rule(".neshel-navigation-menu", { position: "relative", display: "flex" });
rule(".neshel-navigation-menu-item", { position: "relative" });
rule(".neshel-chevron", { transition: "transform 150ms ease" });
rule(
  [
    '.neshel-navigation-menu-trigger[data-state="open"] .neshel-chevron',
    '.neshel-sidebar-sub-trigger[aria-expanded="true"] .neshel-chevron',
  ],
  { transform: "rotate(180deg)" },
);
rule(".neshel-navigation-menu-content", {
  ...popupSurface,
  position: "absolute",
  "inset-block-start": `calc(100% + ${sp(2)})`,
  "inset-inline-start": "0",
  "z-index": "var(--neshel-z-popover, 60)",
  "min-inline-size": "14rem",
  padding: sp(2),
  animation: "neshel-fade-in 140ms ease-out",
});
rule(".neshel-navigation-menu-content .neshel-navigation-menu-link", {
  display: "flex",
  "flex-direction": "column",
  "align-items": "flex-start",
  gap: sp(0.5),
  "min-block-size": "auto",
  padding: `${sp(2)} ${sp(3)}`,
  "white-space": "normal",
});
rule(".neshel-mobile-menu-trigger", { "--neshel-menu-mode": "mobile" });
rule(".neshel-mobile-menu-list", {
  display: "flex",
  "flex-direction": "column",
  gap: sp(1),
  margin: "0",
  padding: "0",
  "list-style": "none",
});
rule(".neshel-mobile-menu-link", {
  ...navLink,
  display: "flex",
  "inline-size": "100%",
  "min-block-size": "2.75rem",
  "font-size": "1rem",
});
rule(".neshel-mobile-menu-link:hover", { "background-color": role("muted") });
rule(
  [
    '.neshel-mobile-menu-link[aria-current="page"]',
    '.neshel-sidebar-item[aria-current="page"]',
    ".neshel-sidebar-item[data-active]",
  ],
  {
    "background-color": role("selected"),
    color: role("selected-foreground"),
    "font-weight": "600",
  },
);

// ---------------------------------------------------------------------------------------------
// AppShell and Sidebar
// ---------------------------------------------------------------------------------------------

rule(".neshel-app-shell", {
  "--neshel-shell-mode": "mobile",
  "--neshel-shell-sidebar-display": "none",
  display: "grid",
  "grid-template-columns": "minmax(0, 1fr)",
  "min-block-size": "100dvh",
  "background-color": role("background"),
  color: role("foreground"),
});
rule(".neshel-app-shell-main", {
  display: "flex",
  "flex-direction": "column",
  "min-inline-size": "0",
  "min-block-size": "100dvh",
});
rule(".neshel-app-shell-content", {
  flex: "1 1 auto",
  "min-inline-size": "0",
  "box-sizing": "border-box",
  padding: `var(--neshel-shell-content-padding, ${sp(6)})`,
});
rule(".neshel-app-shell-content:focus", { outline: "none" });
rule([".neshel-sidebar-trigger", ".neshel-mobile-menu-trigger"], { flex: "none" });
rule(".neshel-sidebar", {
  "--neshel-sidebar-current-width": "var(--neshel-sidebar-width, 16rem)",
  display: "flex",
  "flex-direction": "column",
  "box-sizing": "border-box",
  "inline-size": "var(--neshel-sidebar-current-width)",
  "block-size": "100dvh",
  position: "sticky",
  "inset-block-start": "0",
  overflow: "hidden",
  "border-inline-end": `1px solid ${role("border")}`,
  "background-color": role("surface"),
  color: role("surface-foreground"),
  transition: "inline-size 200ms ease",
});
rule(".neshel-app-shell > .neshel-sidebar", { display: "var(--neshel-shell-sidebar-display)" });
rule('.neshel-sidebar[data-collapsed][data-collapsible="icon"]', {
  "--neshel-sidebar-current-width": "var(--neshel-sidebar-rail-width, 3.5rem)",
});
rule('.neshel-sidebar[data-collapsed][data-collapsible="offcanvas"]', { display: "none" });
rule(".neshel-sidebar-sheet", {
  "--neshel-sheet-size": "var(--neshel-sidebar-width, 16rem)",
  padding: "0",
  gap: "0",
});
rule(".neshel-sidebar-header", {
  display: "flex",
  "align-items": "center",
  gap: sp(2),
  "box-sizing": "border-box",
  "min-block-size": "var(--neshel-navbar-height, 3.5rem)",
  padding: sp(3),
  overflow: "hidden",
});
rule(".neshel-sidebar-content", {
  display: "flex",
  "flex-direction": "column",
  gap: sp(4),
  flex: "1 1 auto",
  "min-block-size": "0",
  padding: sp(2),
  "overflow-x": "hidden",
  "overflow-y": "auto",
});
rule(".neshel-sidebar-footer", {
  display: "flex",
  "flex-direction": "column",
  gap: sp(2),
  padding: sp(3),
  "border-block-start": `1px solid ${role("border")}`,
});
rule(".neshel-sidebar-group", { display: "flex", "flex-direction": "column", gap: sp(1) });
rule(".neshel-sidebar-group-label", {
  padding: `${sp(1)} ${sp(2)}`,
  "font-size": "0.75rem",
  "font-weight": "600",
  "letter-spacing": "0.02em",
  color: role("muted-foreground"),
  "white-space": "nowrap",
  overflow: "hidden",
});
rule(".neshel-sidebar-list", {
  display: "flex",
  "flex-direction": "column",
  gap: sp(0.5),
  margin: "0",
  padding: "0",
  "list-style": "none",
});
rule(".neshel-sidebar-item", {
  position: "relative",
  display: "flex",
  "align-items": "center",
  gap: sp(3),
  "box-sizing": "border-box",
  "inline-size": "100%",
  "min-block-size": "2.25rem",
  margin: "0",
  padding: `${sp(2)} ${sp(2.5)}`,
  border: "0",
  "border-radius": role("radius-md"),
  "background-color": "transparent",
  color: "inherit",
  font: "inherit",
  "font-size": "0.875rem",
  "text-align": "start",
  "text-decoration": "none",
  "white-space": "nowrap",
  cursor: "pointer",
});
rule(".neshel-sidebar-item:hover", {
  "background-color": role("muted"),
  color: role("foreground"),
});
rule(".neshel-sidebar-item:focus-visible", focusRingInset);
rule([".neshel-sidebar-item > svg", ".neshel-sidebar-item-icon"], {
  display: "inline-flex",
  flex: "none",
  "inline-size": "1.125rem",
  "block-size": "1.125rem",
});
rule(".neshel-sidebar-item-icon > svg", { "inline-size": "100%", "block-size": "100%" });
rule(".neshel-sidebar-item-label", {
  flex: "1 1 auto",
  "min-inline-size": "0",
  overflow: "hidden",
  "text-overflow": "ellipsis",
});
rule(".neshel-sidebar-sub-list", {
  "margin-inline-start": sp(4.5),
  "padding-inline-start": sp(2),
  "border-inline-start": `1px solid ${role("border")}`,
});
rule(".neshel-sidebar-separator", {
  "block-size": "1px",
  margin: `${sp(1)} ${sp(2)}`,
  border: "0",
  "background-color": role("border"),
});
const rail = '.neshel-sidebar[data-collapsed][data-collapsible="icon"]';
rule([`${rail} .neshel-sidebar-item-label`, `${rail} .neshel-sidebar-group-label`], visuallyHidden);
rule(`${rail} .neshel-sidebar-item`, { "justify-content": "center", "padding-inline": "0" });
rule([`${rail} .neshel-sidebar-sub-list`, `${rail} .neshel-chevron`], { display: "none" });
rule(".neshel-sidebar", { transition: "none" }, REDUCED_MOTION);

// ---------------------------------------------------------------------------------------------
// Reduced motion for overlays (Radix Presence unmounts immediately without an animation)
// ---------------------------------------------------------------------------------------------

rule(
  [
    ".neshel-overlay",
    ".neshel-dialog-content",
    ".neshel-sheet-content",
    ".neshel-popover-content",
    ".neshel-menu-content",
    ".neshel-tooltip",
    ".neshel-navigation-menu-content",
    ".neshel-sidebar-sheet",
  ],
  { animation: "none" },
  REDUCED_MOTION,
);
rule([".neshel-select-popup", ".neshel-chevron"], { transition: "none" }, REDUCED_MOTION);

export const baseRules: readonly StyleRule[] = rules;

// ---------------------------------------------------------------------------------------------
// Responsive tables: `neshel-[<bp>-]<key>-<token>` (ADR 0010)
// ---------------------------------------------------------------------------------------------

export const responsiveTables = {
  "button-size": Object.fromEntries(
    Object.entries(buttonSizes).map(([size, { height, px, font }]) => [
      size,
      [
        ["--neshel-button-height", height],
        ["--neshel-button-px", px],
        ["--neshel-button-font-size", font],
      ] as Declaration[],
    ]),
  ),
  shell: {
    desktop: [
      ["--neshel-shell-mode", "desktop"],
      ["--neshel-shell-sidebar-display", "flex"],
      ["grid-template-columns", "auto minmax(0, 1fr)"],
    ] as Declaration[],
  },
  "navbar-nav": { visible: [["display", "flex"]] as Declaration[] },
  menu: {
    desktop: [
      ["--neshel-menu-mode", "desktop"],
      ["display", "none"],
    ] as Declaration[],
  },
} as const satisfies Record<string, Record<string, readonly Declaration[]>>;

export type TableKey = keyof typeof responsiveTables;
export const tableKeys = Object.keys(responsiveTables) as TableKey[];

/** Class name for a table token at a breakpoint (the key is validated by the runtime grammar). */
export function responsiveClassName(breakpoint: string, key: TableKey, token: string): string {
  return breakpoint === "base" ? `neshel-${key}-${token}` : `neshel-${breakpoint}-${key}-${token}`;
}

/** Style manifest data (schema 2), without package metadata. */
export function manifestRules() {
  return {
    keyframes: keyframes.map(({ name, frames: list }) => ({
      name,
      frames: list.map(({ selector, declarations }) => ({ selector, declarations })),
    })),
    rules: baseRules.map(({ selector, declarations, media }) => ({
      selector,
      declarations,
      ...(media ? { media } : {}),
    })),
    responsive: tableKeys.flatMap((key) =>
      Object.entries(responsiveTables[key]).map(([token, declarations]) => ({
        class: `${key}-${token}`,
        declarations,
      })),
    ),
  };
}
