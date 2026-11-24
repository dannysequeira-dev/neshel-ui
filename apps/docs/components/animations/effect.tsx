import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import type { ReactNode } from "react";
import { ApiTable } from "@/components/api-table";
import { PreviewFrame } from "@/components/preview-frame";
import { costText, findEffect, reducedText } from "@/lib/animations";
import { animationApi, findExport } from "@/lib/api";
import { dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import { EffectCanvas } from "./effect-canvas";

/**
 * Facts, live example and options of one catalogue entry. Facts come from animations/catalog.json
 * (verified against the package by check:docs); the code shown is the module that runs.
 */
export async function Effect({ id, locale = "en" }: { id: string; locale?: Locale }) {
  const t = dictionary(locale);
  const effect = findEffect(id);
  const file = `${id.toLowerCase()}.tsx`;
  const source = await readFile(join(process.cwd(), "demos", "animations", file), "utf8");
  const api = animationApi(effect.entry);
  for (const name of effect.api) findExport(api, name);
  const facts: Array<[string, ReactNode]> = [
    [t.effectImport, <code key="import">{`@neshel-ui/animations/${effect.entry}`}</code>],
    [t.effectApi, <code key="api">{effect.api.join(", ")}</code>],
    [
      t.effectStyles,
      effect.css ? (
        <code key="css">{`@neshel-ui/animations/${effect.css}`}</code>
      ) : (
        t.effectNoStyles
      ),
    ],
    [
      t.effectReduced,
      <span key="reduced">
        <code>{effect.reduced}</code> — {reducedText[effect.reduced][locale]}
      </span>,
    ],
    [t.effectCost, costText[effect.cost][locale]],
  ];
  return (
    <div className="not-prose my-6">
      <dl className="mb-4 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-medium text-fd-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="overflow-clip rounded-xl border border-fd-border">
        {effect.demo === "source" ? null : (
          <PreviewFrame
            clip
            labels={{
              page: t.themePage,
              light: t.themeLight,
              dark: t.themeDark,
              preview: t.previewLabel,
              theme: `${t.previewTheme}: ${id}`,
            }}
            title={`${t.previewLabel}: ${id}`}
          >
            <EffectCanvas id={id} loading={t.effectLoading} failed={t.effectFailed} />
          </PreviewFrame>
        )}
        <ServerCodeBlock
          code={source.replace(/\r\n/g, "\n").trimEnd()}
          lang="tsx"
          themes={{ light: "github-light-high-contrast", dark: "github-dark-high-contrast" }}
          codeblock={{
            title: effect.demo === "source" ? `${t.effectSourceOnly}: ${file}` : file,
            className: "my-0 rounded-none border-0 border-t",
          }}
        />
      </div>
      {effect.options ? (
        <details className="mt-3 rounded-lg border border-fd-border px-4 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            {t.effectOptions}: <code>{effect.options}</code>
          </summary>
          <ApiTable package={api} name={effect.options} locale={locale} />
        </details>
      ) : null}
    </div>
  );
}
