import catalog from "@/animations/catalog.json";
import type { Locale } from "./i18n";

export type Cost =
  | "attribute"
  | "canvas"
  | "filter"
  | "frame"
  | "layer"
  | "layout"
  | "observer"
  | "paint"
  | "scrollvar"
  | "seek"
  | "size"
  | "split"
  | "text"
  | "textlayout"
  | "vt"
  | "waapi"
  | "webgl";

export type Reduced = "off" | "fade" | "instant" | "static" | "reduced" | "n/a";

export interface CatalogEffect {
  id: string;
  name: Record<Locale, string>;
  entry: string;
  api: string[];
  options?: string;
  css?: string;
  definition?: string;
  cost: Cost;
  reduced: Reduced;
  demo?: "source";
}

export interface CatalogFamily {
  prefix: string;
  slug: string;
  name: Record<Locale, string>;
}

export const families = catalog.families as CatalogFamily[];
export const effects = catalog.effects as CatalogEffect[];

export function findEffect(id: string): CatalogEffect {
  const found = effects.find((effect) => effect.id === id);
  if (!found) throw new Error(`Unknown animation effect "${id}" (animations/catalog.json)`);
  return found;
}

export function familyOf(effect: CatalogEffect): CatalogFamily {
  const prefix = effect.id.replace(/\d+$/, "");
  const found = families.find((family) => family.prefix === prefix);
  if (!found) throw new Error(`Effect ${effect.id} has no family`);
  return found;
}

/** Site path of the section that documents an effect. */
export function effectHref(effect: CatalogEffect, locale: Locale): string {
  return `/${locale}/docs/animations/effects/${familyOf(effect).slug}/#${effect.id.toLowerCase()}`;
}

/** What an effect writes while it runs — the practical meaning of its driver. */
export const costText: Record<Cost, Record<Locale, string>> = {
  frame: {
    en: "Transform and opacity, one write per frame through the shared scheduler; no layout work per frame.",
    es: "Transform y opacity, una escritura por fotograma con el planificador compartido; sin trabajo de layout por fotograma.",
  },
  paint: {
    en: "Repaints the element (colour, gradient, clip, mask, blur or stroke) while it runs; keep the area small.",
    es: "Repinta el elemento (color, degradado, recorte, máscara, desenfoque o trazo) mientras se ejecuta; conviene un área pequeña.",
  },
  filter: {
    en: "Uses a filter over the whole area, which is expensive on large surfaces; use it on small or static regions.",
    es: "Usa un filtro sobre toda el área, costoso en superficies grandes; úsalo en zonas pequeñas o estáticas.",
  },
  layer: {
    en: "The package stylesheet renders it on layers owned by the package; your element gets no transition or animation.",
    es: "La hoja de estilos del paquete lo dibuja en capas propias; tu elemento no recibe transiciones ni animaciones.",
  },
  layout: {
    en: "Reads layout boxes once before and once after the change, then animates transforms (FLIP).",
    es: "Lee las cajas de layout una vez antes y otra después del cambio; luego anima transform (FLIP).",
  },
  size: {
    en: "Animates a height, so the content below reflows while it runs; avoid it above very long pages.",
    es: "Anima una altura, así que el contenido posterior se recoloca mientras dura; evítalo sobre páginas muy largas.",
  },
  canvas: {
    en: "Draws on a decorative Canvas 2D surface with a capped pixel ratio; the surface is released when it is not needed.",
    es: "Dibuja en una superficie Canvas 2D decorativa con densidad de píxeles limitada; se libera cuando no hace falta.",
  },
  webgl: {
    en: "Uses a WebGL2 context from a page budget and draws only when something changes; the original content is the fallback.",
    es: "Usa un contexto WebGL2 de un presupuesto por página y dibuja solo cuando algo cambia; el contenido original es la alternativa.",
  },
  vt: {
    en: "The browser animates snapshots of the old and new content (View Transitions); without support the update just runs.",
    es: "El navegador anima capturas del contenido anterior y del nuevo (View Transitions); sin soporte, la actualización simplemente ocurre.",
  },
  waapi: {
    en: "Web Animations on a layer owned by the package; nothing runs per frame in JavaScript.",
    es: "Web Animations sobre una capa propia del paquete; nada se ejecuta por fotograma en JavaScript.",
  },
  observer: {
    en: "Observers only: no work per frame. React state changes only on transitions.",
    es: "Solo observadores: sin trabajo por fotograma. El estado de React cambia únicamente en las transiciones.",
  },
  scrollvar: {
    en: "Writes one custom property, natively with scroll timelines where supported and from cached geometry elsewhere.",
    es: "Escribe una propiedad personalizada: con scroll timelines nativas donde existen y con geometría en caché en el resto.",
  },
  attribute: {
    en: "Writes one SVG path attribute per frame; the cost grows with the number of path segments.",
    es: "Escribe un atributo de ruta SVG por fotograma; el coste crece con el número de segmentos.",
  },
  split: {
    en: "One write per frame on the visual root and CSS per piece; the cost grows with the number of pieces.",
    es: "Una escritura por fotograma en la raíz visual y CSS por pieza; el coste crece con el número de piezas.",
  },
  text: {
    en: "Updates the text of one decorative node per frame; the accessible value is not updated per frame.",
    es: "Actualiza el texto de un nodo decorativo por fotograma; el valor accesible no cambia en cada fotograma.",
  },
  textlayout: {
    en: "Changing font axes lays the text out again on each frame; use it on short texts.",
    es: "Cambiar los ejes de la fuente recalcula el texto en cada fotograma; úsalo en textos cortos.",
  },
  seek: {
    en: "At most one video seek in flight; the newest target wins. Quality depends on the keyframes of the file.",
    es: "Como máximo una búsqueda de vídeo en curso; gana el destino más reciente. La calidad depende de los fotogramas clave.",
  },
};

/** Reduced-motion behaviour of the catalogue contract. */
export const reducedText: Record<Reduced, Record<Locale, string>> = {
  off: { en: "no motion at all", es: "sin movimiento" },
  fade: { en: "opacity only, no travel", es: "solo opacidad, sin desplazamiento" },
  instant: { en: "the end state appears at once", es: "el estado final aparece de inmediato" },
  static: {
    en: "the decoration or content stays still",
    es: "la decoración o el contenido permanece quieto",
  },
  reduced: {
    en: "a smaller signal remains because it conveys state",
    es: "queda una señal menor porque comunica un estado",
  },
  "n/a": {
    en: "nothing moves by itself, so nothing changes",
    es: "nada se mueve por sí solo, así que nada cambia",
  },
};
