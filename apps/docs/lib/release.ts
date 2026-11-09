/**
 * Release status — the single source the website uses for version and availability claims.
 * Versions are read from the package manifests at build time; `published` flips to true only in the
 * owner-approved publication milestone, after the packages are verifiably on npm.
 */

import cliPkg from "../../../packages/cli/package.json" with { type: "json" };
import componentsPkg from "../../../packages/components/package.json" with { type: "json" };
import configPkg from "../../../packages/config/package.json" with { type: "json" };
import layoutPkg from "../../../packages/layout/package.json" with { type: "json" };
import typographyPkg from "../../../packages/typography/package.json" with { type: "json" };

export const release = {
  /** Intended first public version. */
  target: "0.1.0",
  /** Packages are NOT on npm until the owner authorises publication. */
  published: false,
  status: "release-candidate" as "release-candidate" | "published",
} as const;

export const publicPackages = [
  { name: configPkg.name, version: configPkg.version, slug: "config" },
  { name: layoutPkg.name, version: layoutPkg.version, slug: "layout" },
  { name: typographyPkg.name, version: typographyPkg.version, slug: "typography" },
  { name: componentsPkg.name, version: componentsPkg.version, slug: "components" },
  { name: cliPkg.name, version: cliPkg.version, slug: "cli" },
] as const;
