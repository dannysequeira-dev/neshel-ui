/**
 * Side-effect-free vocabulary shared by the runtime and the style tables. Runtime modules import
 * only this file, so bundles that use a few components never evaluate the stylesheet tables
 * (tree-shaking, research R2 / SC-007).
 */

export const buttonVariantNames = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;

export const buttonSizeNames = ["sm", "md", "lg"] as const;

export const badgeColorVariants = [
  "default",
  "secondary",
  "success",
  "warning",
  "destructive",
  "accent",
] as const;

/** Responsive class tables (`neshel-[<bp>-]<key>-<token>`). */
export type TableKey = "button-size" | "shell" | "navbar-nav" | "menu";

/** Class name for a table token at a breakpoint (the key is validated by the runtime grammar). */
export function responsiveClassName(breakpoint: string, key: TableKey, token: string): string {
  return breakpoint === "base" ? `neshel-${key}-${token}` : `neshel-${breakpoint}-${key}-${token}`;
}
