import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import { demos } from "@/demos/registry";
import { dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import { PreviewFrame } from "./preview-frame";

/**
 * Live preview of a real demo module (apps/docs/demos/<demo>.tsx) followed by that same file's
 * source, so the code shown is the code that runs (research R7).
 */
export async function Preview({
  demo,
  locale = "en",
  title,
}: {
  demo: string;
  locale?: Locale;
  title?: string;
}) {
  const Demo = demos[demo as keyof typeof demos];
  if (!Demo) throw new Error(`Unknown demo "${demo}" (apps/docs/demos/registry.ts)`);
  const code = (await readFile(join(process.cwd(), "demos", `${demo}.tsx`), "utf8")).replace(
    /\r\n/g,
    "\n",
  );
  const t = dictionary(locale);
  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-fd-border">
      <PreviewFrame
        labels={{
          page: t.themePage,
          light: t.themeLight,
          dark: t.themeDark,
          preview: t.previewLabel,
          theme: t.previewTheme,
        }}
        title={title}
      >
        <Demo />
      </PreviewFrame>
      <ServerCodeBlock
        code={code.trimEnd()}
        lang="tsx"
        themes={{ light: "github-light", dark: "github-dark" }}
        codeblock={{
          title: `${demo.split("/").pop()}.tsx`,
          className: "my-0 rounded-none border-0 border-t",
        }}
      />
    </div>
  );
}
