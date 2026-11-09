// pnpm check:next [--keep]
// Feature 006 (R8, research R10): an isolated Next.js App Router consumer built from PACKED
// packages. Copies starters/next-app outside the workspace (path with spaces and Unicode), overlays
// tests/fixtures/next-consumer (a Server Component verification page with a client island), installs
// the tarballs, runs `neshel generate` + `next build`, starts `next start` and verifies in Chrome:
// server-rendered markup, preserved "use client" directives, hydration without errors, client
// interaction, a portalled dialog keeping a nested named theme, custom breakpoints (phone … wide),
// CSS import order and Capsize trimming. Without Chrome: fails when CI=true, otherwise SKIPPED.
import { spawn } from "node:child_process";
import { cpSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { findBrowser, launchBrowser } from "./lib/cdp.mjs";
import { driver } from "./lib/components-browser.mjs";
import { pnpm } from "./lib/pnpm.mjs";
import { createTempDir } from "./lib/temp.mjs";
import { repoRoot } from "./lib/workspace.mjs";
import { packPublicPackages, useTarballs } from "./pack-local.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForHttp(url, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  throw new Error(`server did not answer ${url} within ${timeout} ms`);
}

async function main() {
  const keep = process.argv.includes("--keep");
  const executable = findBrowser();
  if (!executable) {
    if (process.env.CI === "true")
      throw new Error("no Chrome/Chromium/Edge found on this CI runner");
    console.info("check:next SKIPPED (no Chrome, Chromium or Edge found; set NESHEL_CHROME)");
    return;
  }
  const temp = createTempDir("neshel next ñ-", { keep });
  const appDir = join(temp.dir, "next app ñ");
  const results = [];
  const record = (name, ok, detail = "") => {
    results.push({ name, ok, detail });
    console.info(`  ${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  };
  let server;
  let browser;
  try {
    console.info("Packing the public packages…");
    const tarballDir = join(temp.dir, "tarballs");
    packPublicPackages(tarballDir);
    cpSync(join(repoRoot, "starters", "next-app"), appDir, {
      recursive: true,
      filter: (src) => !/[\\/](node_modules|\.next)([\\/]|$)/.test(src),
    });
    cpSync(join(repoRoot, "tests", "fixtures", "next-consumer"), appDir, { recursive: true });
    useTarballs(appDir, tarballDir);
    console.info(`App: ${appDir}`);
    console.info("pnpm install…");
    pnpm(["install", "--no-frozen-lockfile"], appDir, { isolated: true });
    console.info("pnpm run build (neshel generate && next build)…");
    const buildLog = pnpm(["run", "build"], appDir, { isolated: true });
    record(
      "next build (App Router, production)",
      /Compiled successfully|Generating static pages|Route \(app\)/.test(buildLog),
    );

    // "use client" survives packing and installation.
    const installed = join(appDir, "node_modules", "@neshel-ui", "components", "dist");
    const firstLine = (file) => readFileSync(join(installed, file), "utf8").split("\n")[0].trim();
    record(
      '"use client" preserved in packed interactive modules',
      ["dialog.js", "select.js", "app-shell.js"].every((f) =>
        /^["']use client["'];?$/.test(firstLine(f)),
      ) && !/use client/.test(firstLine("primitives.js")),
    );

    const port = await freePort();
    const nextBin = join(appDir, "node_modules", "next", "dist", "bin", "next");
    server = spawn(process.execPath, [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"], {
      cwd: appDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "production" },
    });
    let serverLog = "";
    server.stdout.on("data", (chunk) => {
      serverLog += chunk;
    });
    server.stderr.on("data", (chunk) => {
      serverLog += chunk;
    });
    const origin = `http://127.0.0.1:${port}`;
    const response = await waitForHttp(`${origin}/verify`);
    const html = await response.text();
    record(
      "server rendering: heading and paragraph in the HTML",
      html.includes("Server-rendered heading") &&
        html.includes("Rendered by a React Server Component."),
    );
    record(
      "server rendering: custom breakpoint classes emitted",
      /neshel-phoneXL-cols-2/.test(html) && /neshel-wide-cols-4/.test(html),
      "classes for phoneXL/wide",
    );
    record(
      "server rendering: theme attribute from the layout",
      /<html[^>]+data-neshel-theme="system"/.test(html),
    );

    browser = await launchBrowser(executable);
    console.info(`Browser: ${browser.version}`);
    const page = await browser.newPage();
    const d = driver(page);
    await page.setViewport(1280, 900);
    await page.goto(`${origin}/verify`);
    await d.waitFor(`document.querySelector("#fruit")`, "hydrated page", 15000);
    await d.settle(800);
    const hydrationErrors = page.errors.filter((e) =>
      /hydrat|did not match|Minified React error/i.test(e),
    );
    record(
      "hydration without errors or mismatches",
      hydrationErrors.length === 0,
      hydrationErrors.join(" | ").slice(0, 300),
    );

    // CSS order: package layer after Tailwind preflight keeps Container's automatic margins.
    const margins = await d.evaluate(
      `(() => { const s = getComputedStyle(document.querySelector("#container")); return [s.marginLeft, s.marginRight]; })()`,
    );
    record(
      "CSS order: Container keeps automatic inline margins",
      margins[0] === margins[1] && Number.parseFloat(margins[0]) > 0,
      margins.join(" / "),
    );

    // Capsize trimming on server-rendered typography.
    const trim = await d.evaluate(
      `getComputedStyle(document.querySelector("#server-heading"), "::before").marginBlockEnd || getComputedStyle(document.querySelector("#server-heading"), "::before").marginBottom`,
    );
    record(
      "typography: Capsize trim pseudo-element present",
      Number.parseFloat(trim) < 0,
      `::before margin ${trim}`,
    );

    // Custom breakpoints (replace mode): phone 30rem, phoneXL 40rem, laptop 64rem, wide 96rem.
    const columnsAt = async (width) => {
      await d.viewport(width);
      return d.evaluate(
        `getComputedStyle(document.querySelector("#bp-grid")).gridTemplateColumns.split(" ").length`,
      );
    };
    const sweep = {
      500: await columnsAt(500),
      700: await columnsAt(700),
      1100: await columnsAt(1100),
      1600: await columnsAt(1600),
    };
    record(
      "custom breakpoints: 1 → 2 → 3 → 4 columns at phoneXL/laptop/wide",
      sweep[500] === 1 && sweep[700] === 2 && sweep[1100] === 3 && sweep[1600] === 4,
      JSON.stringify(sweep),
    );
    await d.viewport(1280);

    // Client interaction: controlled Select.
    await d.click("#fruit");
    await d.clickOption("Pear");
    await d.waitFor(
      `document.querySelector("#fruit-value").textContent === "pear"`,
      "select value",
    );
    record(
      "client interaction: controlled Select updates state",
      (await d.text("#fruit-value")) === "pear",
    );

    // Portalled dialog keeps the nested named theme.
    await d.press("Escape");
    await d.click("#open-dialog");
    await d.waitFor(`document.querySelector('[role="dialog"]')`, "dialog open");
    await d.settle(300);
    const portal = await d.evaluate(
      `(() => { const dialog = document.querySelector('[role="dialog"]'); const wrapper = dialog.closest("[data-neshel-portal]"); return { theme: wrapper?.getAttribute("data-neshel-theme") ?? null, inScope: !!dialog.closest("#harbor-scope"), bg: getComputedStyle(dialog).getPropertyValue("--neshel-background").trim() }; })()`,
    );
    record(
      "portal: dialog renders outside the scope with data-neshel-theme=harbor",
      portal.theme === "harbor" && !portal.inScope,
      JSON.stringify(portal),
    );
    record(
      "portal: dialog tokens come from the harbor theme",
      portal.bg.toLowerCase() === "#06202b",
      portal.bg,
    );
    await d.press("Escape");
    await d.waitFor(`!document.querySelector('[role="dialog"]')`, "dialog closed");
    record(
      "dialog closes on Escape and returns focus",
      (await d.active()) === "open-dialog",
      `focus: ${await d.active()}`,
    );

    // Starter home page also renders and hydrates.
    await page.goto(`${origin}/`);
    await d.waitFor(`document.querySelector("#theme")`, "home hydrated", 15000);
    record(
      "starter home page renders and hydrates",
      page.errors.filter((e) => /hydrat/i.test(e)).length === 0,
    );
    if (results.some((r) => !r.ok)) console.info(`\nserver log (tail):\n${serverLog.slice(-2000)}`);
  } finally {
    if (browser) await browser.close();
    if (server) {
      server.kill();
      await sleep(500);
    }
    if (keep) console.info(`kept ${temp.dir}`);
    else temp.dispose();
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    for (const f of failed) {
      if (process.env.GITHUB_ACTIONS === "true")
        console.info(`::error title=check:next::${f.name} ${f.detail}`);
    }
    console.error(`check:next: ${failed.length} of ${results.length} checks failed`);
    process.exitCode = 1;
  } else console.info(`check:next: ${results.length} checks passed`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
