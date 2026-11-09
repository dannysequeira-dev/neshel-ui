import type { Locale } from "./i18n";

/**
 * Neshel site strings (Fumadocs' own strings live in ui-i18n.ts). Both locales must define every
 * key — enforced by the type below and by `check:docs` (translations).
 */
const en = {
  siteDescription:
    "Neshel-UI is a modular, accessible and themeable React design system: tokens, layout, typography, components and a CLI.",
  navDocs: "Documentation",
  navComponents: "Components",
  navExamples: "Examples",
  navGettingStarted: "Getting started",
  releaseBadge: "Release candidate 0.1.0 — not yet on npm",
  releaseNotice:
    "Neshel-UI 0.1.0 is a release candidate. The packages are not published to npm yet; until they are, install them from locally packed tarballs.",
  missingTranslation:
    "This page has not been translated yet. You are reading the English original.",
  editPage: "Edit this page on GitHub",
  sourceLabel: "Source",
  previewLabel: "Preview",
  themeLight: "Light",
  themeDark: "Dark",
  themePage: "Page theme",
  previewTheme: "Preview theme",
  apiProp: "Prop",
  apiType: "Type",
  apiDefault: "Default",
  apiDescription: "Description",
  apiRequired: "required",
  apiInherits: "Also accepts the props of",
  apiDefinition: "Definition",
  apiClient: 'Client component ("use client")',
  apiServer: 'Server-compatible (no "use client")',
  apiUntranslated: "Description not yet translated; showing the English text from the source.",
  apiExports: "Exports",
  apiKind: "Kind",
  copySource: "Copy source",
  notFoundTitle: "Page not found",
  notFoundBody:
    "The page you are looking for does not exist or has moved. Try the documentation home or search.",
  backHome: "Back to home",
  openDocs: "Open the documentation",
  languageChooser: "Choose a language",
};

export type Dictionary = typeof en;

const es: Dictionary = {
  siteDescription:
    "Neshel-UI es un sistema de diseño para React modular, accesible y personalizable: tokens, layout, tipografía, componentes y una CLI.",
  navDocs: "Documentación",
  navComponents: "Componentes",
  navExamples: "Ejemplos",
  navGettingStarted: "Primeros pasos",
  releaseBadge: "Versión candidata 0.1.0 — aún no está en npm",
  releaseNotice:
    "Neshel-UI 0.1.0 es una versión candidata. Los paquetes todavía no están publicados en npm; mientras tanto, instálalos desde tarballs empaquetados localmente.",
  missingTranslation: "Esta página aún no está traducida. Estás leyendo el original en inglés.",
  editPage: "Editar esta página en GitHub",
  sourceLabel: "Código",
  previewLabel: "Vista previa",
  themeLight: "Claro",
  themeDark: "Oscuro",
  themePage: "Tema de la página",
  previewTheme: "Tema de la vista previa",
  apiProp: "Prop",
  apiType: "Tipo",
  apiDefault: "Predeterminado",
  apiDescription: "Descripción",
  apiRequired: "obligatoria",
  apiInherits: "También acepta las props de",
  apiDefinition: "Definición",
  apiClient: 'Componente de cliente ("use client")',
  apiServer: 'Compatible con servidor (sin "use client")',
  apiUntranslated: "Descripción aún sin traducir; se muestra el texto en inglés del código fuente.",
  apiExports: "Exportaciones",
  apiKind: "Tipo de export",
  copySource: "Copiar código",
  notFoundTitle: "Página no encontrada",
  notFoundBody:
    "La página que buscas no existe o se ha movido. Prueba con el inicio de la documentación o con la búsqueda.",
  backHome: "Volver al inicio",
  openDocs: "Abrir la documentación",
  languageChooser: "Elige un idioma",
};

const dictionaries: Record<Locale, Dictionary> = { en, es };

export function dictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Exposed for the translation-parity check. */
export const allDictionaries = dictionaries;
