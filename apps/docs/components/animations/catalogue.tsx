import { effectHref, effects, familyOf } from "@/lib/animations";
import { dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import { basePath } from "@/lib/site";
import { CatalogueTable } from "./catalogue-table";

/** Filterable index of the 157 effects. */
export function Catalogue({ locale = "en" }: { locale?: Locale }) {
  const t = dictionary(locale);
  return (
    <CatalogueTable
      rows={effects.map((effect) => ({
        id: effect.id,
        name: effect.name[locale],
        family: familyOf(effect).name[locale],
        prefix: familyOf(effect).prefix,
        entry: effect.entry,
        api: effect.api.join(", "),
        reduced: effect.reduced,
        href: `${basePath}${effectHref(effect, locale)}`,
      }))}
      labels={{
        filter: t.catalogFilter,
        placeholder: t.catalogPlaceholder,
        family: t.catalogFamily,
        all: t.catalogAll,
        effect: t.catalogEffect,
        api: t.effectApi,
        reduced: t.effectReduced,
        import: t.effectImport,
        count: t.catalogCount,
        empty: t.catalogEmpty,
      }}
    />
  );
}
