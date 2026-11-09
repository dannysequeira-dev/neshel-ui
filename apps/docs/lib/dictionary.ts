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
  heroLead:
    "A calm, modular React design system: semantic tokens, layout primitives, metrics-aware typography, accessible components and a build-time CLI. Install only what you need.",
  ctaStart: "Get started",
  ctaComponents: "Browse components",
  ctaGithub: "GitHub repository",
  installLabel: "Install (after the 0.1.0 publication)",
  demoTitle: "Real components, any identity",
  demoDescription: "Switch the theme of this card: the components read only semantic tokens.",
  demoTheme: "Theme",
  demoOpen: "Open a dialog",
  demoBody: "Focus moves into the dialog, stays inside, and returns to the button when it closes.",
  demoClose: "Close",
  featureLayoutTitle: "Layout that says what it means",
  featureLayoutText:
    "Stack, Inline, Flex, Grid, Center and Container with token spacing, logical alignment and responsive values — precompiled, server-friendly.",
  featureTypeTitle: "Typography with real metrics",
  featureTypeText:
    "Heading, Paragraph and Caption are trimmed with Capsize, so the gap you set is the gap you see.",
  featureThemeTitle: "Your brand, not ours",
  featureThemeText:
    "Navy and gold are only the defaults. Change colours, fonts, radii and breakpoints in neshel.config.ts; contrast is checked for you.",
  featureA11yTitle: "Accessible by default",
  featureA11yText:
    "Native semantics first, Radix and Base UI for complex patterns, keyboard and focus verified in real browsers.",
  featureCompTitle: "Composition over configuration",
  featureCompText:
    "Flat, composable parts, asChild for your links and router, no provider for theming.",
  statusTitle: "Project status",
  statusText:
    "Version 0.1.0 is a release candidate. Packages are verified from packed tarballs on Linux, Windows and macOS, but they are not on npm yet.",
  statusLink: "Read the release status",
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
  heroLead:
    "Un sistema de diseño para React sereno y modular: tokens semánticos, primitivas de layout, tipografía basada en métricas, componentes accesibles y una CLI de compilación. Instala solo lo que necesites.",
  ctaStart: "Primeros pasos",
  ctaComponents: "Ver componentes",
  ctaGithub: "Repositorio en GitHub",
  installLabel: "Instalación (tras la publicación de 0.1.0)",
  demoTitle: "Componentes reales, cualquier identidad",
  demoDescription: "Cambia el tema de esta tarjeta: los componentes solo leen tokens semánticos.",
  demoTheme: "Tema",
  demoOpen: "Abrir un diálogo",
  demoBody: "El foco entra en el diálogo, se queda dentro y vuelve al botón al cerrarlo.",
  demoClose: "Cerrar",
  featureLayoutTitle: "Un layout que dice lo que significa",
  featureLayoutText:
    "Stack, Inline, Flex, Grid, Center y Container con espaciado por tokens, alineación lógica y valores adaptables; precompilados y aptos para el servidor.",
  featureTypeTitle: "Tipografía con métricas reales",
  featureTypeText:
    "Heading, Paragraph y Caption se recortan con Capsize: el espacio que fijas es el que ves.",
  featureThemeTitle: "Tu marca, no la nuestra",
  featureThemeText:
    "El azul marino y el dorado son solo los valores predeterminados. Cambia colores, fuentes, radios y breakpoints en neshel.config.ts; el contraste se comprueba por ti.",
  featureA11yTitle: "Accesible por defecto",
  featureA11yText:
    "Primero la semántica nativa, Radix y Base UI para los patrones complejos, teclado y foco verificados en navegadores reales.",
  featureCompTitle: "Composición antes que configuración",
  featureCompText:
    "Partes planas y combinables, asChild para tus enlaces y tu router, sin proveedor para los temas.",
  statusTitle: "Estado del proyecto",
  statusText:
    "La versión 0.1.0 es una versión candidata. Los paquetes se verifican desde tarballs empaquetados en Linux, Windows y macOS, pero todavía no están en npm.",
  statusLink: "Leer el estado de la versión",
};

const dictionaries: Record<Locale, Dictionary> = { en, es };

export function dictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Exposed for the translation-parity check. */
export const allDictionaries = dictionaries;
