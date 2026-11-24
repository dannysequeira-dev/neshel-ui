import animAdvanced from "@/generated/api/animations/advanced.json";
import animAmbient from "@/generated/api/animations/ambient.json";
import animCinematic from "@/generated/api/animations/cinematic.json";
import animCore from "@/generated/api/animations/core.json";
import animEntrance from "@/generated/api/animations/entrance.json";
import animFeedback from "@/generated/api/animations/feedback.json";
import animGestures from "@/generated/api/animations/gestures.json";
import animGpu from "@/generated/api/animations/gpu.json";
import animHover from "@/generated/api/animations/hover.json";
import animLayout from "@/generated/api/animations/layout.json";
import animMedia from "@/generated/api/animations/media.json";
import animPageTransitions from "@/generated/api/animations/page-transitions.json";
import animPageTransitionsNext from "@/generated/api/animations/page-transitions-next.json";
import animPageTransitionsReactRouter from "@/generated/api/animations/page-transitions-react-router.json";
import animPress from "@/generated/api/animations/press.json";
import animRoot from "@/generated/api/animations/root.json";
import animScroll from "@/generated/api/animations/scroll.json";
import animSvg from "@/generated/api/animations/svg.json";
import animText from "@/generated/api/animations/text.json";
import cli from "@/generated/api/cli.json";
import components from "@/generated/api/components.json";
import config from "@/generated/api/config.json";
import layout from "@/generated/api/layout.json";
import typography from "@/generated/api/typography.json";
import animationsEs from "@/i18n/api.animations.es.json";
import apiEs from "@/i18n/api.es.json";
import type { Locale } from "./i18n";

/** Entries of the private animations package (feature 018): `animations/<slug>`. */
export type AnimationApi = `animations/${string}`;

export type ApiPackage = "config" | "layout" | "typography" | "components" | AnimationApi;

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

const data: Record<string, { package: string; exports: ApiExport[] }> = {
  config: config as never,
  layout: layout as never,
  typography: typography as never,
  components: components as never,
  "animations/root": animRoot as never,
  "animations/core": animCore as never,
  "animations/entrance": animEntrance as never,
  "animations/hover": animHover as never,
  "animations/press": animPress as never,
  "animations/scroll": animScroll as never,
  "animations/gestures": animGestures as never,
  "animations/layout": animLayout as never,
  "animations/cinematic": animCinematic as never,
  "animations/page-transitions": animPageTransitions as never,
  "animations/page-transitions-next": animPageTransitionsNext as never,
  "animations/page-transitions-react-router": animPageTransitionsReactRouter as never,
  "animations/text": animText as never,
  "animations/svg": animSvg as never,
  "animations/media": animMedia as never,
  "animations/ambient": animAmbient as never,
  "animations/feedback": animFeedback as never,
  "animations/advanced": animAdvanced as never,
  "animations/gpu": animGpu as never,
};

export const cliApi = cli;

export function packageApi(pkg: ApiPackage) {
  const found = data[pkg];
  if (!found) throw new Error(`No generated API data for "${pkg}"`);
  return found;
}

/** API data key of an animations subpath (`"."`, `"hover"`, `"page-transitions/next"`). */
export function animationApi(entry: string): AnimationApi {
  return `animations/${entry === "." ? "root" : entry.replaceAll("/", "-")}`;
}

export function findExport(pkg: ApiPackage, name: string): ApiExport {
  const found = packageApi(pkg).exports.find((item) => item.name === name);
  if (!found) throw new Error(`@neshel-ui/${pkg} has no export "${name}" (generated/api)`);
  return found;
}

const spanish: Record<string, string> = { ...animationsEs, ...apiEs };

/** Localised description: Spanish from i18n/api.es.json when available (research R5). */
export function describe(text: string, locale: Locale): { text: string; translated: boolean } {
  if (!text || locale === "en") return { text, translated: true };
  const translated = spanish[text];
  return translated ? { text: translated, translated: true } : { text, translated: false };
}
