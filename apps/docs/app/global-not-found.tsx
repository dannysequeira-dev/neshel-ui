import "@fontsource-variable/inter";
import "./global.css";
import { Stack } from "@neshel-ui/layout";
import { Heading, Paragraph } from "@neshel-ui/typography";
import type { Metadata } from "next";
import Image from "next/image";
import { basePath } from "@/lib/site";
import mark from "../../../assets/brand/neshel-ui-mark-256.png";

export const metadata: Metadata = {
  title: "Page not found · Página no encontrada | Neshel-UI",
  robots: { index: false },
};

/**
 * Global 404 for unmatched URLs (static hosts serve it as 404.html). Bilingual because the
 * locale of an unknown URL is unknown.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" data-neshel-theme="system">
      <body>
        <main className="grid min-h-screen place-items-center p-6">
          <Stack space="8" alignX="center" className="max-w-xl text-center">
            <Image src={mark} alt="" width={96} height={96} className="rounded-2xl" />
            <Stack space="3" alignX="center">
              <Heading as="h1" size="2xl">
                Page not found
              </Heading>
              <Paragraph tone="muted">
                The page you are looking for does not exist or has moved.
              </Paragraph>
            </Stack>
            <Stack space="3" alignX="center" lang="es">
              <Heading as="h2" size="xl">
                Página no encontrada
              </Heading>
              <Paragraph tone="muted">La página que buscas no existe o se ha movido.</Paragraph>
            </Stack>
            <nav aria-label="Recovery links">
              <ul className="flex flex-wrap justify-center gap-4 underline">
                <li>
                  <a href={`${basePath}/en/`}>Home</a>
                </li>
                <li>
                  <a href={`${basePath}/en/docs/`}>Documentation</a>
                </li>
                <li>
                  <a href={`${basePath}/es/`} lang="es">
                    Inicio
                  </a>
                </li>
                <li>
                  <a href={`${basePath}/es/docs/`} lang="es">
                    Documentación
                  </a>
                </li>
              </ul>
            </nav>
          </Stack>
        </main>
      </body>
    </html>
  );
}
