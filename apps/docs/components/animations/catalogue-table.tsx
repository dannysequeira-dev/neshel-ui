"use client";
import { useId, useState } from "react";

export interface CatalogueRow {
  id: string;
  name: string;
  family: string;
  prefix: string;
  entry: string;
  api: string;
  reduced: string;
  href: string;
}

export interface CatalogueLabels {
  filter: string;
  placeholder: string;
  family: string;
  all: string;
  effect: string;
  api: string;
  reduced: string;
  import: string;
  count: string;
  empty: string;
}

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** The whole catalogue with a text and a family filter; without JavaScript every row is listed. */
export function CatalogueTable({
  rows,
  labels,
}: {
  rows: CatalogueRow[];
  labels: CatalogueLabels;
}) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const textId = useId();
  const familyId = useId();
  const needle = fold(query.trim());
  const shown = rows.filter(
    (row) =>
      (!family || row.prefix === family) &&
      (!needle ||
        fold([row.id, row.name, row.family, row.entry, row.api].join(" ")).includes(needle)),
  );
  const families = [...new Map(rows.map((row) => [row.prefix, row.family]))];
  const headers = [
    "Id",
    labels.effect,
    labels.family,
    labels.import,
    labels.api,
    labels.reduced,
  ] as const;
  const control = "rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm";
  return (
    <div className="not-prose my-6" data-catalogue>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <label htmlFor={textId} className="text-sm font-medium">
            {labels.filter}
          </label>
          <input
            id={textId}
            type="search"
            value={query}
            placeholder={labels.placeholder}
            onChange={(event) => setQuery(event.currentTarget.value)}
            className={control}
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor={familyId} className="text-sm font-medium">
            {labels.family}
          </label>
          <select
            id={familyId}
            value={family}
            onChange={(event) => setFamily(event.currentTarget.value)}
            className={control}
          >
            <option value="">{labels.all}</option>
            {families.map(([prefix, name]) => (
              <option key={prefix} value={prefix}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <p role="status" className="text-sm text-fd-muted-foreground">
          {shown.length
            ? labels.count
                .replace("{n}", String(shown.length))
                .replace("{total}", String(rows.length))
            : labels.empty}
        </p>
      </div>
      <section
        aria-label={labels.effect}
        tabIndex={0}
        className="overflow-x-auto rounded-lg border border-fd-border"
      >
        <table className="w-full border-collapse text-sm">
          <thead className="bg-fd-muted/40">
            <tr>
              {headers.map((label) => (
                <th key={label} scope="col" className="px-3 py-2 text-start font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id} className="border-t border-fd-border align-top">
                <td className="px-3 py-2 font-mono">{row.id}</td>
                <th scope="row" className="px-3 py-2 text-start font-normal">
                  <a href={row.href} className="underline underline-offset-2">
                    {row.name}
                  </a>
                </th>
                <td className="px-3 py-2">{row.family}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.entry}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.api}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.reduced}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
