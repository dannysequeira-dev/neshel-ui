import type { ReactNode } from "react";
import { type ApiPackage, describe, findExport } from "@/lib/api";
import { dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

/** Renders inline `code` spans from JSDoc text without interpreting HTML. */
function richText(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, index) =>
    part.startsWith("`") && part.endsWith("`") ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: static text segments
      <code key={index}>{part.slice(1, -1)}</code>
    ) : (
      part
    ),
  );
}

/**
 * Props (or definition) of a public export, generated from the package declarations
 * (generated/api/<package>.json) — never hand-written (research R5).
 */
export function ApiTable({
  package: pkg,
  name,
  locale = "en",
}: {
  package: ApiPackage;
  name: string;
  locale?: Locale;
}) {
  const t = dictionary(locale);
  const item = findExport(pkg, name);
  const props = Array.isArray(item.props) ? item.props : undefined;
  const lead = item.description ? describe(item.description, locale) : undefined;
  return (
    <div className="my-6" id={`api-${name.toLowerCase()}`}>
      <p className="not-prose mb-2 font-mono text-sm font-semibold">{name}</p>
      {lead ? <p lang={lead.translated ? undefined : "en"}>{richText(lead.text)}</p> : null}
      {item.definition && !props ? (
        <pre className="not-prose overflow-x-auto rounded-lg border border-fd-border bg-fd-muted/40 p-3 text-sm">
          <code>{`type ${name} = ${item.definition}`}</code>
        </pre>
      ) : null}
      {props && props.length > 0 ? (
        <div className="not-prose overflow-x-auto rounded-lg border border-fd-border">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{name}</caption>
            <thead className="bg-fd-muted/40 text-start">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {t.apiProp}
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {t.apiType}
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {t.apiDefault}
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {t.apiDescription}
                </th>
              </tr>
            </thead>
            <tbody>
              {props.map((prop) => {
                const description = describe(prop.description, locale);
                return (
                  <tr key={prop.name} className="border-t border-fd-border align-top">
                    <th
                      scope="row"
                      className="whitespace-nowrap px-3 py-2 text-start font-mono font-normal"
                    >
                      {prop.name}
                      {prop.optional ? (
                        ""
                      ) : (
                        <span className="ms-1 text-xs text-fd-error">({t.apiRequired})</span>
                      )}
                    </th>
                    <td className="px-3 py-2 font-mono text-xs">
                      <code className="break-words">{prop.type}</code>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {prop.default ? <code>{prop.default}</code> : "—"}
                    </td>
                    <td className="px-3 py-2" lang={description.translated ? undefined : "en"}>
                      {description.text ? richText(description.text) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {item.inherits && item.inherits.length > 0 ? (
        <p className="mt-2 text-sm text-fd-muted-foreground">
          {t.apiInherits}: {item.inherits.join(", ")}.
        </p>
      ) : null}
    </div>
  );
}

/** Component badge: client module or server-compatible, from the built JS (generated data). */
export function ComponentKind({
  package: pkg,
  name,
  locale = "en",
}: {
  package: ApiPackage;
  name: string;
  locale?: Locale;
}) {
  const item = findExport(pkg, name);
  const t = dictionary(locale);
  if (item.kind !== "component") return null;
  return (
    <span className="not-prose inline-block rounded-md border border-fd-border px-2 py-0.5 text-xs">
      {item.client ? t.apiClient : t.apiServer}
    </span>
  );
}
