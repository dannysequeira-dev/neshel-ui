import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import type { Locale } from "@/lib/i18n";
import { ApiTable, ComponentKind } from "./api-table";
import { ExportList } from "./export-list";
import { PackageInstall, ReleaseNotice } from "./package-install";
import { Preview } from "./preview";
import { StarterDownloads } from "./starter-downloads";

type WithoutLocale<T extends (props: never) => unknown> = Omit<Parameters<T>[0], "locale">;

/** MDX components; locale-aware ones receive the page locale. */
export function getMDXComponents(components?: MDXComponents, locale: Locale = "en") {
  return {
    ...defaultMdxComponents,
    Callout,
    Card,
    Cards,
    Step,
    Steps,
    Tab,
    Tabs,
    ApiTable: (props: WithoutLocale<typeof ApiTable>) => <ApiTable {...props} locale={locale} />,
    ComponentKind: (props: WithoutLocale<typeof ComponentKind>) => (
      <ComponentKind {...props} locale={locale} />
    ),
    ExportList: (props: WithoutLocale<typeof ExportList>) => (
      <ExportList {...props} locale={locale} />
    ),
    PackageInstall: (props: WithoutLocale<typeof PackageInstall>) => (
      <PackageInstall {...props} locale={locale} />
    ),
    Preview: (props: WithoutLocale<typeof Preview>) => <Preview {...props} locale={locale} />,
    ReleaseNotice: (props: Omit<ComponentProps<typeof ReleaseNotice>, "locale">) => (
      <ReleaseNotice {...props} locale={locale} />
    ),
    StarterDownloads: () => <StarterDownloads locale={locale} />,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
