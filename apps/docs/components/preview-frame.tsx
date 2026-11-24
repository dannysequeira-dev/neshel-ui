"use client";
import { type ReactNode, useId, useState } from "react";

type Mode = "page" | "light" | "dark";

/** Preview canvas with a theme override (light/dark) applied through data-neshel-theme. */
export function PreviewFrame({
  children,
  labels,
  title,
  clip = false,
}: {
  children: ReactNode;
  /** Clip instead of scroll, so that `position: sticky` follows the page (animation examples). */
  clip?: boolean;
  labels: { page: string; light: string; dark: string; preview: string; theme: string };
  title?: string;
}) {
  const [mode, setMode] = useState<Mode>("page");
  const groupId = useId();
  return (
    <section aria-labelledby={groupId}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fd-border bg-fd-muted/40 px-3 py-2 text-sm">
        <span id={groupId} className="font-medium text-fd-muted-foreground">
          {title ?? labels.preview}
        </span>
        <fieldset className="flex items-center gap-1">
          <legend className="sr-only">{labels.theme}</legend>
          {(["page", "light", "dark"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className="rounded-md px-2 py-1 text-xs aria-pressed:bg-fd-primary aria-pressed:text-fd-primary-foreground"
            >
              {labels[value]}
            </button>
          ))}
        </fieldset>
      </div>
      <div
        className={`docs-preview-canvas p-6 ${clip ? "overflow-clip" : "overflow-x-auto"}`}
        data-neshel-theme={mode === "page" ? undefined : mode}
      >
        {children}
      </div>
    </section>
  );
}
