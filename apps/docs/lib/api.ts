import cli from "@/generated/api/cli.json";
import components from "@/generated/api/components.json";
import config from "@/generated/api/config.json";
import layout from "@/generated/api/layout.json";
import typography from "@/generated/api/typography.json";
import apiEs from "@/i18n/api.es.json";
import type { Locale } from "./i18n";

export type ApiPackage = "config" | "layout" | "typography" | "components";

export interface ApiProp {
  name: string;
  type: string;
  optional: boolean;
  description: string;
  default?: string;
  deprecated?: boolean;
  variantOnly?: boolean;
}

export interface ApiExport {
  name: string;
  description: string;
  module?: string;
  kind: "component" | "function" | "class" | "const" | "interface" | "type" | "other";
  signature?: string;
  props?: string | ApiProp[];
  client?: boolean;
  definition?: string;
  type?: string;
  inherits?: string[];
}

const data: Record<ApiPackage, { package: string; exports: ApiExport[] }> = {
  config: config as never,
  layout: layout as never,
  typography: typography as never,
  components: components as never,
};

export const cliApi = cli;

export function packageApi(pkg: ApiPackage) {
  return data[pkg];
}

export function findExport(pkg: ApiPackage, name: string): ApiExport {
  const found = data[pkg].exports.find((item) => item.name === name);
  if (!found) throw new Error(`@neshel-ui/${pkg} has no export "${name}" (generated/api)`);
  return found;
}

const spanish = apiEs as Record<string, string>;

/** Localised description: Spanish from i18n/api.es.json when available (research R5). */
export function describe(text: string, locale: Locale): { text: string; translated: boolean } {
  if (!text || locale === "en") return { text, translated: true };
  const translated = spanish[text];
  return translated ? { text: translated, translated: true } : { text, translated: false };
}
