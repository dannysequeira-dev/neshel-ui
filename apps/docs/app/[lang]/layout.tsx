import "@fontsource-variable/inter";
import "../global.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Provider } from "@/components/provider";
import { isLocale, type Locale, locales } from "@/lib/i18n";
import { siteMetadata } from "@/lib/metadata";
import { i18nUI } from "@/lib/ui-i18n";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  return siteMetadata(isLocale(lang) ? lang : "en");
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#040d1d" },
  ],
};

export default async function LocaleLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "en";
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Provider i18n={i18nUI.provider(locale)}>{children}</Provider>
      </body>
    </html>
  );
}
