// Precedence matrix and cascade cases of specs/002-config-and-tokens/contracts/css.md, as pure
// data and helpers. check-browser.mjs runs them in a real browser; tests verify completeness.

/** Matrix rows: root attribute, emulated OS preference, nested attribute, expected themes. */
export const MATRIX = [
  { id: 1, root: null, os: "light", nested: null, expectRoot: "light", expectNested: "light" },
  { id: 2, root: null, os: "dark", nested: null, expectRoot: "light", expectNested: "light" },
  { id: 3, root: "light", os: "dark", nested: null, expectRoot: "light", expectNested: "light" },
  { id: 4, root: "dark", os: "light", nested: null, expectRoot: "dark", expectNested: "dark" },
  { id: 5, root: "system", os: "light", nested: null, expectRoot: "light", expectNested: "light" },
  { id: 6, root: "system", os: "dark", nested: null, expectRoot: "dark", expectNested: "dark" },
  { id: 7, root: "dark", os: "light", nested: "light", expectRoot: "dark", expectNested: "light" },
  { id: 8, root: "light", os: "dark", nested: "dark", expectRoot: "light", expectNested: "dark" },
  { id: 9, root: "dark", os: "dark", nested: "system", expectRoot: "dark", expectNested: "dark" },
  {
    id: 10,
    root: "dark",
    os: "light",
    nested: "system",
    expectRoot: "dark",
    expectNested: "light",
  },
  {
    id: "11a",
    root: "dark",
    os: "light",
    nested: "sepia",
    expectRoot: "dark",
    expectNested: "sepia",
  },
  {
    id: "11b",
    root: "dark",
    os: "dark",
    nested: "sepia",
    expectRoot: "dark",
    expectNested: "sepia",
  },
  {
    id: 12,
    root: "sepia",
    os: "dark",
    nested: "light",
    expectRoot: "sepia",
    expectNested: "light",
  },
];

/** Rows applicable to a fixture: named-theme rows need generated CSS with that theme. */
export function rowsFor(themeNames) {
  return MATRIX.filter((row) =>
    [row.expectRoot, row.expectNested].every((t) => themeNames.includes(t)),
  );
}

/** `#abc` / `#aabbcc` → `rgb(r, g, b)` as serialized by getComputedStyle. */
export function hexToRgb(hex) {
  let digits = hex.replace("#", "").toLowerCase();
  if (digits.length === 3) digits = [...digits].map((d) => d + d).join("");
  if (!/^[0-9a-f]{6}$/.test(digits)) throw new Error(`expected an opaque hex colour, got ${hex}`);
  const [r, g, b] = [0, 2, 4].map((index) => Number.parseInt(digits.slice(index, index + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

/** `surfaceForeground` → `--neshel-surface-foreground`. */
export const roleVariable = (role) =>
  `--neshel-${role.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/**
 * Expected computed values per theme: { [theme]: { scheme, colors: { [variable]: "rgb(...)" } } }.
 * @param {{ name: string, colorScheme: string, colors: Record<string,string> }[]} themes
 */
export function expectationsFrom(themes, roles) {
  return Object.fromEntries(
    themes.map((theme) => [
      theme.name,
      {
        scheme: theme.colorScheme,
        colors: Object.fromEntries(
          roles.map((role) => [roleVariable(role), hexToRgb(theme.colors[role])]),
        ),
      },
    ]),
  );
}

/** HTML page that loads stylesheets in the given order as separate <style> elements. */
export function fixturePage(title, stylesheets) {
  const escapeStyle = (css) => css.replaceAll("</style", "<\\/style");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
${stylesheets.map((css, index) => `<style data-order="${index}">\n${escapeStyle(css)}\n</style>`).join("\n")}
</head>
<body></body>
</html>
`;
}

/**
 * Browser-side probe (stringified into Runtime.evaluate). For each case it sets the root
 * attribute, appends a nested element (optionally themed) with a descendant, and reads
 * `color-scheme` plus every colour variable resolved through `color: var(--x)`.
 */
export function probeExpression(cases, variables, extraClass = "") {
  return `(() => {
  const cases = ${JSON.stringify(cases)};
  const variables = ${JSON.stringify(variables)};
  const read = (element) => {
    const probe = document.createElement("span");
    element.appendChild(probe);
    const out = { scheme: getComputedStyle(element).colorScheme, colors: {} };
    for (const variable of variables) {
      probe.style.color = "var(" + variable + ")";
      out.colors[variable] = getComputedStyle(probe).color;
    }
    probe.remove();
    return out;
  };
  const results = [];
  for (const c of cases) {
    const html = document.documentElement;
    if (c.root) html.setAttribute("data-neshel-theme", c.root);
    else html.removeAttribute("data-neshel-theme");
    const nested = document.createElement("div");
    if (c.nested) nested.setAttribute("data-neshel-theme", c.nested);
    if (${JSON.stringify(extraClass)}) nested.className = ${JSON.stringify(extraClass)};
    const child = document.createElement("div");
    nested.appendChild(child);
    document.body.appendChild(nested);
    results.push({ id: c.id, root: read(document.body), rootScheme: getComputedStyle(html).colorScheme, nested: read(nested), child: read(child) });
    nested.remove();
  }
  return results;
})()`;
}

/** Compare probe results with expectations; returns failure strings. */
export function compareResults(fixture, rows, results, expected) {
  const failures = [];
  const byId = new Map(results.map((result) => [result.id, result]));
  for (const row of rows) {
    const result = byId.get(row.id);
    if (!result) {
      failures.push(`${fixture} row ${row.id}: no result`);
      continue;
    }
    const checks = [
      ["root", result.root, row.expectRoot],
      ["nested", result.nested, row.expectNested],
      ["descendant", result.child, row.expectNested],
    ];
    for (const [where, actual, theme] of checks) {
      const want = expected[theme];
      for (const [variable, value] of Object.entries(want.colors)) {
        if (actual.colors[variable] !== value) {
          failures.push(
            `${fixture} row ${row.id} (${row.root ?? "-"}/${row.os}/${row.nested ?? "-"}) ${where} ${variable}: got ${actual.colors[variable]}, expected ${value} (${theme})`,
          );
        }
      }
    }
    if (result.rootScheme !== expected[row.expectRoot].scheme) {
      failures.push(
        `${fixture} row ${row.id} root color-scheme: got ${result.rootScheme}, expected ${expected[row.expectRoot].scheme}`,
      );
    }
    if (row.nested && result.nested.scheme !== expected[row.expectNested].scheme) {
      failures.push(
        `${fixture} row ${row.id} nested color-scheme: got ${result.nested.scheme}, expected ${expected[row.expectNested].scheme}`,
      );
    }
  }
  return failures;
}
