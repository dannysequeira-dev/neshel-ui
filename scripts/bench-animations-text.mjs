// pnpm bench:animations:text [--dist <dir>] [--engine chromium|firefox|webkit]... [--report <file>]
//   [--trials <n>] [--frames <n>] [--counts 20,60,120,250,489] [--headed] [--duration <ms>] [--after-suite]
//   [--cpu-throttle <rate>] (Chromium only, CDP Emulation.setCPUThrottlingRate: emulates a slower device)
// K-5 benchmark (owner review of PR #15; specs/014-typography-svg-paths/evidence.md §9): frame intervals on the
// built animations lab in three states — idle (plain text), static (split, nothing animating) and animated
// (TextReveal running) — per piece count and granularity, repeated. Observations, NOT a gate: headless frame
// intervals depend on the machine, the engine build and the absence of a GPU; compare states on one machine.
// Requires `pnpm build:playground` and Playwright browsers.
import { createReadStream, existsSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { repoRoot } from "./lib/workspace.mjs";

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
};
const argValues = (name) =>
  process.argv.flatMap((arg, index) => (arg === name ? [process.argv[index + 1]] : []));

function serve(dir) {
  const server = createServer((request, response) => {
    const path = normalize(
      join(dir, decodeURIComponent(new URL(request.url, "http://x").pathname)),
    );
    if (!path.startsWith(dir + sep) || !existsSync(path) || !statSync(path).isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    createReadStream(path).pipe(response);
  });
  return new Promise((done) => server.listen(0, "127.0.0.1", () => done(server)));
}

async function main() {
  const dist = resolve(argValues("--dist")[0] ?? join(repoRoot, "apps", "playground-vite", "dist"));
  if (!existsSync(join(dist, "animations.html")))
    throw new Error("animations.html not found; run pnpm build:playground first");
  const engines = argValues("--engine").length
    ? argValues("--engine")
    : ["chromium", "firefox", "webkit"];
  const config = {
    counts: (argValues("--counts")[0] ?? "20,60,120,250,489").split(",").map(Number),
    modes: ["chars", "words"],
    trials: Number(argValues("--trials")[0] ?? 5),
    frames: Number(argValues("--frames")[0] ?? 60),
    duration: Number(argValues("--duration")[0] ?? 6000),
  };
  const headed = process.argv.includes("--headed");
  // Measure on the page left by the in-page text/SVG suite (the context of the earlier §9 numbers).
  const afterSuite = process.argv.includes("--after-suite");
  const throttle = Number(argValues("--cpu-throttle")[0] ?? 0);
  const playwright = await import("playwright");
  const server = await serve(dist);
  const url = `http://127.0.0.1:${server.address().port}/animations.html`;
  const report = { config, headed, afterSuite, throttle, engines: {} };
  try {
    for (const engine of engines) {
      const browser = await playwright[engine].launch({ headless: !headed });
      try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        if (throttle && engine === "chromium") {
          const session = await page.context().newCDPSession(page);
          await session.send("Emulation.setCPUThrottlingRate", { rate: throttle });
        }
        await page.goto(url);
        await page.waitForFunction(() => window.__neshelLab?.textSvg?.benchTextLoad !== undefined);
        if (afterSuite) await page.evaluate(() => window.__neshelLab.textSvg.runTextSvgSuite());
        const rows = await page.evaluate(
          (c) => window.__neshelLab.textSvg.benchTextLoad(c),
          config,
        );
        report.engines[engine] = { version: browser.version(), rows };
        console.info(
          `\n${engine} ${browser.version()} (${headed ? "headed" : "headless"}${afterSuite ? ", after the suite" : ""}${throttle && engine === "chromium" ? `, CPU ×${throttle}` : ""})`,
        );
        console.info(
          "mode   pieces  idle mean/p95  static mean/p95  animated mean/p95  Δmean  >25ms%  start worst static/animated",
        );
        for (const r of rows) {
          console.info(
            `${r.mode.padEnd(6)} ${String(r.pieces).padStart(6)}  ${`${r.idle.mean}/${r.idle.p95}`.padStart(13)}  ${`${r.static.mean}/${r.static.p95}`.padStart(15)}  ${`${r.animated.mean}/${r.animated.p95}`.padStart(17)}  ${String(r.incrementalMean).padStart(5)}  ${String(r.animated.over25).padStart(6)}  ${Math.max(...r.startupWorstStatic)}/${Math.max(...r.startupWorstAnimated)}  p=${r.progressAtEnd.join(",")}`,
          );
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    server.close();
  }
  const out = argValues("--report")[0];
  if (out) writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
