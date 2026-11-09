import { type ApiPackage, describe, packageApi } from "@/lib/api";
import { dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

/** Table of a package's public exports (generated), optionally filtered by name. */
export function ExportList({
  package: pkg,
  names,
  locale = "en",
}: {
  package: ApiPackage;
  names?: string[];
  locale?: Locale;
}) {
  const t = dictionary(locale);
  const items = packageApi(pkg).exports.filter((item) => !names || names.includes(item.name));
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-lg border border-fd-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-fd-muted/40">
          <tr>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t.apiExports}
            </th>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t.apiKind}
            </th>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t.apiDescription}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const description = describe(item.description, locale);
            return (
              <tr key={item.name} className="border-t border-fd-border align-top">
                <th scope="row" className="px-3 py-2 text-start font-mono font-normal">
                  {item.name}
                </th>
                <td className="px-3 py-2">{item.kind}</td>
                <td className="px-3 py-2" lang={description.translated ? undefined : "en"}>
                  {description.text || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
