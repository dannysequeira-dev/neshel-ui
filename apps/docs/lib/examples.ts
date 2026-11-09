import type { Locale } from "./i18n";

export const exampleSlugs = ["dashboard", "form", "landing"] as const;
export type ExampleSlug = (typeof exampleSlugs)[number];

export function isExampleSlug(value: string): value is ExampleSlug {
  return (exampleSlugs as readonly string[]).includes(value);
}

/** Localised titles and descriptions of the application examples. */
export const exampleText: Record<
  ExampleSlug,
  Record<Locale, { title: string; description: string }>
> = {
  dashboard: {
    en: {
      title: "Responsive dashboard",
      description:
        "AppShell with a collapsible sidebar (a drawer below lg), Navbar, KPI cards, a project list, an account DropdownMenu and a Dialog that creates projects.",
    },
    es: {
      title: "Panel adaptable",
      description:
        "AppShell con barra lateral contraíble (un cajón por debajo de lg), Navbar, tarjetas de indicadores, una lista de proyectos, un DropdownMenu de cuenta y un Dialog que crea proyectos.",
    },
  },
  form: {
    en: {
      title: "Advanced form",
      description:
        "Input, Label, Select, MultiSelect and Combobox in a native form: controlled and uncontrolled fields, dependent options, validation messages and the FormData the browser submits.",
    },
    es: {
      title: "Formulario avanzado",
      description:
        "Input, Label, Select, MultiSelect y Combobox en un formulario nativo: campos controlados y no controlados, opciones dependientes, mensajes de validación y el FormData que envía el navegador.",
    },
  },
  landing: {
    en: {
      title: "Landing page",
      description:
        "A public page for a fictional product in a custom named theme: responsive Navbar with MobileMenu, hero, feature cards and pricing — the same components, a different identity.",
    },
    es: {
      title: "Página de presentación",
      description:
        "Una página pública para un producto ficticio con un tema propio: Navbar adaptable con MobileMenu, cabecera, tarjetas de características y precios; los mismos componentes con otra identidad.",
    },
  },
};
