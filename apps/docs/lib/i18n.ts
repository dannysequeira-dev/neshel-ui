import { defineI18n } from "fumadocs-core/i18n";

/**
 * English is the canonical technical source; Spanish mirrors it (content/docs/{en,es}).
 * Pages missing in a locale fall back to English with a visible notice (research R3).
 */
export const i18n = defineI18n({
  defaultLanguage: "en",
  languages: ["en", "es"],
  parser: "dir",
  hideLocale: "never",
  fallbackLanguage: "en",
});

export type Locale = (typeof i18n.languages)[number];

export const locales = i18n.languages as readonly Locale[];

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
