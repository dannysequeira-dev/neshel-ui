// Pure helpers relating layout class names to stylesheets (contracts/layout-css.md C1, C2, C5).
// Used by the layout package tests and by the external consumer checks. No I/O.

const unescapeSelector = (selector) => selector.replace(/\\(.)/g, "$1");

/** Every `.neshel-*` class that appears in a selector, unescaped, in order of first appearance. */
export function stylesheetClasses(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const found = new Set();
  for (const match of withoutComments.matchAll(/\.(neshel-(?:[\w-]|\\.)+)/g)) {
    found.add(unescapeSelector(match[1]));
  }
  return [...found];
}

/** Classes from a `class` attribute value (or array of them) that start with `neshel-`. */
export function neshelClasses(classValues) {
  const values = Array.isArray(classValues) ? classValues : [classValues];
  return [
    ...new Set(
      values
        .flatMap((value) => String(value ?? "").split(/\s+/))
        .filter((name) => name.startsWith("neshel-")),
    ),
  ];
}

/** Classes used at runtime that have no rule in the stylesheet (C1/C5). */
export function missingFromStylesheet(usedClasses, css) {
  const defined = new Set(stylesheetClasses(css));
  return [...new Set(usedClasses)].filter((name) => !defined.has(name)).sort();
}

/** Stylesheet classes that no runtime output reached (C2). */
export function unreachableClasses(usedClasses, css) {
  const used = new Set(usedClasses);
  return stylesheetClasses(css)
    .filter((name) => !used.has(name))
    .sort();
}

/**
 * Hygiene of a shipped layout stylesheet (FR-041, ADR 0008 §6): layered, class selectors only,
 * no Tailwind directives, resets, fonts, urls or colour literals.
 */
export function checkLayoutStylesheet(css) {
  const errors = [];
  const body = css.replace(/\/\*[\s\S]*?\*\//g, "");
  if (!/@layer\s+components\.neshel\s*\{/.test(body)) {
    errors.push("stylesheet is not wrapped in @layer components.neshel");
  }
  for (const directive of ["apply", "tailwind", "source", "theme", "utility", "custom-variant"]) {
    if (new RegExp(`@${directive}\\b`).test(body)) errors.push(`stylesheet contains @${directive}`);
  }
  if (/@font-face|url\(/.test(body)) errors.push("stylesheet contains @font-face or url()");
  if (/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/i.test(body)) {
    errors.push("stylesheet contains a colour literal");
  }
  for (const match of body.matchAll(/(?:^|[;{}])\s*([^\s@{};][^{};]*)\{/g)) {
    const selector = match[1].trim();
    if (!/^\.neshel-(?:[\w-]|\\.)+$/.test(selector)) {
      errors.push(`selector "${selector}" is not a single .neshel-* class`);
    }
  }
  return errors;
}
