// pnpm bench:animations:advanced [--dist <dir>] [--engine chromium|firefox|webkit]... [--frames <n>]
//   [--cpu-throttle <rate>] (Chromium only) [--report <file>]
// Phase 016 performance matrix (specs/016-advanced-3d-distortion/contracts/performance-matrix-016.md): runs the
// in-page `benchAdvanced()` of the built lab — creation → first frame, sustained rAF intervals (mean/p95), long
// tasks, GPU resources (contexts, estimated texture/drawing-buffer bytes), off-screen draws, context loss → restore
// and mount/unmount churn. Observations, NOT a gate: headless engines rasterise WebGL in software (SwiftShader) or
// behind masked renderers; nothing here describes a physical GPU. Requires `pnpm build:playground`.
import { createReadStream, existsSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { repoRoot } from "./lib/workspace.mjs";

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
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
    throw new Error(`${dist}/animations.html not found; run pnpm build:playground first`);
  const engines = argValues("--engine");
  const frames = Number(argValues("--frames")[0] ?? 120);
  const throttle = Number(argValues("--cpu-throttle")[0] ?? 0);
  const playwright = await import("playwright");
  const server = await serve(dist);
  const url = `http://127.0.0.1:${server.address().port}/animations.html`;
  const report = {};
  try {
    for (const engine of engines.length ? engines : ["chromium", "firefox", "webkit"]) {
      const browser = await playwright[engine].launch();
      try {
        const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
        await page.emulateMedia({ reducedMotion: "no-preference" });
        if (throttle && engine === "chromium") {
          const cdp = await page.context().newCDPSession(page);
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
        }
        await page.goto(url);
        await page.waitForFunction(() => window.__neshelLab?.advanced?.benchAdvanced !== undefined);
        const key = `${engine} ${browser.version()}${throttle && engine === "chromium" ? ` (${throttle}x CPU)` : ""}`;
        report[key] = await page.evaluate(
          (n) => window.__neshelLab.advanced.benchAdvanced({ frames: n }),
          frames,
        );
        console.info(key);
        for (const [name, value] of Object.entries(report[key]))
          console.info(`  ${name}: ${JSON.stringify(value)}`);
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
  console.error(`bench:animations:advanced could not complete: ${error.message}`);
  process.exitCode = 1;
});
