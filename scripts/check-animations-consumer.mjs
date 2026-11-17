// pnpm check:animations:consumer [--no-build]
// Phase 009 (spec FR-062) and Phase 010 (FR-072: Entrance, Hover and Press families, their stylesheets
// in a plain-CSS app, SSR markup visible without JavaScript, hydration without replay, real input):
// an external application OUTSIDE the workspace consumes the REAL packed
// @neshel-ui/animations tarball (no workspace links to its source): Vite client build, Node SSR
// render (renderToString) from the packed files, hydration in headless Chrome (CDP) without
// recoverable errors, then real pointer input on Tilt3D and an engine conflict on the hydrated page.
// Offline: react/react-dom and @radix-ui/react-slot are linked from the workspace install (as
// check:pack does); Vite comes from the playground's dependencies.
// Without a browser: fails when CI=true, otherwise the browser part prints SKIPPED.
import { mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { findBrowser, launchBrowser } from "./lib/cdp.mjs";
import { packPackage, pnpm } from "./lib/pnpm.mjs";
import { readTarGz } from "./lib/tar.mjs";
import { createTempDir } from "./lib/temp.mjs";
import { repoRoot } from "./lib/workspace.mjs";

const PACKAGE = join(repoRoot, "packages", "animations");

const APP = `import { Tilt3D, Hover, lift, glow as glowRing } from "@neshel-ui/animations/hover";
import { Reveal, fadeUp } from "@neshel-ui/animations/entrance";
import { Press, pressScale, ripple, ToggleMorph, NumberTick } from "@neshel-ui/animations/press";
import { useMotionEffect } from "@neshel-ui/animations";
import { defineEffect } from "@neshel-ui/animations/core";
import { useRef } from "react";

export const glow = defineEffect({
  id: "ambient/glow",
  family: "ambient",
  channels: [{ channel: "filter", mode: "exclusive" }],
  reducedMotion: "static",
  resolve: (options) => ({ amount: options?.amount ?? 1 }),
  setup(context) {
    context.channels.exclusive("filter").set("drop-shadow(0 0 " + context.options.amount + "px gold)");
    return { update() {}, destroy() {} };
  },
});

function Glow() {
  const ref = useRef(null);
  useMotionEffect(ref, glow, { amount: 6 }, { conflicts: "silent" });
  return <p ref={ref} id="glow">Glow</p>;
}

export function App() {
  return (
    <main>
      <Tilt3D id="card" maxTilt={12} style={{ width: 240, height: 160, margin: 40, background: "#ddd" }}>
        <button type="button">Choose</button>
      </Tilt3D>
      <Glow />
      <Reveal id="hero" preset={fadeUp}><h1>Server rendered hero</h1></Reveal>
      <Hover id="lift-card" preset={[lift, glowRing]} style={{ width: 220, height: 120, margin: 40, background: "#eee", borderRadius: 12 }}>
        Lift me
      </Hover>
      <Press id="press-button" preset={[pressScale, ripple]} asChild>
        <button type="button" style={{ width: 160, height: 48, margin: 40 }}>Press me</button>
      </Press>
      <button type="button" role="switch" aria-checked="true" id="switch"><ToggleMorph checked /> Wi-Fi</button>
      <NumberTick id="count" value={1234} />
    </main>
  );
}
`;

const CLIENT = `import { hydrateRoot } from "react-dom/client";
import "@neshel-ui/animations/styles.css";
import { App } from "./App.jsx";
window.__recoverable = [];
hydrateRoot(document.getElementById("root"), <App />, {
  onRecoverableError: (error) => window.__recoverable.push(String(error?.message ?? error)),
});
window.__hydrated = true;
`;

function link(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  symlinkSync(realpathSync(from), to, "junction");
}

async function main() {
  if (!process.argv.includes("--no-build"))
    pnpm(["--filter", "@neshel-ui/animations", "build"], repoRoot);
  const fromPlayground = createRequire(join(repoRoot, "apps", "playground-vite", "package.json"));
  const { build } = await import(pathToFileURL(fromPlayground.resolve("vite")).href);
  const react = (await import(pathToFileURL(fromPlayground.resolve("@vitejs/plugin-react")).href))
    .default;
  const { dir, dispose } = createTempDir("neshel animations consumer ñ-");
  const failures = [];
  const check = (condition, message) => {
    if (!condition) failures.push(message);
    console.info(`${condition ? "ok  " : "FAIL"} ${message}`);
  };
  try {
    const app = join(dir, "consumer app");
    const modules = join(app, "node_modules");
    const tarball = readFileSync(packPackage(PACKAGE, join(dir, "tarball")));
    for (const [path, contents] of readTarGz(tarball)) {
      const file = join(
        modules,
        "@neshel-ui",
        "animations",
        ...path.replace(/^package\//, "").split("/"),
      );
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, contents);
    }
    const workspaceModules = join(PACKAGE, "node_modules");
    link(join(workspaceModules, "react"), join(modules, "react"));
    link(join(workspaceModules, "react-dom"), join(modules, "react-dom"));
    link(
      join(workspaceModules, "@radix-ui", "react-slot"),
      join(modules, "@radix-ui", "react-slot"),
    );
    writeFileSync(
      join(app, "package.json"),
      JSON.stringify({ name: "consumer", private: true, type: "module" }),
    );
    mkdirSync(join(app, "src"));
    writeFileSync(join(app, "src", "App.jsx"), APP);
    writeFileSync(join(app, "src", "client.jsx"), CLIENT);
    writeFileSync(
      join(app, "index.html"),
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>consumer</title></head><body><div id="root"><!--ssr--></div><script type="module" src="/src/client.jsx"></script></body></html>`,
    );

    // 1. Client build from the packed package.
    await build({
      configFile: false,
      logLevel: "silent",
      root: app,
      base: "./",
      plugins: [react()],
    });
    // 2. SSR bundle of the App, rendered in Node from the packed files.
    await build({
      configFile: false,
      logLevel: "silent",
      root: app,
      plugins: [react()],
      ssr: { noExternal: [] },
      build: {
        ssr: "src/App.jsx",
        outDir: "ssr",
        rollupOptions: { output: { format: "es", entryFileNames: "app.mjs" } },
      },
    });
    const { App } = await import(pathToFileURL(join(app, "ssr", "app.mjs")).href);
    const { createElement } = await import(pathToFileURL(join(modules, "react", "index.js")).href);
    const { renderToString } = await import(
      pathToFileURL(join(modules, "react-dom", "server.node.js")).href
    );
    const html = renderToString(createElement(App));
    check(
      /<div[^>]*id="card"[^>]*class="neshel-tilt"|class="neshel-tilt"[^>]*id="card"/.test(html),
      "SSR markup renders Tilt3D with its class from the packed package",
    );
    check(
      !/data-neshel-tilt|style="[^"]*filter/.test(html),
      "SSR markup has no motion state (effects start after hydration)",
    );
    check(
      /<div id="hero" class="neshel-reveal"><h1>Server rendered hero<\/h1><\/div>/.test(html),
      "SSR: <Reveal> content is in the markup with no inline style (visible without JavaScript)",
    );
    check(
      /data-state="on" class="neshel-toggle"/.test(html) && /1,234/.test(html),
      "SSR: ToggleMorph static state and NumberTick formatted value",
    );
    check(!/data-neshel-fx/.test(html), "SSR: no engine tokens before hydration");
    const indexPath = join(app, "dist", "index.html");
    writeFileSync(indexPath, readFileSync(indexPath, "utf8").replace("<!--ssr-->", html));

    // 3. Hydration + real input in Chrome.
    const executable = findBrowser();
    if (!executable) {
      if (process.env.CI === "true")
        throw new Error("no Chrome/Chromium/Edge found on this CI runner");
      console.info("browser part SKIPPED (no Chrome, Chromium or Edge found; set NESHEL_CHROME)");
    } else {
      const browser = await launchBrowser(executable);
      try {
        const page = await browser.newPage();
        await page.send("Emulation.setEmulatedMedia", {
          features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
        });
        await page.goto(pathToFileURL(indexPath).href);
        await page.evaluate("new Promise((r) => setTimeout(r, 300))");
        const state = await page.evaluate(
          `({ hydrated: window.__hydrated === true, recoverable: window.__recoverable, tilt: document.getElementById("card").getAttribute("data-neshel-tilt"), glow: document.getElementById("glow").style.filter })`,
        );
        check(
          state.hydrated && state.recoverable.length === 0,
          `hydration without recoverable errors (${JSON.stringify(state.recoverable)})`,
        );
        check(page.errors.length === 0, `no page errors (${page.errors.join(" | ")})`);
        check(state.tilt === "rest", `Tilt3D attached after hydration (state ${state.tilt})`);
        check(
          state.glow === "drop-shadow(gold 0px 0px 6px)" ||
            state.glow === "drop-shadow(0 0 6px gold)",
          `custom effect from the packed engine applied (${state.glow})`,
        );
        const r = await page.evaluate(
          `(() => { const b = document.getElementById("card").getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; })()`,
        );
        for (const [fx, fy] of [
          [0.5, 0.5],
          [0.8, 0.2],
          [0.98, 0.02],
        ]) {
          await page.send("Input.dispatchMouseEvent", {
            type: "mouseMoved",
            x: r.x + r.w * fx,
            y: r.y + r.h * fy,
          });
        }
        await page.evaluate("new Promise((r) => setTimeout(r, 700))");
        const tilted = await page.evaluate(`document.getElementById("card").style.transform`);
        check(
          /perspective\(1000px\) rotateX\(\d/.test(tilted),
          `real pointer input tilts the hydrated card (${tilted})`,
        );
        await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
        const hydratedHero = await page.evaluate(
          `({ style: document.getElementById("hero").style.cssText, opacity: getComputedStyle(document.getElementById("hero")).opacity })`,
        );
        check(
          hydratedHero.style === "" && hydratedHero.opacity === "1",
          `hydration does not replay the entrance on server markup (${JSON.stringify(hydratedHero)})`,
        );
        const liftBox = await page.evaluate(
          `(() => { const b = document.getElementById("lift-card").getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`,
        );
        await page.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: liftBox.x,
          y: liftBox.y,
        });
        await page.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: liftBox.x + 2,
          y: liftBox.y,
        });
        await page.evaluate("new Promise((r) => setTimeout(r, 700))");
        const lifted = await page.evaluate(
          `(() => { const el = document.getElementById("lift-card"); return { tokens: el.getAttribute("data-neshel-fx"), progress: el.style.getPropertyValue("--neshel-lift-progress"), transform: el.style.transform, shadow: getComputedStyle(el, "::before").boxShadow }; })()`,
        );
        check(
          lifted.progress === "1" && /translate3d\(0px, -4px, 0px\)/.test(lifted.transform),
          `real pointer lifts the hydrated card (${JSON.stringify(lifted)})`,
        );
        check(
          /rgba?\(/.test(lifted.shadow) && lifted.tokens.split(" ").includes("decor"),
          `the packed hover.css renders the decor layer in a plain-CSS app (${lifted.shadow})`,
        );
        await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
        const pressBox = await page.evaluate(
          `(() => { const el = document.getElementById("press-button"); el.scrollIntoView({ block: "center" }); const b = el.getBoundingClientRect(); return { x: b.left + 20, y: b.top + 20 }; })()`,
        );
        await page.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: pressBox.x,
          y: pressBox.y,
        });
        await page.send("Input.dispatchMouseEvent", {
          type: "mousePressed",
          x: pressBox.x,
          y: pressBox.y,
          button: "left",
          clickCount: 1,
        });
        const pressed = await page.evaluate(
          `(() => { const el = document.getElementById("press-button"); const layer = el.querySelector(".neshel-ripple-layer"); return { ripple: !!layer, hidden: layer?.getAttribute("aria-hidden"), events: layer ? getComputedStyle(layer).pointerEvents : null }; })()`,
        );
        await page.send("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x: pressBox.x,
          y: pressBox.y,
          button: "left",
          clickCount: 1,
        });
        check(
          pressed.ripple && pressed.hidden === "true" && pressed.events === "none",
          `real press creates the owned, aria-hidden ripple layer (${JSON.stringify(pressed)})`,
        );
        check(
          page.errors.length === 0,
          `no page errors after interaction (${page.errors.join(" | ")})`,
        );
      } finally {
        await browser.close();
      }
    }
  } finally {
    dispose();
  }
  if (failures.length) {
    console.error(`check:animations:consumer failed: ${failures.length} check(s).`);
    process.exitCode = 1;
  } else {
    console.info(
      "check:animations:consumer passed (packed tarball, Vite build, SSR, hydration, interaction).",
    );
  }
}

main().catch((error) => {
  console.error(`check:animations:consumer could not complete: ${error.message}`);
  process.exitCode = 1;
});
