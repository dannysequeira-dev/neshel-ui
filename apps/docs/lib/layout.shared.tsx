import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Logo } from "@/components/brand";
import { dictionary } from "./dictionary";
import type { Locale } from "./i18n";
import { repositoryUrl } from "./site";

export function baseOptions(locale: Locale): BaseLayoutProps {
  const t = dictionary(locale);
  return {
    nav: { title: <Logo />, url: `/${locale}/` },
    githubUrl: repositoryUrl,
    links: [
      { text: t.navDocs, url: `/${locale}/docs/`, active: "nested-url" },
      { text: t.navComponents, url: `/${locale}/docs/components/`, active: "nested-url" },
      { text: t.navExamples, url: `/${locale}/examples/`, active: "nested-url" },
    ],
  };
}
