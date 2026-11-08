// Hygiene of the shipped components stylesheet (feature 005, contracts/components-css.md).
// Pure; used by the components package tests and the pack checks.

/** Split a selector list on commas outside parentheses (e.g. `:not(a, b)`). */
function splitTopLevel(list) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of list) {
    if (char === "(") depth++;
    else if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Top-level selectors of rule blocks (keyframe frames excluded). */
export function componentSelectors(css) {
  const body = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*\s*\}/g, "");
  const selectors = [];
  for (const match of body.matchAll(/(?:^|[;{}])\s*([^\s@{};][^{};]*)\{/g)) {
    selectors.push(...splitTopLevel(match[1]));
  }
  return selectors;
}

export function checkComponentsStylesheet(css) {
  const errors = [];
  const body = css.replace(/\/\*[\s\S]*?\*\//g, "");
  if (!/@layer\s+components\.neshel\s*\{/.test(body)) {
    errors.push("stylesheet is not wrapped in @layer components.neshel");
  }
  for (const directive of [
    "apply",
    "tailwind",
    "source",
    "theme",
    "utility",
    "custom-variant",
    "import",
  ]) {
    if (new RegExp(`@${directive}\\b`).test(body)) errors.push(`stylesheet contains @${directive}`);
  }
  if (/@font-face|url\(/.test(body)) errors.push("stylesheet contains @font-face or url()");
  if (/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/i.test(body)) {
    errors.push("stylesheet contains a colour literal");
  }
  if (/:\s*(?:black|white|red|green|blue|gray|grey)\b/i.test(body)) {
    errors.push("stylesheet contains a named colour");
  }
  for (const selector of componentSelectors(css)) {
    if (selector !== ":root" && !selector.startsWith(".neshel-")) {
      errors.push(`selector "${selector}" does not start with a .neshel-* class`);
    }
  }
  return errors;
}
