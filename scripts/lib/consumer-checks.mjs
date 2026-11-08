// Pure assertions for the external consumer smoke test (research R14). No I/O.
// Expectations are derived from the stylesheet shipped in the tarball, so the test follows
// the package contract instead of hardcoding Phase 001 token values.

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const unquote = (text) => text.replace(/["']/g, "");

/** Names of `--neshel-*` custom properties declared (not merely referenced) in a stylesheet. */
export function declaredTokens(css) {
  return [...new Set([...css.matchAll(/(--neshel-[\w-]+)\s*:/g)].map((match) => match[1]))].sort();
}

/** Values used in `[data-neshel-theme=...]` attribute selectors, quotes removed. */
export function themeSelectors(css) {
  return [
    ...new Set(
      [...css.matchAll(/\[data-neshel-theme\s*=\s*([^\]]+)\]/g)].map((m) => unquote(m[1]).trim()),
    ),
  ].sort();
}

/**
 * Check the consumer's built CSS against the package stylesheet.
 * @param {string} outputCss built CSS emitted by the consumer's Vite build
 * @param {string} packageCss `styles.css` read from the installed tarball
 * @param {{ neshelUtilities: Array<{ className: string, variable: string }>, coreUtilities: string[] }} expected
 */
export function checkConsumerCss(outputCss, packageCss, { neshelUtilities, coreUtilities }) {
  const errors = [];
  const tokens = declaredTokens(packageCss);
  if (tokens.length === 0) errors.push("the package stylesheet declares no --neshel-* tokens");
  for (const token of tokens) {
    if (!new RegExp(`${escapeRegExp(token)}\\s*:`).test(outputCss)) {
      errors.push(`built CSS is missing the ${token} declaration from @neshel-ui/config`);
    }
  }
  const outputSelectors = new Set(themeSelectors(outputCss));
  for (const theme of themeSelectors(packageCss)) {
    if (!outputSelectors.has(theme)) {
      errors.push(`built CSS is missing the [data-neshel-theme=${theme}] theme selector`);
    }
  }
  for (const { className, variable } of neshelUtilities) {
    const rule = new RegExp(
      `\\.${escapeRegExp(className)}\\{[^}]*var\\(${escapeRegExp(variable)}\\)`,
    );
    if (!rule.test(outputCss)) {
      errors.push(`Tailwind did not generate .${className} referencing var(${variable})`);
    }
  }
  for (const className of coreUtilities) {
    if (!new RegExp(`\\.${escapeRegExp(className)}\\{`).test(outputCss)) {
      errors.push(`Tailwind did not generate the core utility .${className}`);
    }
  }
  if (/@theme\b/.test(outputCss)) errors.push("built CSS still contains an unprocessed @theme");
  if (/@import\s+["']?@neshel-ui/.test(outputCss)) {
    errors.push("built CSS still contains an unresolved @import of @neshel-ui");
  }
  return errors;
}

/** Cascade layer names in order of first appearance (statements and blocks, nested names joined). */
export function layerOrder(css) {
  const order = [];
  for (const match of css.matchAll(/@layer\s+([^{;]+)[{;]/g)) {
    for (const name of match[1].split(",").map((part) => part.trim())) {
      if (name && !order.includes(name)) order.push(name);
    }
  }
  return order;
}

/**
 * ADR 0006 relies on `neshel.defaults` being ordered before `neshel.config`. Bundlers may rewrite
 * the statement (Lightning CSS turns `@layer a, b; @layer a {…}` into `@layer a {…} @layer b;`),
 * so the check is semantic: both layers are declared and defaults appears first.
 */
export function checkLayerStatement(outputCss) {
  const order = layerOrder(outputCss);
  const defaults = order.indexOf("neshel.defaults");
  const config = order.indexOf("neshel.config");
  if (defaults === -1 || config === -1) {
    return ["built CSS does not declare both neshel.defaults and neshel.config layers"];
  }
  if (defaults > config) return ["built CSS orders neshel.config before neshel.defaults"];
  return [];
}

/**
 * Plain-CSS consumer (no Tailwind): every token and theme selector of tokens.css is present,
 * the layer statement survived, and no Tailwind directive leaked into the output.
 */
export function checkPlainCss(outputCss, packageCss) {
  const errors = [];
  for (const token of declaredTokens(packageCss)) {
    if (!new RegExp(`${escapeRegExp(token)}s*:`).test(outputCss)) {
      errors.push(`built CSS is missing the ${token} declaration from tokens.css`);
    }
  }
  const outputSelectors = new Set(themeSelectors(outputCss));
  for (const theme of themeSelectors(packageCss)) {
    if (!outputSelectors.has(theme)) {
      errors.push(`built CSS is missing the [data-neshel-theme=${theme}] theme selector`);
    }
  }
  if (/@(?:theme|tailwind|apply|source|utility|custom-variant)\b/.test(outputCss)) {
    errors.push("plain-CSS output contains a Tailwind directive");
  }
  if (!/prefers-color-scheme:\s*dark/.test(outputCss)) {
    errors.push("built CSS lost the prefers-color-scheme media block for system mode");
  }
  errors.push(...checkLayerStatement(outputCss));
  return errors;
}
