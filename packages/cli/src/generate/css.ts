// Deterministic CSS serializer (contracts/css.md). Output depends only on the resolved config and
// options: ordered arrays, fixed indentation, LF line endings, trailing newline.
import { type ColorRole, colorRoles } from "@neshel-ui/config";
import { formatNumber } from "../fonts.js";
import type { ResolvedConfig, ResolvedTheme } from "../resolve.js";
import { fontRoles } from "../resolve.js";
import { renderComponentCss, type StyleManifest } from "./components.js";

export const LAYER_STATEMENT = "@layer neshel.defaults, neshel.config;";

export interface GenerateOptions {
  /** `defaults` for shipped stylesheets, `config` for consumer output. */
  readonly layer: "defaults" | "config";
  /** Append the Tailwind v4 `@theme inline` mapping. */
  readonly tailwind?: boolean;
  /** Comment text without delimiters; must not contain timestamps or absolute paths. */
  readonly header: string;
  /**
   * Component manifests to render with the configured breakpoints (feature 004). Ignored when the
   * configuration has no `breakpoints`.
   */
  readonly components?: readonly StyleManifest[];
}

/** Font metric custom properties of one role (contracts/typography-css.md §1). */
export function metricDeclarations(config: ResolvedConfig): string[] {
  return fontRoles.flatMap((role) => {
    const { constants } = config.typography[role];
    return [
      `--neshel-font-${role}-scale: ${formatNumber(constants.scale)};`,
      `--neshel-font-${role}-cap-trim: ${formatNumber(constants.capTrim)};`,
      `--neshel-font-${role}-baseline-trim: ${formatNumber(constants.baselineTrim)};`,
      `--neshel-font-${role}-trim: ${constants.trim};`,
    ];
  });
}

/** `surfaceForeground` → `surface-foreground`. */
export function kebab(role: string): string {
  return role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function cssVariable(role: ColorRole): string {
  return `--neshel-${kebab(role)}`;
}

const radiusKeys = ["base", "sm", "md", "lg", "xl", "full"] as const;

function block(indent: string, selectors: readonly string[], declarations: readonly string[]) {
  const lines = selectors.map((selector, index) =>
    index === selectors.length - 1 ? `${indent}${selector} {` : `${indent}${selector},`,
  );
  for (const declaration of declarations) lines.push(`${indent}  ${declaration}`);
  lines.push(`${indent}}`);
  return lines.join("\n");
}

function themeDeclarations(theme: ResolvedTheme): string[] {
  return [
    `color-scheme: ${theme.colorScheme};`,
    ...colorRoles.map((role) => `${cssVariable(role)}: ${theme.colors[role]};`),
  ];
}

const attribute = (name: string) => `[data-neshel-theme="${name}"]`;

export function generateCss(config: ResolvedConfig, options: GenerateOptions): string {
  if (/\*\//.test(options.header)) throw new Error("header must not contain */");
  const light = config.themes.find((theme) => theme.name === "light");
  const dark = config.themes.find((theme) => theme.name === "dark");
  if (!light || !dark) throw new Error("resolved config must contain light and dark themes");
  const named = config.themes.filter((theme) => theme.kind === "named");

  const rootTokens = [
    ...radiusKeys.map((key) => `--neshel-radius-${key}: ${config.radius[key]};`),
    `--neshel-spacing: ${config.spacing.unit};`,
    ...fontRoles.map((role) => `--neshel-font-${role}: ${config.fonts[role]};`),
    ...metricDeclarations(config),
    `--neshel-focus-width: ${config.focus.width};`,
    `--neshel-focus-offset: ${config.focus.offset};`,
  ];

  const inner = [
    block("  ", [":root"], rootTokens),
    block("  ", [":root", attribute("light"), attribute("system")], themeDeclarations(light)),
    [
      "  @media (prefers-color-scheme: dark) {",
      block("    ", [attribute("system")], themeDeclarations(dark)),
      "  }",
    ].join("\n"),
    block("  ", [attribute("dark")], themeDeclarations(dark)),
    ...named.map((theme) => block("  ", [attribute(theme.name)], themeDeclarations(theme))),
  ];

  const sections = [
    `/* ${options.header} */`,
    LAYER_STATEMENT,
    `@layer neshel.${options.layer} {\n${inner.join("\n\n")}\n}`,
  ];

  const fontFaces = fontRoles
    .map((role) => config.typography[role].fontFaces)
    .filter((faces) => faces !== "");
  if (fontFaces.length > 0) sections.push(fontFaces.join("\n\n"));

  const breakpoints = config.breakpoints;
  if (breakpoints) {
    const names = breakpoints.list.map((bp) => bp.name).join(" ");
    for (const manifest of options.components ?? []) {
      sections.push(
        `/* ${manifest.package} ${manifest.version} component styles (breakpoints: ${names}) */\n${renderComponentCss(manifest, breakpoints.list).trimEnd()}`,
      );
    }
  }

  if (options.tailwind) {
    const mapping = [
      ...colorRoles.map((role) => `--color-neshel-${kebab(role)}: var(${cssVariable(role)});`),
      ...radiusKeys.map((key) => `--radius-neshel-${key}: var(--neshel-radius-${key});`),
      ...fontRoles.map((role) => `--font-neshel-${role}: var(--neshel-font-${role});`),
    ];
    sections.push(block("", ["@theme inline"], mapping));
  }
  if (breakpoints?.tailwind) {
    const custom = breakpoints.list.filter(
      (bp) => breakpoints.mode === "replace" || bp.source === "config",
    );
    const lines = [
      ...(breakpoints.mode === "replace" ? ["--breakpoint-*: initial;"] : []),
      ...custom.map((bp) => `--breakpoint-${bp.name}: ${bp.width};`),
    ];
    if (lines.length > 0) sections.push(block("", ["@theme"], lines));
  }
  return `${sections.join("\n\n")}\n`;
}
