"use client";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ComponentProps, ReactNode } from "react";
import SearchDialog from "./search";

type I18nProps = ComponentProps<typeof RootProvider>["i18n"];

/**
 * One theme switch drives Fumadocs (`class="dark"`) and Neshel (`data-neshel-theme`), research R4.
 */
export function Provider({ children, i18n }: { children: ReactNode; i18n: I18nProps }) {
  return (
    <RootProvider
      i18n={i18n}
      search={{ SearchDialog }}
      theme={{
        attribute: ["class", "data-neshel-theme"],
        defaultTheme: "system",
        enableSystem: true,
        disableTransitionOnChange: true,
      }}
    >
      {children}
    </RootProvider>
  );
}
