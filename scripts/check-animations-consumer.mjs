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
import { Letterbox, Storyboard, StoryboardFrame, SplitReveal, CameraStage, TitleSequence, useTimeline } from "@neshel-ui/animations/cinematic";
import { PageTransition, SharedElement, RouteProgress, usePageTransition } from "@neshel-ui/animations/page-transitions";
import { defineEffect } from "@neshel-ui/animations/core";
import { TextReveal, NumberRoll, RotatingWords, Typewriter } from "@neshel-ui/animations/text";
import { SuccessCheck, MorphIcon, menuCloseShapes, usePathDraw } from "@neshel-ui/animations/svg";
import { BlurUpImage, CompareSlider, Lightbox, KenBurns } from "@neshel-ui/animations/media";
import { Aurora, Particles, AmbientMotionToggle } from "@neshel-ui/animations/ambient";
import { Spinner, ProgressBar, SuccessMark, EnterExit, LoadingButton } from "@neshel-ui/animations/feedback";
import { CardFlip, CubeRotate, RingCarousel, CornerRecede, Glitch, PerspectiveGrid, TiltShift } from "@neshel-ui/animations/advanced";
import { PageCurl, Ripple, DisplacementHover, DepthParallax } from "@neshel-ui/animations/gpu";
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

function Phase013() {
  const [boxed, setBoxed] = useState(false);
  const [view, setView] = useState("a");
  const transition = usePageTransition();
  const timeline = useTimeline((tl) => {
    tl.add({ target: document.getElementById("tl-target"), to: { x: 40 }, duration: 200 });
  });
  return (
    <section id="p013">
      <button type="button" id="toggle-letterbox" onClick={() => setBoxed(!boxed)}>Letterbox</button>
      <Letterbox id="frame" active={boxed} style={{ width: 400, height: 300 }}><p>Framed</p></Letterbox>
      <Storyboard id="story" label="Story"><StoryboardFrame>One</StoryboardFrame><StoryboardFrame>Two</StoryboardFrame></Storyboard>
      <SplitReveal id="split"><p>Split content</p></SplitReveal>
      <CameraStage label="Map" style={{ width: 200, height: 120 }}><div style={{ width: 800, height: 600 }}>Canvas</div></CameraStage>
      <TitleSequence effect={fadeUp} id="titles"><h2>Title</h2><p>Line</p></TitleSequence>
      <div id="tl-target">Timeline</div>
      <button type="button" id="play-timeline" onClick={() => timeline.play()}>Play</button>
      <button type="button" id="go-view" onClick={() => transition.start(() => setView(view === "a" ? "b" : "a"), { effect: "slide", direction: "forward" })}>Go</button>
      <PageTransition effect="slide"><p id="view">View {view}</p></PageTransition>
      <SharedElement name="badge"><span id="badge">Badge</span></SharedElement>
      <RouteProgress pending={false} />
    </section>
  );
}

