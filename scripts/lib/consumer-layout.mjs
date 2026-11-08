// @neshel-ui/layout in the external consumer apps (feature 003 US5, research R16).
// The Tailwind and plain variants install the packed layout tarball, render LayoutCases (markup
// equivalent to the browser cases with the same ids), server-render with a Vite SSR build in Node
// from the tarball, and hydrate in the browser. Pure strings and checks, except `prerenderLayout`.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stylesheetClasses } from "./layout-css.mjs";

export const LAYOUT = "@neshel-ui/layout";

/** Browser case ids rendered by every layout consumer (see layout-browser.mjs). */
export const CONSUMER_CASE_IDS = [
  "stack-basic",
  "inline-wrap",
  "grid-responsive",
  "center",
  "container",
  "separator-stack",
  "separator-inline-dark",
  "separator-aschild-list",
];

const items = (n, size = [40, 20]) =>
  Array.from(
    { length: n },
    (_, i) =>
      `<div key={${i}} data-item={${i}} style={{ width: "${size[0]}px", height: "${size[1]}px" }} />`,
  ).join("");

/** `src/layout-cases.tsx`; `tailwind` adds the utility-override case (layer contract, R3). */
export function layoutCasesTsx({ tailwind }) {
  const override = tailwind
    ? `
      <div data-case="tailwind-override" style={{ width: "300px" }}>
        <Stack className="flex-row" space="2">${items(2)}</Stack>
      </div>`
    : "";
  return `import { Box, Center, Container, Grid, Inline, Stack } from "${LAYOUT}";

export function LayoutCases() {
  return (
    <Box as="section" aria-label="Layout cases">
      <div data-case="stack-basic" style={{ width: "200px" }}>
        <Stack space="4">${items(3)}</Stack>
      </div>
      <div data-case="inline-wrap" style={{ width: "120px" }}>
        <Inline spaceX="4" spaceY="2" wrap>${items(3)}</Inline>
      </div>
      <div data-case="grid-responsive" style={{ width: "320px" }}>
        <Grid columns={{ base: 1, md: 2, lg: 4 }} space={{ base: "2", md: "4" }}>${items(4)}</Grid>
      </div>
      <div data-case="center" style={{ width: "200px", height: "100px", display: "flex" }}>
        <Center style={{ flex: "1" }}>${items(1, [20, 20])}</Center>
      </div>
      <div data-case="container">
        <Container size="lg" gutter="4">${items(1)}</Container>
      </div>
      <div data-case="separator-stack" style={{ width: "200px" }}>
        <Stack separator space="4">${items(3)}</Stack>
      </div>
      <div data-case="separator-inline-dark" data-neshel-theme="dark" style={{ width: "300px" }}>
        <Inline separator space="2">${items(3)}</Inline>
      </div>
      <div data-case="separator-aschild-list" style={{ width: "200px" }}>
        <Stack asChild separator space="2">
          <ul>
            <li data-item={0}>a</li>
            <li data-item={1}>b</li>
          </ul>
        </Stack>
      </div>${override}
    </Box>
  );
}
`;
}

/** Type contract seen by a consumer: the packed declarations reject `space` + `spaceX`. */
export const typeContractTsx = `import { Inline, Stack } from "${LAYOUT}";

export const valid = <Inline spaceX="4" spaceY="2" separator={<span aria-hidden="true">|</span>} />;
// @ts-expect-error "space" excludes "spaceX" in the published declarations
export const invalid = <Stack space="4" spaceX="2" />;
`;

/** Server entry built with `vite build --ssr`; @neshel-ui/layout stays external (Node resolves it). */
export const entryServerTsx = `import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { App } from "./App";

export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
`;

