// pnpm check:animations:consumer [--no-build]
// Phase 009 (spec FR-062), Phase 011 (FR-044: scroll family), Phase 012 (FR-053: gestures/layout) and Phase 010
// (FR-072: Entrance, Hover and Press families, their stylesheets
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
import { ScrollScene, ScrollLayer, RevealOnScroll, HorizontalScroll, ScrollProgressBar } from "@neshel-ui/animations/scroll";
import { Gesture, drag, Reorder, ReorderItem, ReorderHandle, SwipeDismiss, PinchZoom } from "@neshel-ui/animations/gestures";
import { Collapse, Presence, AnimatedList, TabIndicator, AutoHeight, Masonry } from "@neshel-ui/animations/layout";
import { CursorFollower } from "@neshel-ui/animations/hover";
import { LongPress } from "@neshel-ui/animations/press";
import { useMotionEffect } from "@neshel-ui/animations";
import { defineEffect } from "@neshel-ui/animations/core";
import { useRef, useState } from "react";

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

function Phase012() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(true);
  const [items, setItems] = useState(["Apple", "Banana", "Cherry"]);
  const [held, setHeld] = useState(0);
  return (
    <section id="p012">
      <div id="arena" style={{ position: "relative", width: 320, height: 160, border: "1px solid #ccc" }}>
        <Gesture preset={drag} options={{ constraints: "parent", inertia: false }} id="drag" style={{ width: 48, height: 48, background: "#4f46e5" }} />
      </div>
      <Reorder id="fruits" onReorder={(from, to) => setItems((all) => { const next = [...all]; const [m] = next.splice(from, 1); next.splice(to, 0, m); return next; })}>
        {items.map((item, index) => <ReorderItem key={item} index={index} label={item}><ReorderHandle />{item}</ReorderItem>)}
      </Reorder>
      <button type="button" id="toggle-panel" aria-expanded={open} aria-controls="panel" onClick={() => setOpen(!open)}>Details</button>
      <Collapse open={open} id="panel" driver="js"><p>Panel body</p></Collapse>
      <button type="button" id="toggle-card" onClick={() => setShown(!shown)}>Card</button>
      <Presence>{shown ? <div key="card" id="card-012">Present</div> : null}</Presence>
      <AnimatedList id="list"><li key="a">A</li><li key="b">B</li></AnimatedList>
      <TabIndicator asChild active={0}><div role="tablist" aria-label="Tabs"><button type="button" role="tab" aria-selected="true">One</button></div></TabIndicator>
      <AutoHeight id="auto"><p>Auto</p></AutoHeight>
      <Masonry id="masonry">{[40, 80, 60].map((h, i) => <div key={i} style={{ height: h }}>{i}</div>)}</Masonry>
      <SwipeDismiss id="note" onDismiss={() => {}}>Note</SwipeDismiss>
      <PinchZoom id="zoom"><img alt="Pixel" width="80" height="60" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" /></PinchZoom>
      <CursorFollower id="follower-area">Area</CursorFollower>
      <LongPress asChild onLongPress={() => setHeld((n) => n + 1)}><button type="button" id="hold">Hold {held}</button></LongPress>
    </section>
  );
}

