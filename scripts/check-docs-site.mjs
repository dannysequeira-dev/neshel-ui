// pnpm check:docs-site [--out apps/docs/out]
// Feature 006 (SC-003): browser smoke of the exported documentation site, served over HTTP from the
// static export: home and docs pages in both languages, the language switch keeping the page,
// search (Ctrl+K) returning results, the theme switch driving data-neshel-theme, a live preview,
// an example page, the 404 page, sitemap/robots, metadata, and axe-core without violations on
// representative pages in light and dark. Chrome via the CDP harness (preinstalled on CI runners).
// Without a browser: fails when CI=true, otherwise prints SKIPPED.
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { findBrowser, launchBrowser } from "./lib/cdp.mjs";
import { driver } from "./lib/components-browser.mjs";
import { startStaticServer } from "./lib/static-server.mjs";
import { repoRoot } from "./lib/workspace.mjs";

const require = createRequire(import.meta.url);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const AXE_PAGES = [
  "/en/",
  "/en/docs/",
  "/en/docs/components/select/",
  "/es/docs/guides/theming/",
  "/en/examples/form/",
];

async function main() {
  const outIndex = process.argv.indexOf("--out");
  const out = resolve(
    outIndex === -1 ? join(repoRoot, "apps", "docs", "out") : process.argv[outIndex + 1],
  );
  if (!existsSync(join(out, "index.html")))
    throw new Error(`${out} has no export — run pnpm docs:build`);
  const executable = findBrowser();
  if (!executable) {
    if (process.env.CI === "true")
      throw new Error("no Chrome/Chromium/Edge found on this CI runner");
    console.info("check:docs-site SKIPPED (no Chrome, Chromium or Edge found)");
    return;
  }
  const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
  const server = await startStaticServer(out);
  const browser = await launchBrowser(executable);
  const results = [];
  const record = (name, ok, detail = "") => {
    results.push({ name, ok, detail });
    console.info(`  ${ok ? "✓" : "✗"} ${name}${detail && !ok ? ` — ${detail}` : ""}`);
  };
  const attempt = async (name, body) => {
    try {
      const detail = await body();
      record(
        name,
        detail === true || detail === undefined,
        typeof detail === "string" ? detail : "",
      );
    } catch (error) {
      record(name, false, error.message.split("\n")[0]);
    }
  };
  try {
    const page = await browser.newPage();
    const d = driver(page);
    await page.setViewport(1280, 900);
    const open = async (path) => {
      page.errors.length = 0;
      await page.goto(server.url(path));
      await sleep(400);
    };

    await attempt("root redirects to /en/ (meta refresh) and links both languages", async () => {
      const html = readFileSync(join(out, "index.html"), "utf8");
      return /http-equiv="refresh"[^>]+\/en\//.test(html) && html.includes('href="/es/"')
        ? true
        : "missing refresh or language links";
    });

    await attempt("English home renders with lang=en, logo, tagline and no errors", async () => {
      await open("/en/");
      const state = await d.evaluate(
        `({ lang: document.documentElement.lang, h1: document.querySelector("h1")?.textContent, logo: !!document.querySelector('img[alt^="Neshel-UI"]'), tagline: document.body.textContent.includes("Rooted in faith. Built with hope.") })`,
      );
      if (state.lang !== "en" || !state.logo || !state.tagline) return JSON.stringify(state);
      return page.errors.length ? page.errors.join(" | ") : true;
    });

    await attempt("Spanish docs page renders Spanish content with lang=es", async () => {
      await open("/es/docs/components/dialog/");
      const state = await d.evaluate(
        `({ lang: document.documentElement.lang, h1: document.querySelector("h1")?.textContent, toc: document.body.textContent.includes("En esta página") })`,
      );
      return state.lang === "es" && state.h1 === "Dialog" && state.toc
        ? true
        : JSON.stringify(state);
    });

    await attempt("canonical URL and hreflang alternates are present", async () => {
      await open("/en/docs/components/button/");
      const meta = await d.evaluate(
        `({ canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"), langs: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => l.hreflang).sort() })`,
      );
      return meta.canonical?.endsWith("/en/docs/components/button/") &&
        JSON.stringify(meta.langs) === JSON.stringify(["en", "es", "x-default"])
        ? true
        : JSON.stringify(meta);
    });

    await attempt("language switch keeps the current page", async () => {
      await open("/en/docs/components/button/");
      // Fumadocs language switch: open the language popover and pick Español.
      const opened = await d.evaluate(
        `(() => { const b = [...document.querySelectorAll("button")].find((x) => /English/.test(x.textContent ?? "")); if (!b) return false; b.click(); return true; })()`,
      );
      if (!opened) return "language switch button not found";
      await sleep(300);
      const picked = await d.evaluate(
        `(() => { const b = [...document.querySelectorAll("button, a")].find((x) => (x.textContent ?? "").trim() === "Español"); if (!b) return false; b.click(); return true; })()`,
      );
      if (!picked) return "Español option not found";
      await d.waitFor(`location.pathname.includes("/es/")`, "navigation to /es/", 8000);
      const path = await d.evaluate("location.pathname");
      return path.endsWith("/es/docs/components/button/") ? true : `landed on ${path}`;
    });

    await attempt(
      "theme switch toggles data-neshel-theme together with the Fumadocs class",
      async () => {
        await open("/en/docs/");
        const read = () =>
          d.evaluate(
            `({ attr: document.documentElement.getAttribute("data-neshel-theme"), dark: document.documentElement.classList.contains("dark") })`,
          );
        const before = await read();
        await d.click('button[aria-label="Toggle Theme"]');
        await sleep(300);
        const after = await read();
        const consistent = (state) =>
          (state.attr === "dark") === state.dark && ["light", "dark"].includes(state.attr);
        return consistent(before) && consistent(after) && before.attr !== after.attr
          ? true
          : JSON.stringify({ before, after });
      },
    );

    await attempt("search (Ctrl+K) returns results in English and Spanish", async () => {
      for (const [path, query, expected] of [
        ["/en/docs/", "Combobox", "/en/docs/components/combobox"],
        ["/es/docs/", "Combobox", "/es/docs/components/combobox"],
      ]) {
        await open(path);
        await d.press("k", 2); // Ctrl
        await d.waitFor(`document.querySelector('[role="dialog"] input')`, "search dialog", 5000);
        await d.type(query);
        await d
          .waitFor(
            `[...document.querySelectorAll('[id^="fd-search-option-"]')].some((o) => o.id === "fd-search-option-${expected}")`,
            `result ${expected}`,
            8000,
          )
          .catch(async () => {
            const ids = await d.evaluate(
              `[...document.querySelectorAll('[id^="fd-search-option-"]')].map((o) => o.id).slice(0, 5)`,
            );
            throw new Error(`no ${expected} in results (${JSON.stringify(ids)})`);
          });
        await d.press("Escape");
      }
    });

    await attempt("live preview runs the real component (dialog opens)", async () => {
      await open("/en/docs/components/dialog/");
      await d.evaluate(
        `[...document.querySelectorAll(".docs-preview-canvas button")].find((b) => b.textContent.trim() === "Edit profile")?.scrollIntoView({ block: "center" })`,
      );
      const box = await d.evaluate(
        `(() => { const b = [...document.querySelectorAll(".docs-preview-canvas button")].find((x) => x.textContent.trim() === "Edit profile"); const r = b?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`,
      );
      if (!box) return "preview trigger not found";
      await d.clickAt(box.x, box.y);
      await d.waitFor(
        `document.querySelector('[role="dialog"].neshel-dialog-content, .neshel-dialog-content[role="dialog"]')`,
        "dialog",
        5000,
      );
      await d.press("Escape");
      return true;
    });

    await attempt("example pages render (dashboard, form, landing) without errors", async () => {
      for (const slug of ["dashboard", "form", "landing"]) {
        await open(`/en/examples/${slug}/`);
        const ok = await d.evaluate(
          `!!document.querySelector("h1") && document.body.textContent.length > 500`,
        );
        if (!ok || page.errors.length) return `${slug}: ${page.errors.join(" | ") || "empty"}`;
      }
      return true;
    });

    await attempt("unknown URLs get the bilingual 404 page with status 404", async () => {
      const response = await fetch(server.url("/en/docs/does-not-exist/"));
      const html = await response.text();
      return response.status === 404 &&
        html.includes("Page not found") &&
        html.includes("Página no encontrada")
        ? true
        : `status ${response.status}`;
    });

    await attempt(
      "sitemap.xml lists both languages; robots.txt disallows preview builds",
      async () => {
        const sitemap = await (await fetch(server.url("/sitemap.xml"))).text();
        const robots = await (await fetch(server.url("/robots.txt"))).text();
        const indexable = Boolean(process.env.NESHEL_DOCS_SITE_URL);
        return sitemap.includes("/en/docs/components/button/") &&
          sitemap.includes("/es/docs/components/button/") &&
          (indexable ? /Allow: \//.test(robots) : /Disallow: \//.test(robots))
          ? true
          : "sitemap or robots unexpected";
      },
    );

    for (const scheme of ["light", "dark"]) {
      await attempt(
        `axe-core WCAG 2.x A/AA: no violations on representative pages (${scheme})`,
        async () => {
          await page.emulateColorScheme(scheme);
          const problems = [];
          for (const path of AXE_PAGES) {
            await open(path);
            await sleep(300);
            await d.evaluate(axeSource);
            const violations = await d.evaluate(
              `axe.run(document, { resultTypes: ["violations"], runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }).then((r) => r.violations.map((v) => v.id + " (" + v.nodes.length + "): " + v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")))`,
            );
            if (violations.length) problems.push(`${path}: ${violations.join("; ")}`);
          }
          return problems.length ? problems.join(" || ") : true;
        },
      );
    }
  } finally {
    await browser.close();
    await server.close();
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    for (const f of failed) {
      if (process.env.GITHUB_ACTIONS === "true")
        console.log(`::error title=check:docs-site::${f.name}: ${f.detail.slice(0, 500)}`);
    }
    console.error(`check:docs-site: ${failed.length} of ${results.length} checks failed`);
    process.exitCode = 1;
  } else console.info(`check:docs-site: ${results.length} checks passed`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
