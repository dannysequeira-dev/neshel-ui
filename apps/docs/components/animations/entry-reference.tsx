import { ApiTable } from "@/components/api-table";
import { type ApiExport, animationApi, packageApi } from "@/lib/api";
import { dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

const order = ["component", "function", "const", "class", "interface", "type", "other"];

function Declaration({ item }: { item: ApiExport }) {
  const text = item.signature ?? item.type ?? item.definition;
  return (
    <>
      {item.description ? (
        <p className="mt-2 text-sm" lang="en">
          {item.description}
        </p>
      ) : null}
      {text ? (
        <pre className="my-2 whitespace-pre-wrap break-words rounded-lg border border-fd-border bg-fd-muted/40 p-3 text-xs">
          <code>{text}</code>
        </pre>
      ) : null}
    </>
  );
}

/** Every export of one animations subpath, generated from its declarations. */
export function EntryReference({ entry, locale = "en" }: { entry: string; locale?: Locale }) {
  const t = dictionary(locale);
  const key = animationApi(entry);
  const items = [...packageApi(key).exports].sort(
    (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || (a.name < b.name ? -1 : 1),
  );
  return (
    <div className="my-6" data-entry-reference={entry}>
      {t.referenceEnglish ? <p>{t.referenceEnglish}</p> : null}
      <ul className="not-prose divide-y divide-fd-border rounded-lg border border-fd-border">
        {items.map((item) => (
          <li key={item.name}>
            <details className="px-4 py-2">
              <summary className="cursor-pointer">
                <code className="font-semibold">{item.name}</code>{" "}
                <span className="text-xs text-fd-muted-foreground">{item.kind}</span>
              </summary>
              {Array.isArray(item.props) && item.props.length ? (
                <ApiTable package={key} name={item.name} locale={locale} />
              ) : (
                <Declaration item={item} />
              )}
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