export function App() {
  return (
    <main>
      <RevealOnScroll id="visible-reveal" preset={fadeUp}><p>Visible on load</p></RevealOnScroll>
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
      <ScrollProgressBar id="bar" />
      <ScrollScene id="scene" length={3} driver="js">
        <ScrollLayer id="layer" depth={2} distance={100}>Layer</ScrollLayer>
      </ScrollScene>
      <HorizontalScroll id="hs" label="Cards">
        {[1, 2, 3, 4, 5, 6].map((n) => <a key={n} href={"#c" + n} style={{ display: "block", width: 480, height: 200 }}>Card {n}</a>)}
      </HorizontalScroll>
      <div style={{ height: "150vh" }} />
      <RevealOnScroll id="late-reveal" preset={fadeUp}><p>Revealed on scroll</p></RevealOnScroll>
      <div style={{ height: "50vh" }} />
      <Phase012 />
    </main>
  );
}
`;

const CLIENT = `import { hydrateRoot } from "react-dom/client";
import "@neshel-ui/animations/styles.css";
import "@neshel-ui/animations/gestures.css";
import "@neshel-ui/animations/layout.css";
import { App } from "./App.jsx";
window.__recoverable = [];
hydrateRoot(document.getElementById("root"), <App />, {
  onRecoverableError: (error) => window.__recoverable.push(String(error?.message ?? error)),
});
window.__hydrated = true;
`;

/** In-page probe of the Phase 012 components after the real drag (conditions with a ceiling). */
const PHASE_012_PROBE = `(async () => {
  const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const until = async (fn) => { const t = performance.now(); while (performance.now() - t < 3000 && !fn()) await raf(); return fn(); };
  await until(() => document.getElementById("drag").style.transform.includes("translate3d(80px, 32px"));
  const dragged = document.getElementById("drag").style.transform;
  document.getElementById("toggle-panel").click();
  const panel = document.getElementById("panel");
  const opened = await until(() => panel.getBoundingClientRect().height > 10 && panel.getAnimations().length === 0);
  const card = document.getElementById("card-012");
  document.getElementById("toggle-card").click();
  await raf();
  const exiting = card.isConnected && card.getAttribute("aria-hidden") === "true";
  const removed = await until(() => !document.getElementById("card-012"));
  const handle = document.querySelector('[aria-label="Reorder Apple"]');
  handle.focus();
  handle.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
  handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  await until(() => document.querySelector("#fruits li:nth-child(2)")?.getAttribute("data-neshel-reorder-label") === "Apple");
  const order = [...document.querySelectorAll("#fruits li")].map((li) => li.getAttribute("data-neshel-reorder-label")).join();
  return { dragged, opened, exiting, removed, order, focus: document.activeElement === handle };
})()`;

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
    check(
      /<section id="scene" class="neshel-scene" style="--neshel-scene-length:3"><div class="neshel-scene-stage">/.test(
        html,
      ) &&
        /data-neshel-hscroll="scroll"/.test(html) &&
        /<div id="late-reveal" class="neshel-reveal-on-scroll"><p>/.test(html),
      "SSR (011): scene, native horizontal scroller and visible reveals in server markup",
    );
    check(
      /<div id="panel" class="neshel-collapse" data-state="closed" hidden="">/.test(html) &&
        /data-neshel-reorder-item=""/.test(html) &&
        /aria-label="Reorder Apple"/.test(html) &&
        /class="neshel-gesture-button neshel-swipe-dismiss" aria-label="Dismiss"/.test(html) &&
        /role="group" aria-label="Zoomable media" tabindex="0"/.test(html) &&
        /<div id="card-012">Present<\/div>/.test(html) &&
        /class="neshel-animated-list"><li>A<\/li>/.test(html),
      "SSR (012): gestures/layout components render plain, accessible markup (no measurements)",
    );
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
        // Phase 011: scroll family from the packed tarball after hydration.
        const scrollState = await page.evaluate(`(async () => {
          const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const late = document.getElementById("late-reveal");
          const visible = document.getElementById("visible-reveal");
          window.scrollTo(0, 0); await raf(); await raf();
          const held = { late: late.style.opacity, visible: visible.style.cssText };
          const scene = document.getElementById("scene");
          const top = scene.getBoundingClientRect().top + scrollY;
          const span = scene.offsetHeight - innerHeight;
          window.scrollTo(0, top + span / 2); await raf(); await raf(); await raf();
          const progress = Number(getComputedStyle(scene).getPropertyValue("--neshel-scene-progress"));
          const layer = document.getElementById("layer").style.transform;
          const stageTop = scene.firstElementChild.getBoundingClientRect().top;
          const hs = document.getElementById("hs").getAttribute("data-neshel-hscroll");
          late.scrollIntoView({ block: "center" });
          const start = performance.now();
          while (performance.now() - start < 3000 && (getComputedStyle(late).opacity !== "1" || late.style.cssText !== "")) await raf();
          return { held, progress, layer, stageTop, hs, revealed: getComputedStyle(late).opacity, lateStyle: late.style.cssText,
            bar: getComputedStyle(document.getElementById("bar")).getPropertyValue("--neshel-scroll-progress") };
        })()`);
        check(
          scrollState.held.late === "0" && scrollState.held.visible === "",
          `reveal: hydrated in-view content untouched, below-the-fold content held (${JSON.stringify(scrollState.held)})`,
        );
        check(
          Math.abs(scrollState.progress - 0.5) < 0.02 &&
            Math.abs(scrollState.stageTop) < 1 &&
            scrollState.layer === "",
          `ScrollScene pinned with CSS sticky; progress 0.5 and SP01 layer at identity (${JSON.stringify(scrollState)})`,
        );
        check(
          scrollState.hs === "pinned",
          `HorizontalScroll pinned after hydration (${scrollState.hs})`,
        );
        check(
          scrollState.revealed === "1" &&
            scrollState.lateStyle === "" &&
            Number(scrollState.bar) > 0,
          `reveal plays on scroll and restores the element; progress bar follows (${JSON.stringify(scrollState)})`,
        );
        // Phase 012: gestures and layout from the packed tarball after hydration (real mouse input).
        const dragBox = await page.evaluate(
          `(() => { const el = document.getElementById("drag"); el.scrollIntoView({ block: "center" }); const b = el.getBoundingClientRect(); return { x: b.left + 24, y: b.top + 24 }; })()`,
        );
        await page.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: dragBox.x,
          y: dragBox.y,
        });
        await page.send("Input.dispatchMouseEvent", {
          type: "mousePressed",
          x: dragBox.x,
          y: dragBox.y,
          button: "left",
          clickCount: 1,
        });
        for (let i = 1; i <= 8; i++) {
          await page.send("Input.dispatchMouseEvent", {
            type: "mouseMoved",
            x: dragBox.x + i * 10,
            y: dragBox.y + i * 4,
            button: "left",
            buttons: 1,
          });
        }
        await page.send("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x: dragBox.x + 80,
          y: dragBox.y + 32,
          button: "left",
          clickCount: 1,
        });
        const p012 = await page.evaluate(PHASE_012_PROBE);
        check(
          /translate3d\(80px, 32px/.test(p012.dragged),
          `G01 drag from the packed tarball follows a real mouse (${p012.dragged})`,
        );
        check(
          p012.opened && p012.exiting && p012.removed,
          `L06 collapse opens; L08 presence exits before unmount (${JSON.stringify(p012)})`,
        );
        check(
          p012.order === "Banana,Apple,Cherry" && p012.focus,
          `G10 keyboard reorder changes the consumer's state and keeps focus (${p012.order})`,
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