function Phase014() {
  const path = useRef(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(1234.5);
  usePathDraw(path, { trigger: "mount", duration: 200 });
  return (
    <section id="p014">
      <TextReveal as="h2" id="t-reveal" split="chars" trigger="mount" duration={200}>Packed split text</TextReveal>
      <Typewriter id="t-type" trigger="mount" speed={200}>Typed</Typewriter>
      <NumberRoll id="t-number" value={value} locale="de-DE" />
      <button type="button" id="t-change" onClick={() => setValue(4321.5)}>Change</button>
      <p>We <RotatingWords id="t-words" words={["build", "ship"]} /> it.</p>
      <svg viewBox="0 0 100 10" width="100" aria-hidden="true"><path ref={path} id="s-path" d="M0 5L100 5" stroke="black" /></svg>
      <button type="button" id="s-menu" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><MorphIcon shapes={menuCloseShapes} state={open ? "close" : "menu"} /></button>
      <SuccessCheck id="s-check" trigger="mount" duration={200} />
    </section>
  );
}

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
function Phase015() {
  const [loading, setLoading] = useState(false);
  // Feature 017: F06 is enter/exit motion for a list another component owns (toasts live in Components).
  const [items, setItems] = useState([]);
  return (
    <section id="p015">
      <BlurUpImage id="m-blur" src={PIXEL} alt="Packed pixel" width={40} height={40} />
      <CompareSlider id="m-compare" label="Compare packed" before={<img alt="Before" src={PIXEL} />} after={<img alt="After" src={PIXEL} />} style={{ width: 200, height: 100 }} />
      <Lightbox label="Packed lightbox" thumbnail={<img id="m-thumb" alt="Open packed" src={PIXEL} width={40} height={40} />}><img alt="Large packed" src={PIXEL} width={200} height={200} /></Lightbox>
      <KenBurns trigger="manual" style={{ width: 100, height: 60 }}><img alt="Camera" src={PIXEL} /></KenBurns>
      <AmbientMotionToggle id="b-toggle" />
      <Aurora id="b-aurora" style={{ height: 60 }}><span>Aurora content</span></Aurora>
      <Particles id="b-particles" style={{ height: 60 }} />
      <Spinner id="f-spinner" label="Loading packed" />
      <ProgressBar id="f-bar" label="Packed progress" value={30} />
      <SuccessMark id="f-mark" show={false} />
      <LoadingButton loading={loading}><button type="button" id="f-pay" onClick={() => setLoading(true)}>Pay</button></LoadingButton>
      <button type="button" id="f-toast" onClick={() => setItems((list) => [...list, list.length])}>Add item</button>
      <EnterExit duration={2000}><ol id="f-list">{items.map((n) => <li key={n} data-state="entering">Packed item {n}</li>)}</ol></EnterExit>
    </section>
  );
}

function Phase016() {
  return (
    <section id="p016">
      <CardFlip id="d-flip" style={{ width: 160, height: 100 }} front={<button type="button" id="d-flip-toggle" data-neshel-flip-toggle>Flip</button>} back={<a href="#back" id="d-flip-back">Back side</a>} />
      <CubeRotate id="d-cube" style={{ width: 160, height: 100 }}><section>One</section><section>Two</section></CubeRotate>
      <RingCarousel id="d-ring" label="Packed ring" style={{ height: 120 }}><article style={{ width: 80 }}>A</article><article style={{ width: 80 }}>B</article><article style={{ width: 80 }}>C</article></RingCarousel>
      <CornerRecede id="d-corner" style={{ width: 160, height: 100 }}><div style={{ width: 160, height: 100, background: "#334155" }}>Corner</div></CornerRecede>
      <Glitch id="d-glitch">Packed glitch</Glitch>
      <PerspectiveGrid id="d-grid" style={{ height: 80 }}><span>Floor</span></PerspectiveGrid>
      <TiltShift id="d-tilt"><p>Tilt-shift content</p></TiltShift>
      <PageCurl id="g-curl" style={{ width: 80 }} front={<img alt="Packed page" src={PIXEL} width={80} height={80} />} under={<p>Under page</p>} />
      <Ripple id="g-ripple" style={{ width: 80 }}><img alt="Packed ripple" src={PIXEL} width={80} height={80} /></Ripple>
      <DisplacementHover id="g-displace" style={{ width: 80 }}><img alt="Packed displace" src={PIXEL} width={80} height={80} /></DisplacementHover>
      <DepthParallax id="g-depth" depth={PIXEL} style={{ width: 80 }}><img alt="Packed depth" src={PIXEL} width={80} height={80} /></DepthParallax>
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
      <Phase013 />
      <Phase014 />
      <Phase015 />
      <Phase016 />
    </main>
  );
}
`;

const CLIENT = `import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import "@neshel-ui/animations/styles.css";
import "@neshel-ui/animations/gestures.css";
import "@neshel-ui/animations/layout.css";
import "@neshel-ui/animations/cinematic.css";
import "@neshel-ui/animations/page-transitions.css";
import "@neshel-ui/animations/text.css";
import "@neshel-ui/animations/svg.css";
import "@neshel-ui/animations/media.css";
import "@neshel-ui/animations/ambient.css";
import "@neshel-ui/animations/feedback.css";
import "@neshel-ui/animations/advanced.css";
import "@neshel-ui/animations/gpu.css";
window.__vt = [];
if (document.startViewTransition) {
  const start = document.startViewTransition.bind(document);
  document.startViewTransition = (arg) => {
    const transition = start(arg);
    window.__vt.push({ types: arg && arg.types ? [...arg.types] : [] });
    return transition;
  };
}
import { App } from "./App.jsx";
window.__recoverable = [];
// StrictMode wrapper (Phase 014 review). This is a production build, where StrictMode does not double-invoke
// effects; the development double mount/unmount is covered by the unit tests (React development build).
hydrateRoot(document.getElementById("root"), <StrictMode><App /></StrictMode>, {
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
    check(
      [
        '<p>Framed</p><div class="neshel-letterbox-bars" aria-hidden="true" hidden="">',
        'aria-roledescription="carousel"',
        '<p>Split content</p><div class="neshel-cover-layers" aria-hidden="true" hidden=""',
        'aria-label="Map" tabindex="0" class="neshel-camera-stage"',
        "<h2>Title</h2><p>Line</p>",
        '<div class="neshel-page"><p id="view">View <!-- -->a</p></div>',
        'class="neshel-route-progress" hidden=""',
      ].every((fragment) => {
        if (html.includes(fragment)) return true;
        console.info(`missing in SSR markup: ${fragment}`);
        return false;
      }),
      "SSR (013): cinematic and page-transition components render visible, plain markup",
    );
    check(
      [
        '<h2 id="t-reveal">Packed split text</h2>',
        '<span id="t-type">Typed</span>',
        '<span id="t-number">1.234,5</span>',
        '<span id="t-words">build</span>',
        'aria-label="Menu" aria-expanded="false"',
        'class="neshel-success-check" focusable="false" aria-hidden="true"',
      ].every((fragment) => {
        if (html.includes(fragment)) return true;
        console.info(`missing in SSR markup: ${fragment}`);
        return false;
      }) && !/neshel-split|neshel-text-a11y|stroke-dash/.test(html),
      "SSR (014): text and SVG components render plain, readable markup (split only after hydration)",
    );
    check(
      [
        '<span class="neshel-blurup"><img alt="Packed pixel" id="m-blur"',
        'type="range" class="neshel-compare-input" aria-label="Compare packed"',
        '<dialog class="neshel-lightbox" aria-label="Packed lightbox">',
        '<div class="neshel-ambient" id="b-aurora"',
        'class="neshel-ambient-toggle" aria-pressed="false"',
        ">Pause background motion</button>",
        'role="progressbar" aria-label="Loading packed"',
        'aria-valuenow="30"',
        'role="status" aria-live="polite"',
      ].every((fragment) => {
        if (html.includes(fragment)) return true;
        console.info(`missing in SSR markup: ${fragment}`);
        return false;
      }) && !/neshel-blurup-layer|neshel-ambient-layer|<canvas|<dialog[^>]*open/.test(html),
      "SSR (015): media, ambient and feedback render native, visible markup (decorations only after hydration)",
    );
    check(
      [
        'class="neshel-flip"',
        'class="neshel-cube"',
        'class="neshel-ring"',
        'class="neshel-corner"',
        'class="neshel-glitch"',
        'class="neshel-grid-host"',
        'class="neshel-tiltshift-host"',
        'class="neshel-gpu-frame neshel-pagecurl"',
        'alt="Packed depth"',
      ].every((fragment) => {
        if (html.includes(fragment)) return true;
        console.info(`missing in SSR markup: ${fragment}`);
        return false;
      }) &&
        !/neshel-corner-flap|neshel-grid-floor|neshel-tiltshift"|neshel-ring-live|data-neshel-flip="|inert=""/.test(
          html,
        ),
      "SSR (016): advanced and GPU entries render static content only (engine output after hydration)",
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
        const p013 = await page.evaluate(`(async () => {
          const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const until = async (fn) => { const t = performance.now(); while (performance.now() - t < 3000 && !fn()) await raf(); return fn(); };
          const ssrIntact = document.getElementById("split").querySelector(".neshel-cover-layers").hidden;
          const titleStyle = document.querySelector("#titles h2").style.cssText;
          document.getElementById("toggle-letterbox").click();
          const bars = document.querySelector("#frame .neshel-letterbox-bars");
          const shown = await until(() => !bars.hidden && bars.firstElementChild.getBoundingClientRect().height > 0 && bars.firstElementChild.style.transform === "");
          document.getElementById("play-timeline").click();
          const moved = await until(() => document.getElementById("tl-target").style.transform.includes("translate3d(40px"));
          const controls = !document.querySelector("#story .neshel-storyboard-controls").hidden;
          document.getElementById("go-view").click();
          const changed = await until(() => document.getElementById("view").textContent === "View b");
          await until(() => !document.documentElement.hasAttribute("data-neshel-pt-effect"));
          return { ssrIntact, titleStyle, shown, moved, controls, changed, vt: window.__vt.length, native: typeof document.startViewTransition === "function" };
        })()`);
        check(
          p013.ssrIntact && p013.titleStyle === "",
          `013 hydration never covers or hides server-rendered content (${JSON.stringify(p013)})`,
        );
        check(
          p013.shown && p013.moved && p013.controls,
          `013 letterbox, timeline and storyboard controls work from the packed tarball (${JSON.stringify(p013)})`,
        );
        check(
          p013.changed && (!p013.native || p013.vt >= 1),
          `013 usePageTransition commits the update inside a native View Transition (${p013.vt} started)`,
        );
        const p014 = await page.evaluate(`(async () => {
          document.getElementById("p014").scrollIntoView();
          await new Promise((r) => setTimeout(r, 600));
          const h = document.getElementById("t-reveal");
          document.getElementById("t-change").click();
          document.getElementById("s-menu").click();
          await new Promise((r) => setTimeout(r, 900));
          return {
            copies: h.querySelectorAll(".neshel-text-a11y").length,
            a11y: h.querySelector(".neshel-text-a11y")?.textContent,
            hidden: h.querySelector(".neshel-split")?.getAttribute("aria-hidden"),
            number: document.querySelector("#t-number .neshel-text-a11y")?.textContent,
            words: document.querySelector("#t-words .neshel-text-a11y")?.textContent,
            path: document.getElementById("s-path").style.cssText,
            expanded: document.getElementById("s-menu").getAttribute("aria-expanded"),
            icon: document.querySelector("#s-menu path").getAttribute("d"),
          };
        })()`);
        check(
          p014.copies === 1 && p014.a11y === "Packed split text" && p014.hidden === "true",
          `014 split text from the packed tarball keeps one accessible copy (${JSON.stringify(p014)})`,
        );
        check(
          p014.number === "4.321,5" &&
            p014.words === "build, ship" &&
            p014.expanded === "true" &&
            p014.icon !== "M4 6L20 6M4 12L20 12M4 18L20 18",
          `014 number roll, rotating words and icon morph work after hydration (${JSON.stringify(p014)})`,
        );
        const p015 = await page.evaluate(`(async () => {
          document.getElementById("p015").scrollIntoView();
          await new Promise((r) => setTimeout(r, 400));
          const layer = document.querySelector("#b-aurora .neshel-ambient-layer");
          document.getElementById("m-thumb").closest("button").click();
          await new Promise((r) => setTimeout(r, 200));
          const dialog = document.querySelector("dialog.neshel-lightbox");
          const open = dialog.open && document.activeElement === dialog.querySelector("[data-neshel-lightbox-close]");
          dialog.querySelector("[data-neshel-lightbox-close]").click();
          await new Promise((r) => setTimeout(r, 700));
          document.getElementById("f-pay").click();
          await new Promise((r) => setTimeout(r, 100));
          document.getElementById("f-toast").click();
          await new Promise((r) => setTimeout(r, 300));
          return {
            layer: layer?.getAttribute("aria-hidden"),
            canvas: document.querySelector("#b-particles canvas")?.getAttribute("aria-hidden"),
            open,
            closed: !dialog.open,
            pay: document.getElementById("f-pay").getAttribute("aria-disabled"),
            enter: Number(document.querySelector("#f-list li")?.style.opacity || 1) < 1,
            blur: document.getElementById("m-blur").style.opacity,
          };
        })()`);
        check(
          p015.layer === "true" &&
            p015.canvas === "true" &&
            p015.open &&
            p015.closed &&
            p015.pay === "true" &&
            p015.enter === true &&
            p015.blur === "",
          `015 media/ambient/feedback hydrate and work from the packed tarball (${JSON.stringify(p015)})`,
        );
        const p016 = await page.evaluate(`(async () => {
          document.getElementById("p016").scrollIntoView();
          await new Promise((r) => setTimeout(r, 400));
          document.getElementById("d-flip-toggle").click();
          await new Promise((r) => setTimeout(r, 1200));
          return {
            flip: document.getElementById("d-flip").getAttribute("data-neshel-flip"),
            ring: document.getElementById("d-ring").getAttribute("aria-roledescription"),
            floor: document.querySelector("#d-grid .neshel-grid-floor")?.getAttribute("aria-hidden"),
            tilt: document.querySelector("#d-tilt .neshel-tiltshift")?.getAttribute("aria-hidden"),
            depth: document.querySelector("#g-depth canvas")?.getAttribute("aria-hidden") ?? "no-canvas",
            alt: document.querySelector("#g-depth img").getAttribute("alt"),
          };
        })()`);
        check(
          p016.flip === "back" &&
            p016.ring === "carousel" &&
            p016.floor === "true" &&
            p016.tilt === "true" &&
            (p016.depth === "true" || p016.depth === "no-canvas") &&
            p016.alt === "Packed depth",
          `016 advanced and GPU entries hydrate and work from the packed tarball (${JSON.stringify(p016)})`,
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
