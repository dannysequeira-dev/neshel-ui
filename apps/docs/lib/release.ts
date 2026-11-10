/**
 * Release status — the single source the website uses for version and availability claims.
 * Versions are read from the package manifests at build time. `published` became true in feature 007
 * after 0.1.0 was verified on npm (release run 42843343125; registry, provenance and clean install).
 */

import cliPkg from "../../../packages/cli/package.json" with { type: "json" };
import componentsPkg from "../../../packages/components/package.json" with { type: "json" };
import configPkg from "../../../packages/config/package.json" with { type: "json" };
import layoutPkg from "../../../packages/layout/package.json" with { type: "json" };
import typographyPkg from "../../../packages/typography/package.json" with { type: "json" };

export const release = {
  /** Current public version on npm. */
  target: "0.1.0",
  /** The five public packages are on npm (verified 2026-11-10). */
  published: true,
  status: "published" as "release-candidate" | "published",
} as const;

export const publicPackages = [
  { name: configPkg.name, version: configPkg.version, slug: "config" },
  { name: layoutPkg.name, version: layoutPkg.version, slug: "layout" },
  { name: typographyPkg.name, version: typographyPkg.version, slug: "typography" },
  { name: componentsPkg.name, version: componentsPkg.version, slug: "components" },
  { name: cliPkg.name, version: cliPkg.version, slug: "cli" },
] as const;
