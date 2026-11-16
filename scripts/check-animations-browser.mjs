// pnpm check:browser:animations [--dist <dir>] [--report <file>]
// Feature 008.0 (spec FR-090–FR-099): real-input checks of the animations lab in headless Chrome
// through the DevTools protocol (scripts/lib/cdp.mjs): Tilt3D pointer, return, composition,
// keyboard focus, unmount, live reduced-motion changes, zero React commits during movement;
// CornerRecede techniques; ScrollScene pinning, progress, depth layers, timeline segments, resize
// re-measurement and smooth scrub; axe. Requires `pnpm build:playground` first.
// Without a browser: fails when CI=true, otherwise prints SKIPPED and exits 0.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { findBrowser, launchBrowser } from "./lib/cdp.mjs";
import { repoRoot } from "./lib/workspace.mjs";

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const wait = (ms) => `new Promise((resolve) => setTimeout(resolve, ${ms}))`;
const rotation = (axis) =>
  `(() => { const m = /rotate${axis}\\((-?[\\d.]+)deg\\)/.exec(el.style.transform); return m ? Number(m[1]) : 0; })()`;

async function main() {
  const dist = resolve(argValue("--dist", join(repoRoot, "apps", "playground-vite", "dist")));
  const page = join(dist, "animations.html");
  if (!existsSync(page)) throw new Error(`${page} not found; run pnpm build:playground first`);
  const executable = findBrowser();
  if (!executable) {
    if (process.env.CI === "true")
      throw new Error("no Chrome/Chromium/Edge found on this CI runner");
    console.info(
      "check:browser:animations SKIPPED (no Chrome, Chromium or Edge found; set NESHEL_CHROME)",
    );
    return;
  }
  const require = createRequire(import.meta.url);
  const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
  const browser = await launchBrowser(executable);
  console.info(`Browser: ${browser.version}`);
  const cases = [];
  const notes = {};
  try {
    const p = await browser.newPage();
    await p.setViewport(1280, 900);
    // One call sets both features (each setEmulatedMedia call replaces the previous feature list).
    const motionPreference = (value) =>
      p.send("Emulation.setEmulatedMedia", {
        features: [
          { name: "prefers-color-scheme", value: "light" },
          { name: "prefers-reduced-motion", value },
        ],
      });
    // The host OS preference leaks into headless Chrome (GitHub's macOS images enable "Reduce
    // motion"), so record it and pin `no-preference`; the reduced cases emulate `reduce` explicitly.
    await p.goto("about:blank");
    notes.systemPrefersReducedMotion = await p.evaluate(
      `matchMedia("(prefers-reduced-motion: reduce)").matches`,
    );
    await motionPreference("no-preference");
    await p.goto(pathToFileURL(page).href);
    await p.evaluate(wait(300));

    const run = async (id, fn) => {
      try {
        await fn();
        cases.push({ id, ok: true });
      } catch (error) {
        cases.push({ id, ok: false, error: error.message });
      }
    };
    const check = (condition, message) => {
      if (!condition) throw new Error(message);
    };
    const mouse = (x, y) => p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    const key = async (keyName, code, keyCode, modifiers = 0) => {
      for (const type of ["rawKeyDown", "keyUp"]) {
        await p.send("Input.dispatchKeyEvent", {
          type,
          key: keyName,
          code,
          windowsVirtualKeyCode: keyCode,
          modifiers,
        });
      }
    };
    const rectOf = (selector) =>
      p.evaluate(
        `(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; })()`,
      );
    const tiltState = (selector) =>
      p.evaluate(
        `(() => { const el = document.querySelector(${JSON.stringify(selector)}); return { state: el.getAttribute("data-neshel-tilt"), inline: el.style.transform, rx: ${rotation("X")}, ry: ${rotation("Y")}, computed: getComputedStyle(el).transform, translate: getComputedStyle(el).translate }; })()`,
      );
    const scrollIntoView = (selector) =>
      p.evaluate(
        `(() => { document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: "center" }); })()`,
      );

    await run("load: no errors, tilt cards at rest after hydration", async () => {
      check(p.errors.length === 0, `page errors: ${p.errors.join(" | ")}`);
      const tilt = await tiltState("#tilt-basic");
      check(tilt.state === "rest", `state ${tilt.state}`);
      check(tilt.inline === "", `inline transform ${tilt.inline}`);
    });

    await run("tilt: top-right pointer recedes that corner; zero React commits", async () => {
      await scrollIntoView("#tilt-basic");
      await mouse(5, 5);
      const r = await rectOf("#tilt-basic");
      const commits = await p.evaluate("window.__neshelLab.tiltCommits");
      for (let step = 0; step <= 10; step++) {
        await mouse(
          r.left + r.width * (0.5 + step * 0.0495),
          r.top + r.height * (0.5 - step * 0.0495),
        );
        await p.evaluate(wait(16));
      }
      await p.evaluate(wait(700));
      const tilt = await tiltState("#tilt-basic");
      check(tilt.state === "pointer", `state ${tilt.state}`);
      check(tilt.rx > 8 && tilt.ry > 8, `rotations rx=${tilt.rx} ry=${tilt.ry} (${tilt.inline})`);
      check(tilt.computed !== "none", "computed transform is none");
      const after = await p.evaluate("window.__neshelLab.tiltCommits");
      check(
        after === commits,
        `React committed ${after - commits} time(s) during pointer movement`,
      );
    });

    await run("tilt: leaving springs back and removes the inline transform", async () => {
      await mouse(2, 2);
      await p.evaluate(wait(60));
      const mid = await tiltState("#tilt-basic");
      check(mid.inline !== "", "snapped instead of animating back");
      await p.evaluate(wait(1500));
      const tilt = await tiltState("#tilt-basic");
      check(
        tilt.state === "rest" && tilt.inline === "",
        `state ${tilt.state}, inline ${tilt.inline}`,
      );
    });

    await run("composition: CSS translate lift + JS transform tilt on one element", async () => {
      const r = await rectOf("#tilt-composed");
      await mouse(r.left + r.width * 0.9, r.top + r.height * 0.5);
      await mouse(r.left + r.width * 0.92, r.top + r.height * 0.5);
      await p.evaluate(wait(700));
      const tilt = await tiltState("#tilt-composed");
      check(/rotateY\(/.test(tilt.inline), `inline ${tilt.inline}`);
      check(/scale\(1\.03\)/.test(tilt.inline), `inline ${tilt.inline}`);
      check(tilt.translate === "0px -6px", `computed translate ${tilt.translate}`);
      await mouse(2, 2);
      await p.evaluate(wait(1200));
    });

    await run(
      "keyboard: Tab focus shows the focus pose; moving focus on returns it to rest",
      async () => {
        await p.evaluate("document.activeElement?.blur(); window.scrollTo(0, 0)");
        await key("Tab", "Tab", 9);
        await p.evaluate(wait(800));
        const active = await p.evaluate("document.activeElement?.id");
        check(active === "tilt-focus-target", `active element ${active}`);
        const focused = await tiltState("#tilt-basic");
        check(focused.state === "focus", `state ${focused.state}`);
        check(focused.rx > 3 && focused.ry < -3, `pose rx=${focused.rx} ry=${focused.ry}`);
        await key("Tab", "Tab", 9);
        await p.evaluate(wait(1200));
        const left = await tiltState("#tilt-basic");
        check(
          left.state === "rest" && left.inline === "",
          `after Tab: ${left.state} ${left.inline}`,
        );
        const depth = await tiltState("#tilt-depth");
        check(depth.state === "focus", `asChild link state ${depth.state}`);
        await p.evaluate("document.activeElement?.blur()");
        await p.evaluate(wait(1200));
      },
    );

    await run("unmount and remount: no errors, effect re-attached", async () => {
      await p.evaluate(`document.getElementById("tilt-toggle").click()`);
      await p.evaluate(wait(100));
      check(await p.evaluate(`!document.getElementById("tilt-basic")`), "card still mounted");
      await p.evaluate(`document.getElementById("tilt-toggle").click()`);
      await p.evaluate(wait(100));
      const tilt = await tiltState("#tilt-basic");
      check(tilt.state === "rest", `state ${tilt.state}`);
      check(p.errors.length === 0, `page errors: ${p.errors.join(" | ")}`);
    });

    await run("reduced motion (live change): flat cards, no transform on hover", async () => {
      await motionPreference("reduce");
      await p.evaluate(wait(100));
      const before = await tiltState("#tilt-basic");
      check(before.state === "reduced", `state ${before.state}`);
      await scrollIntoView("#tilt-basic");
      const r = await rectOf("#tilt-basic");
      await mouse(r.right - 4, r.top + 4);
      await mouse(r.right - 3, r.top + 5);
      await p.evaluate(wait(400));
      const tilt = await tiltState("#tilt-basic");
      check(tilt.inline === "" && tilt.computed === "none", `inline ${tilt.inline}`);
      await mouse(2, 2);
      await motionPreference("no-preference");
      await p.evaluate(wait(100));
      check((await tiltState("#tilt-basic")).state === "rest", "did not leave reduced state");
    });

    await run("corner: spring-animated amount drives all four techniques", async () => {
      await scrollIntoView("#corner-grid, .corner-grid");
      notes.webgl = await p.evaluate("window.__neshelLab.webgl");
      // Sample the amount on every animation frame (independent of runner speed; a fixed 80 ms read
      // was flaky on a loaded macOS runner, run 43804188974): an animation shows intermediate values,
      // a jump does not.
      const samples = await p.evaluate(`new Promise((resolve) => {
        const values = [];
        const start = performance.now();
        document.getElementById("corner-toggle").click();
        const sample = () => {
          const amount = window.__neshelLab.cornerAmount;
          values.push(amount);
          if (Math.abs(amount - 1) < 0.001 || performance.now() - start > 5000) resolve(values);
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      })`);
      const intermediate = samples.filter((value) => value > 0.01 && value < 0.99).length;
      check(
        intermediate >= 3,
        `only ${intermediate} intermediate values in ${samples.length} frames`,
      );
      await p.evaluate(wait(1000));
      const state = await p.evaluate(`(() => ({
        amount: window.__neshelLab.cornerAmount,
        range: document.getElementById("corner-amount").value,
        rigid: getComputedStyle(document.getElementById("corner-rigid")).transform,
        flap: getComputedStyle(document.querySelector(".corner-fold-flap")).transform,
        flapHidden: document.querySelector(".corner-fold-flap").getAttribute("aria-hidden"),
        flapInert: document.querySelector(".corner-fold-flap").inert,
        tiles: document.querySelectorAll(".corner-tile").length,
        cornerTile: getComputedStyle(document.querySelectorAll(".corner-tile")[7]).transform,
        farTile: getComputedStyle(document.querySelectorAll(".corner-tile")[56]).transform,
      }))()`);
      check(Math.abs(state.amount - 1) < 0.01, `amount ${state.amount}`);
      check(state.range === "100", `range ${state.range}`);
      check(
        state.rigid !== "none" && state.flap !== "none",
        `rigid ${state.rigid} flap ${state.flap}`,
      );
      check(
        state.flapHidden === "true" && state.flapInert === true,
        "flap copy is not hidden/inert",
      );
      check(state.tiles === 64, `${state.tiles} tiles`);
      check(state.cornerTile.startsWith("matrix3d"), `corner tile ${state.cornerTile}`);
      check(
        state.farTile === "none" ||
          /matrix\(1, 0, 0, 1, 0, 0\)/.test(state.farTile) ||
          /, 0, 0, 0, 1\)$/.test(state.farTile),
        `far tile ${state.farTile}`,
      );
      check(["ready", "unavailable"].includes(notes.webgl), `webgl ${notes.webgl}`);
    });

    await run("corner: reduced motion jumps without animation", async () => {
      await motionPreference("reduce");
      await p.evaluate(`document.getElementById("corner-toggle").click()`);
      const amount = await p.evaluate("window.__neshelLab.cornerAmount");
      check(amount === 0, `amount right after the click: ${amount}`);
      await motionPreference("no-preference");
    });

    const sceneGeometry = () =>
      p.evaluate(
        `(() => { const s = document.getElementById("scene"); const r = s.getBoundingClientRect(); return { top: r.top + window.scrollY, distance: s.offsetHeight - window.innerHeight }; })()`,
      );
    const scrollScene = async (fraction) => {
      const g = await sceneGeometry();
      await p.evaluate(`window.scrollTo(0, ${g.top + g.distance * fraction})`);
      await p.evaluate(wait(250));
    };
    const sceneState = () =>
      p.evaluate(`(() => {
        const stage = document.getElementById("scene-stage");
        const ty = (id) => new DOMMatrix(getComputedStyle(document.getElementById(id)).transform).m42;
        return {
          progress: window.__neshelLab.sceneProgress,
          css: Number(stage.style.getPropertyValue("--scene-progress")),
          stageTop: stage.getBoundingClientRect().top,
          far: ty("scene-layer-far"),
          front: ty("scene-layer-front"),
          caption: Number(getComputedStyle(document.getElementById("scene-caption")).opacity),
          measurements: window.__neshelLab.sceneMeasurements,
        };
      })()`);

    await run(
      "scene: pinned stage, synchronised progress, depth ordering, timeline segment",
      async () => {
        await scrollScene(0.25);
        const quarter = await sceneState();
        check(Math.abs(quarter.progress - 0.25) < 0.02, `progress ${quarter.progress}`);
        check(Math.abs(quarter.css - quarter.progress) < 1e-3, "CSS variable out of sync");
        check(Math.abs(quarter.stageTop) < 1, `stage not pinned (top ${quarter.stageTop})`);
        check(
          quarter.front > quarter.far && quarter.far > 0,
          `layers far ${quarter.far} front ${quarter.front}`,
        );
        check(
          Math.abs(quarter.front / quarter.far - 10) < 0.5,
          `depth ratio ${quarter.front / quarter.far}`,
        );
        await scrollScene(0.1);
        const early = await sceneState();
        check(
          Math.abs(early.caption - early.progress / 0.3) < 0.05,
          `caption opacity ${early.caption}`,
        );
        await scrollScene(0.5);
        const middle = await sceneState();
        check(Math.abs(middle.caption - 1) < 1e-3, `caption opacity ${middle.caption}`);
        check(Math.abs(middle.front) < 1, `front layer at progress 0.5: ${middle.front}`);
      },
    );

    await run("scene: viewport resize re-measures and keeps progress consistent", async () => {
      const before = await sceneState();
      await p.setViewport(800, 600);
      await p.evaluate(wait(400));
      const g = await sceneGeometry();
      const expected = Math.min(
        1,
        Math.max(0, ((await p.evaluate("window.scrollY")) - g.top) / g.distance),
      );
      const after = await sceneState();
      check(after.measurements > before.measurements, "no re-measurement after resize");
      check(
        Math.abs(after.progress - expected) < 0.02,
        `progress ${after.progress}, expected ${expected}`,
      );
      await p.setViewport(1280, 900);
      await p.evaluate(wait(300));
    });

    await run("scene: smooth scrub lags behind then converges", async () => {
      await p.evaluate(`document.getElementById("scene-smooth").click()`);
      await scrollScene(0.1);
      await p.evaluate(wait(1500));
      const g = await sceneGeometry();
      await p.evaluate(`window.scrollTo(0, ${g.top + g.distance * 0.9})`);
      await p.evaluate(wait(50));
      const lagging = await sceneState();
      check(lagging.progress < 0.8, `progress after 50 ms: ${lagging.progress}`);
      await p.evaluate(wait(2500));
      const settled = await sceneState();
      check(
        Math.abs(settled.progress - 0.9) < 0.02,
        `progress after settling: ${settled.progress}`,
      );
      await p.evaluate(`document.getElementById("scene-smooth").click()`);
    });

    notes.scrollDrivenAnimations = await p.evaluate(`CSS.supports("animation-timeline: view()")`);
    notes.viewTransitions = await p.evaluate(`typeof document.startViewTransition === "function"`);

    await run("axe: no violations on the lab page", async () => {
      await p.evaluate("window.scrollTo(0, 0)");
      await p.evaluate(axeSource);
      const violations = await p.evaluate(
        `axe.run(document, { resultTypes: ["violations"] }).then((r) => r.violations.map((v) => v.id + " (" + v.impact + "): " + v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")))`,
      );
      check(violations.length === 0, violations.join(" | "));
    });

    await run("no page errors during the whole run", async () => {
      check(p.errors.length === 0, p.errors.join(" | "));
    });
  } finally {
    await browser.close();
  }

  const failures = cases.filter((item) => !item.ok);
  for (const item of cases) {
    console.info(`${item.ok ? "ok  " : "FAIL"} ${item.id}${item.ok ? "" : `\n     ${item.error}`}`);
  }
  console.info(`notes: ${JSON.stringify(notes)}`);
  const reportPath = argValue("--report");
  if (reportPath) {
    mkdirSync(resolve(reportPath, ".."), { recursive: true });
    writeFileSync(
      reportPath,
      `${JSON.stringify({ browser: browser.version, cases, notes }, null, 2)}\n`,
    );
  }
  if (failures.length) {
    console.error(`check:browser:animations failed: ${failures.length} of ${cases.length} cases.`);
    process.exitCode = 1;
  } else {
    console.info(`check:browser:animations passed: ${cases.length} cases.`);
  }
}

main().catch((error) => {
  console.error(`check:browser:animations could not complete: ${error.message}`);
  process.exitCode = 1;
});
