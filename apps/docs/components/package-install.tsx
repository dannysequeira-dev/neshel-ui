import { Callout } from "fumadocs-ui/components/callout";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import { release } from "@/lib/release";

const themes = { light: "github-light-high-contrast", dark: "github-dark-high-contrast" } as const;

/** Install commands for pnpm, npm and Yarn, with the release status from lib/release.ts. */
export function PackageInstall({
  packages,
  dev = false,
  locale = "en",
}: {
  packages: string[];
  dev?: boolean;
  locale?: Locale;
}) {
  const list = packages.join(" ");
  const commands = {
    pnpm: `pnpm add ${dev ? "-D " : ""}${list}`,
    npm: `npm install ${dev ? "--save-dev " : ""}${list}`,
    Yarn: `yarn add ${dev ? "--dev " : ""}${list}`,
  };
  return (
    <div className="not-prose my-4">
      {release.published ? null : <ReleaseNotice locale={locale} />}
      <Tabs items={Object.keys(commands)}>
        {Object.entries(commands).map(([manager, command]) => (
          <Tab key={manager} value={manager}>
            <ServerCodeBlock code={command} lang="bash" themes={themes} />
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}

export function ReleaseNotice({ locale = "en" }: { locale?: Locale }) {
  const t = dictionary(locale);
  if (release.published) return null;
  return <Callout type="warn">{t.releaseNotice}</Callout>;
}

/** Notice for API that is on main but not in the published 0.1.0 (checked against the tag's exports). */
export function Unreleased({ locale = "en" }: { locale?: Locale }) {
  const t = dictionary(locale);
  return (
    <Callout type="warn" title={t.unreleased}>
      {t.unreleasedText}
    </Callout>
  );
}

/** Status of the private animations package; `check:docs` fails when its manifest stops being private. */
export function AnimationsStatus({ locale = "en" }: { locale?: Locale }) {
  const t = dictionary(locale);
  return (
    <Callout type="warn" title={t.animationsTitle}>
      {t.animationsText}
    </Callout>
  );
}
