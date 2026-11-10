import { dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import { release } from "@/lib/release";
import { basePath } from "@/lib/site";

/** Starters offered as ZIP downloads; the archives are written to public/downloads at build time. */
export const starters = ["vite-tailwind", "vite-css", "next-app"] as const;

export function starterZipPath(name: (typeof starters)[number]) {
  return `${basePath}/downloads/neshel-ui-starter-${name}.zip`;
}

/**
 * Download links for the starter ZIPs (research R9): shown only once the packages are on npm
 * (`release.published`), because the starters install `@neshel-ui/*@^0.1.0` from the registry.
 */
export function StarterDownloads({ locale = "en" }: { locale?: Locale }) {
  if (!release.published) return null;
  const t = dictionary(locale);
  return (
    <ul className="not-prose my-4 flex flex-wrap gap-3">
      {starters.map((name) => (
        <li key={name}>
          <a
            href={starterZipPath(name)}
            download
            className="inline-flex items-center gap-2 rounded-md border border-fd-border px-3 py-2 text-sm font-medium hover:bg-fd-accent focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t.starterDownload} <code>neshel-ui-starter-{name}.zip</code>
          </a>
        </li>
      ))}
    </ul>
  );
}