/** Runs in the consumer after both builds: prerenders dist/index.html, checks Node resolution. */
export const prerenderMjs = `import { readFileSync, writeFileSync } from "node:fs";
const result = {};
const { render } = await import("./dist-server/entry-server.js");
const html = render();
const page = readFileSync("dist/index.html", "utf8");
if (!page.includes('<div id="root"></div>')) throw new Error("dist/index.html has no empty #root");
writeFileSync("dist/index.html", page.replace('<div id="root"></div>', '<div id="root">' + html + "</div>"));
result.ssrBytes = html.length;
result.hasCases = html.includes('data-case="stack-basic"');
result.windowDefined = typeof window !== "undefined";
await import("${LAYOUT}");
result.stylesheet = import.meta.resolve("${LAYOUT}/styles.css");
try {
  await import("${LAYOUT}/dist/index.js");
  result.deepImport = "resolved";
} catch (error) {
  result.deepImport = error.code;
}
console.log(JSON.stringify(result));
`;

/**
 * Built consumer CSS keeps every layout selector (C5) inside the components.neshel layer, and no
 * Tailwind source scanning of Neshel files was needed.
 */
export function checkLayoutConsumerCss(outputCss, packageCss) {
  const errors = [];
  const output = new Set(stylesheetClasses(outputCss));
  const missing = stylesheetClasses(packageCss).filter((name) => !output.has(name));
  if (missing.length) {
    errors.push(
      `built CSS lacks ${missing.length} layout selector(s) from ${LAYOUT}/styles.css, e.g. ${missing.slice(0, 5).join(", ")}`,
    );
  }
  if (
    !/@layer\s+components\.neshel\b|@layer\s+components\s*\{\s*@layer\s+neshel\b/.test(outputCss)
  ) {
    errors.push("built CSS lost the components.neshel cascade layer");
  }
  if (/@source\b/.test(outputCss)) errors.push("built CSS contains an @source directive");
  return errors;
}

/** Packages that must never be installed by a layout consumer (dependency leaks, R2). */
export const FORBIDDEN_INSTALLS = ["tailwind-merge", "@neshel-ui+core", "@neshel-ui+components"];

/** Names in node_modules/.pnpm that indicate a leaked dependency. */
export function leakedPackages(pnpmStoreEntries) {
  return pnpmStoreEntries.filter((entry) =>
    FORBIDDEN_INSTALLS.some((name) => entry === name || entry.startsWith(`${name}@`)),
  );
}

/** Post-build step for layout variants: SSR build, prerender, Node resolution and leak checks. */
export function prerenderLayout({ appDir, node, step }) {
  const errors = [];
  const vite = join(appDir, "node_modules", "vite", "bin", "vite.js");
  const ssr = step("vite build --ssr (server entry)", () =>
    node([vite, "build", "--ssr", "src/entry-server.tsx", "--outDir", "dist-server"], appDir),
  );
  if (ssr.status !== 0) return [`SSR build failed:\n${ssr.stdout}${ssr.stderr}`];
  const run = step("prerender with react-dom/server from the tarball", () =>
    node(["prerender.mjs"], appDir),
  );
  let result;
  try {
    result = JSON.parse(run.stdout.trim().split("\n").at(-1));
  } catch {
    return [`prerender failed:\n${run.stdout}${run.stderr}`];
  }
  if (!result.hasCases || result.ssrBytes < 500)
    errors.push("server render did not include the layout cases");
  if (result.windowDefined)
    errors.push("prerender ran with a window global (not a real SSR check)");
  if (!String(result.stylesheet).includes("node_modules")) {
    errors.push(`${LAYOUT}/styles.css resolved outside node_modules: ${result.stylesheet}`);
  }
  if (result.deepImport !== "ERR_PACKAGE_PATH_NOT_EXPORTED") {
    errors.push(`${LAYOUT}/dist/index.js was not blocked by "exports" (got ${result.deepImport})`);
  }
  const store = join(appDir, "node_modules", ".pnpm");
  const leaked = existsSync(store) ? leakedPackages(readdirSync(store)) : [];
  if (leaked.length) errors.push(`dependency leak: ${leaked.join(", ")} installed`);
  const html = readFileSync(join(appDir, "dist", "index.html"), "utf8");
  if (!html.includes('data-case="separator-stack"'))
    errors.push("dist/index.html was not prerendered");
  console.info(`  · SSR: ${result.ssrBytes} bytes of markup prerendered into dist/index.html`);
  return errors;
}
