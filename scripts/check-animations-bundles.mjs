// pnpm check:animations:bundles [--no-build] [--report <file>]
// Phase 009 (spec FR-063, SC-003; owner-approved budgets), Phase 010 (FR-073; family entries,
// representative imports and stylesheets, budgets proposed from measurements), Phase 011 and Phase 012
// (FR-054; gestures/layout entries): bundle sizes of @neshel-ui/animations
// measured from its REAL packed tarball (pnpm pack → extracted outside the workspace), built with
// Vite (Rolldown) minified, React external, gzip-compressed. Offline: Vite comes from the
// playground's installed dependencies; @radix-ui/react-slot is linked from the workspace install.
// Budgets: scripts/animations-bundle-budgets.json. Also asserts tree-shaking markers per entry.
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { packPackage, pnpm } from "./lib/pnpm.mjs";
import { readTarGz } from "./lib/tar.mjs";
import { createTempDir } from "./lib/temp.mjs";
import { repoRoot } from "./lib/workspace.mjs";

const PACKAGE = join(repoRoot, "packages", "animations");
const BUDGETS = JSON.parse(
  readFileSync(join(repoRoot, "scripts", "animations-bundle-budgets.json"), "utf8"),
);
const A = "@neshel-ui/animations";

/** Entry → source and markers that must (true) or must not (false) appear in the bundle. */
export const ENTRIES = {
  "core (entire entry)": {
    source: `export * from "${A}/core";`,
    markers: { react: false, slot: false },
  },
  "registry + host (defineEffect, createEffectRegistry, attachEffect)": {
    source: `export { defineEffect, createEffectRegistry, attachEffect } from "${A}/core";`,
    markers: {
      react: false,
      slot: false,
      waapi: false,
      easing: false,
      arbiter: true,
      devWarnings: true,
    },
  },
  composeTransform: {
    source: `export { composeTransform } from "${A}/core";`,
    markers: { scheduler: false },
  },
  "controllers (motionValue, animateValue)": {
    source: `export { motionValue, animateValue } from "${A}/core";`,
    markers: { react: false, waapi: false },
  },
  "hover: Tilt3D": {
    source: `export { Tilt3D } from "${A}/hover";`,
    markers: { react: true, slot: true, waapi: false, arbiter: false },
  },
  "hover: createTilt3D (no React)": {
    source: `export { createTilt3D } from "${A}/hover";`,
    markers: { react: false, slot: false, arbiter: false },
  },
  // Informational, not budgeted: an application production build replaces process.env.NODE_ENV,
  // which must remove development diagnostics (warning strings) from the bundle.
  "registry + host, production define (info)": {
    source: `export { defineEffect, createEffectRegistry, attachEffect } from "${A}/core";`,
    markers: { devWarnings: false, arbiter: true },
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
  },
  "root: React bindings": {
    source: `export * from "${A}";`,
    markers: { slot: false, tilt: false },
  },
  // Phase 010 (FR-073).
  "core: definePreset + attachPreset": {
    source: `export { definePreset, attachPreset } from "${A}/core";`,
    markers: { react: false, slot: false, waapi: false },
  },
  "entrance: Reveal + fadeUp": {
    source: `export { Reveal, fadeUp } from "${A}/entrance";`,
    markers: {
      react: true,
      slot: true,
      waapi: false,
      tilt: false,
      hoverCode: false,
      pressCode: false,
    },
  },
  "entrance: fadeIn definition (no React)": {
    source: `export { fadeIn } from "${A}/entrance";`,
    markers: { react: false, slot: false, waapi: false },
  },
  "entrance: entire entry": {
    source: `export * from "${A}/entrance";`,
    markers: { tilt: false, hoverCode: false, pressCode: false },
  },
  "hover: Hover + lift": {
    source: `export { Hover, lift } from "${A}/hover";`,
    markers: { react: true, slot: true, waapi: false, tilt: false, pressCode: false },
  },
  "hover: lift definition (no React)": {
    source: `export { lift } from "${A}/hover";`,
    markers: { react: false, slot: false, tilt: false },
  },
  "hover: entire entry": {
    source: `export * from "${A}/hover";`,
    markers: { pressCode: false },
  },
  "press: Press + pressScale": {
    source: `export { Press, pressScale } from "${A}/press";`,
    markers: { react: true, slot: true, waapi: false, tilt: false, hoverCode: false },
  },
  "press: ripple definition (no React)": {
    source: `export { ripple } from "${A}/press";`,
    markers: { react: false, slot: false, waapi: true },
  },
  "press: NumberTick": {
    source: `export { NumberTick } from "${A}/press";`,
    markers: { react: true, waapi: false, hoverCode: false },
  },
  "press: entire entry": {
    source: `export * from "${A}/press";`,
    markers: { tilt: false, hoverCode: false },
  },
  // Phase 011 (FR-045): scroll family.
  "scroll: createScrollProgress (engine, no React)": {
    source: `export { createScrollProgress } from "${A}/scroll";`,
    markers: { react: false, slot: false, waapi: false, entranceCode: false, hoverCode: false },
  },
  "scroll: depthParallax definition (no React)": {
    source: `export { depthParallax } from "${A}/scroll";`,
    markers: { react: false, slot: false, waapi: false, entranceCode: false },
  },
  "scroll: revealOnEnter definition (no React)": {
    source: `export { revealOnEnter } from "${A}/scroll";`,
    markers: { react: false, slot: false, entranceCode: false, hoverCode: false },
  },
  "scroll: ScrollScene + ScrollLayer": {
    source: `export { ScrollScene, ScrollLayer } from "${A}/scroll";`,
    markers: { react: true, entranceCode: false, hoverCode: false, pressCode: false },
  },
  "scroll: RevealOnScroll": {
    source: `export { RevealOnScroll } from "${A}/scroll";`,
    markers: { react: true, entranceCode: false, hoverCode: false, pressCode: false },
  },
  "scroll: HorizontalScroll": {
    source: `export { HorizontalScroll } from "${A}/scroll";`,
    markers: { react: true, entranceCode: false, hoverCode: false, pressCode: false },
  },
  "scroll: entire entry": {
    source: `export * from "${A}/scroll";`,
    markers: { tilt: false, entranceCode: false, hoverCode: false, pressCode: false },
  },
  // Phase 012 (FR-054): gestures, layout, H11, P11.
  "gestures: createGesture (engine, no React)": {
    source: `export { createGesture } from "${A}/gestures";`,
    markers: { react: false, slot: false, waapi: false, layoutCode: false, hoverCode: false },
  },
  "gestures: physics primitives (decay, rubber band, snap, velocity)": {
    source: `export { stepDecay, projectDecay, rubberband, nearestSnap, createVelocityTracker } from "${A}/gestures";`,
    markers: { react: false, scheduler: false, arbiter: false },
  },
  "gestures: drag definition (no React)": {
    source: `export { drag } from "${A}/gestures";`,
    markers: { react: false, slot: false, waapi: false, layoutCode: false },
  },
  "gestures: pinchZoom + rotateGesture (no React)": {
    source: `export { pinchZoom, rotateGesture } from "${A}/gestures";`,
    markers: { react: false, slot: false, layoutCode: false },
  },
  "gestures: Reorder components": {
    source: `export { Reorder, ReorderItem, ReorderHandle } from "${A}/gestures";`,
    markers: { react: true, layoutCode: false, hoverCode: false, pressCode: false },
  },
  "gestures: Gesture + drag": {
    source: `export { Gesture, drag } from "${A}/gestures";`,
    markers: { react: true, slot: true, layoutCode: false },
  },
  "gestures: entire entry": {
    source: `export * from "${A}/gestures";`,
    markers: {
      tilt: false,
      layoutCode: false,
      hoverCode: false,
      pressCode: false,
      entranceCode: false,
    },
  },
  "layout: createLayoutGroup + flipMove (no React)": {
    source: `export { createLayoutGroup, flipMove } from "${A}/layout";`,
    markers: { react: false, slot: false, gesturesCode: false },
  },
  "layout: Presence": {
    source: `export { Presence } from "${A}/layout";`,
    markers: { react: true, gesturesCode: false, entranceCode: false },
  },
  "layout: LayoutGroup + LayoutItem": {
    source: `export { LayoutGroup, LayoutItem } from "${A}/layout";`,
    markers: { react: true, gesturesCode: false },
  },
  "layout: entire entry": {
    source: `export * from "${A}/layout";`,
    markers: { gesturesCode: false, hoverCode: false, pressCode: false, entranceCode: false },
  },
  "hover: cursorFollower definition (no React)": {
    source: `export { cursorFollower } from "${A}/hover";`,
    markers: { react: false, slot: false, tilt: false },
  },
  "press: longPress definition (no React)": {
    source: `export { longPress } from "${A}/press";`,
    markers: { react: false, slot: false, hoverCode: false },
  },
  // Phase 013 (FR-045): cinematic and page-transition entries; router adapters with their router external.
  "cinematic: createTimeline (engine, no React)": {
    source: `export { createTimeline } from "${A}/cinematic";`,
    markers: { react: false, slot: false, entranceCode: false, scrollCode: false, pageCode: false },
  },
  "cinematic: useTimeline": {
    source: `export { useTimeline } from "${A}/cinematic";`,
    markers: { react: true, entranceCode: false, pageCode: false },
  },
  "cinematic: SceneChapters + Chapter + SceneSegment": {
    source: `export { SceneChapters, Chapter, SceneSegment } from "${A}/cinematic";`,
    markers: { react: true, scrollCode: false, entranceCode: false },
  },
  "cinematic: CameraStage": {
    source: `export { CameraStage, useCamera } from "${A}/cinematic";`,
    markers: { react: true, scrollCode: false },
  },
  "cinematic: Storyboard": {
    source: `export { Storyboard, StoryboardFrame } from "${A}/cinematic";`,
    markers: { react: true, scrollCode: false },
  },
  "cinematic: entire entry": {
    source: `export * from "${A}/cinematic";`,
    markers: {
      entranceCode: false,
      scrollCode: false,
      gesturesCode: false,
      layoutCode: false,
      pageCode: false,
    },
  },
  "page-transitions: startPageTransition (engine, no React)": {
    source: `export { startPageTransition } from "${A}/page-transitions";`,
    markers: { react: false, slot: false, cinematicCode: false },
  },
  "page-transitions: PageTransition + SharedElement": {
    source: `export { PageTransition, SharedElement } from "${A}/page-transitions";`,
    markers: { react: true, cinematicCode: false },
  },
  "page-transitions: RouteProgress": {
    source: `export { RouteProgress } from "${A}/page-transitions";`,
    markers: { react: true, cinematicCode: false },
  },
  "page-transitions: entire entry": {
    source: `export * from "${A}/page-transitions";`,
    markers: { cinematicCode: false, entranceCode: false, layoutCode: false },
  },
  "page-transitions/next: adapter (next external)": {
    source: `export * from "${A}/page-transitions/next";`,
    markers: { react: true, cinematicCode: false },
    external: [/^next(?:$|\/)/],
  },
  "page-transitions/react-router: adapter (react-router external)": {
    source: `export * from "${A}/page-transitions/react-router";`,
    markers: { react: true, cinematicCode: false },
    external: [/^react-router(?:$|\/)/],
  },
  // Phase 014 (FR-045): text and SVG families; neither bundles the other, Cinematic or Scroll.
  "text: splitText (engine, no React)": {
    source: `export { splitText } from "${A}/text";`,
    markers: { react: false, slot: false, cinematicCode: false, scrollCode: false, svgCode: false },
  },
  "text: createTextReveal (engine, no React)": {
    source: `export { createTextReveal } from "${A}/text";`,
    markers: { react: false, cinematicCode: false, scrollCode: false, svgCode: false },
  },
  "text: TextReveal": {
    source: `export { TextReveal } from "${A}/text";`,
    markers: { react: true, cinematicCode: false, svgCode: false },
  },
  "text: NumberRoll": {
    source: `export { NumberRoll } from "${A}/text";`,
    markers: { react: true, cinematicCode: false, svgCode: false },
  },
  "text: entire entry": {
    source: `export * from "${A}/text";`,
    markers: { cinematicCode: false, scrollCode: false, svgCode: false, entranceCode: false },
  },
  "svg: path data + geometry + morph (pure)": {
    source: `export { parsePathData, getPathGeometry, interpolatePath } from "${A}/svg";`,
    markers: { react: false, scheduler: false, textCode: false },
  },
  "svg: createPathDraw (engine, no React)": {
    source: `export { createPathDraw } from "${A}/svg";`,
    markers: { react: false, cinematicCode: false, textCode: false },
  },
  "svg: createPathMorph (engine, no React)": {
    source: `export { createPathMorph } from "${A}/svg";`,
    markers: { react: false, cinematicCode: false, textCode: false },
  },
  "svg: MorphIcon": {
    source: `export { MorphIcon, menuCloseShapes } from "${A}/svg";`,
    markers: { react: true, textCode: false },
  },
  "svg: entire entry": {
    source: `export * from "${A}/svg";`,
    markers: { cinematicCode: false, scrollCode: false, textCode: false },
  },
  // Phase 015 (FR-065): media, ambient and feedback families; none bundles another family; basic entries never
  // bundle the canvas surface or the toaster.
  "media: watchImage (pure, no React)": {
    source: `export { watchImage } from "${A}/media";`,
    markers: { react: false, scheduler: false, surface: false },
  },
  "media: createBlurUp + createLoadReveal (engine, no React)": {
    source: `export { createBlurUp, createLoadReveal } from "${A}/media";`,
    markers: { react: false, surface: false, ambientCode: false, feedbackCode: false },
  },
  "media: createVideoScrub (engine, no React)": {
    source: `export { createVideoScrub } from "${A}/media";`,
    markers: { react: false, surface: false, scrollCode: false },
  },
  "media: createPixelDissolve (engine, no React)": {
    source: `export { createPixelDissolve } from "${A}/media";`,
    markers: { react: false, surface: true },
  },
  "media: CompareSlider": {
    source: `export { CompareSlider } from "${A}/media";`,
    markers: { react: true, surface: false },
  },
  "media: Lightbox": {
    source: `export { Lightbox } from "${A}/media";`,
    markers: { react: true, surface: false, layoutCode: false },
  },
  "media: entire entry": {
    source: `export * from "${A}/media";`,
    markers: {
      ambientCode: false,
      feedbackCode: false,
      svgCode: false,
      textCode: false,
      scrollCode: false,
    },
  },
  "ambient: createAurora (engine, no React)": {
    source: `export { createAurora } from "${A}/ambient";`,
    markers: { react: false, surface: false, mediaCode: false },
  },
  "ambient: createParticles (engine, no React)": {
    source: `export { createParticles } from "${A}/ambient";`,
    markers: { react: false, surface: true, mediaCode: false },
  },
  "ambient: Aurora + AmbientMotionToggle": {
    source: `export { Aurora, AmbientMotionToggle } from "${A}/ambient";`,
    markers: { react: true },
  },
  "ambient: entire entry": {
    source: `export * from "${A}/ambient";`,
    markers: { mediaCode: false, feedbackCode: false, svgCode: false },
  },
  "feedback: Spinner + ProgressBar": {
    source: `export { Spinner, ProgressBar } from "${A}/feedback";`,
    markers: { react: true, toaster: false, surface: false },
  },
  // Feature 017: the toaster moved to @neshel-ui/components; F06 is enter/exit motion only (budgets approved by
  // the owner, 2026-11-23; specs/017-components-completion/evidence.md).
  "feedback: createEnterExit (no React)": {
    source: `export { createEnterExit } from "${A}/feedback";`,
    markers: { react: false, toaster: false },
  },
  "feedback: EnterExit": {
    source: `export { EnterExit } from "${A}/feedback";`,
    markers: { react: true, toaster: false, layoutCode: false },
  },
  "feedback: entire entry": {
    source: `export * from "${A}/feedback";`,
    markers: { mediaCode: false, ambientCode: false, svgCode: false, layoutCode: false },
  },
  // Phase 016 (FR-001, FR-033; ADR 0031): ./advanced never bundles WebGL or GPU code; ./gpu never bundles the CSS
  // family; neither bundles an earlier family. Budgets proposed from these measurements (owner review).
  "advanced: createCardFlip (engine, no React)": {
    source: `export { createCardFlip } from "${A}/advanced";`,
    markers: { react: false, webgl: false, gpuCode: false, cinematicCode: false },
  },
  "advanced: createCubeRotate (engine, no React)": {
    source: `export { createCubeRotate } from "${A}/advanced";`,
    markers: { react: false, webgl: false, gpuCode: false },
  },
  "advanced: createRingCarousel (engine, no React)": {
    source: `export { createRingCarousel } from "${A}/advanced";`,
    markers: { react: false, webgl: false, gesturesCode: false },
  },
  "advanced: createCornerRecede (engine, no React)": {
    source: `export { createCornerRecede } from "${A}/advanced";`,
    markers: { react: false, webgl: false, hoverCode: false, tilt: false },
  },
  "advanced: createGlitch (engine, no React)": {
    source: `export { createGlitch } from "${A}/advanced";`,
    markers: { react: false, webgl: false },
  },
  "advanced: createPerspectiveGrid + createTiltShift (engine, no React)": {
    source: `export { createPerspectiveGrid, createTiltShift } from "${A}/advanced";`,
    markers: { react: false, webgl: false, ambientCode: false },
  },
  "advanced: CardFlip + CornerRecede": {
    source: `export { CardFlip, CornerRecede } from "${A}/advanced";`,
    markers: { react: true, webgl: false, gpuCode: false },
  },
  "advanced: entire entry": {
    source: `export * from "${A}/advanced";`,
    markers: {
      webgl: false,
      gpuCode: false,
      mediaCode: false,
      ambientCode: false,
      hoverCode: false,
    },
  },
  "gpu: configureGpu + getGpuSupport (no effect)": {
    source: `export { configureGpu, getGpuSupport } from "${A}/gpu";`,
    markers: { react: false, gpuCode: false, scheduler: false },
  },
  "gpu: createRipple (engine, no React)": {
    source: `export { createRipple } from "${A}/gpu";`,
    markers: { react: false, webgl: true, advancedCode: false, mediaCode: false },
  },
  "gpu: createDisplacementHover (engine, no React)": {
    source: `export { createDisplacementHover } from "${A}/gpu";`,
    markers: { react: false, webgl: true, advancedCode: false },
  },
  "gpu: createDepthParallax (engine, no React)": {
    source: `export { createDepthParallax } from "${A}/gpu";`,
    markers: { react: false, webgl: true, advancedCode: false },
  },
  "gpu: createPageCurl (engine, no React)": {
    source: `export { createPageCurl } from "${A}/gpu";`,
    markers: { react: false, webgl: true, advancedCode: false, cinematicCode: false },
  },
  "gpu: PageCurl + Ripple": {
    source: `export { PageCurl, Ripple } from "${A}/gpu";`,
    markers: { react: true, webgl: true, advancedCode: false },
  },
  "gpu: entire entry": {
    source: `export * from "${A}/gpu";`,
    markers: { advancedCode: false, mediaCode: false, ambientCode: false, hoverCode: false },
  },
};

/** Stylesheets measured from the packed tarball (gzip of the file as shipped). */
export const STYLESHEETS = [
  "dist/hover.css",
  "dist/press.css",
  "dist/scroll.css",
  "dist/styles.css",
  "dist/gestures.css",
  "dist/layout.css",
  "dist/cinematic.css",
  "dist/page-transitions.css",
  "dist/page-transitions-mpa.css",
  "dist/text.css",
  "dist/svg.css",
  "dist/media.css",
  "dist/ambient.css",
  "dist/feedback.css",
  "dist/advanced.css",
  "dist/gpu.css",
];

const MARKERS = {
  react: (code) => /from\s*["']react/.test(code),
  slot: (code) => /react-slot|createSlot|Slottable/.test(code),
  waapi: (code) => /\.animate(?:\?\.)?\(/.test(code),
  scheduler: (code) => /requestAnimationFrame/.test(code),
  tilt: (code) => /data-neshel-tilt/.test(code),
  easing: (code) => /cubic-bezier\(/.test(code),
  arbiter: (code) => /is suspended/.test(code),
  devWarnings: (code) => /changed outside the engine/.test(code),
  // Family fingerprints (strings that only that family's code contains).
  hoverCode: (code) => /hover\/lift|hover\/glow|hover\/spotlight/.test(code),
  pressCode: (code) => /press\/scale|press\/ripple|press\/number-tick/.test(code),
  entranceCode: (code) => /entrance\/fade-in|entrance\/fade-slide|entrance\/clip-reveal/.test(code),
  gesturesCode: (code) => /physics\/drag|physics\/pinch-zoom|physics\/reorder/.test(code),
  layoutCode: (code) => /layout\/flip|layout\/collapse|layout\/masonry/.test(code),
  scrollCode: (code) =>
    /scroll\/depth-parallax|scroll-trigger\/reveal|scroll\/pinned-scene/.test(code),
  cinematicCode: (code) => /cinematic\/timeline|cinematic\/cover|createTimeline/.test(code),
  pageCode: (code) => /page\/transition|page\/cross-document/.test(code),
  textCode: (code) => /neshel-text-a11y|text\/text-reveal/.test(code),
  svgCode: (code) => /parsePathData|svg\/path-draw|svg\/dash-flow/.test(code),
  mediaCode: (code) => /media\/ken-burns|media\/compare|media\/duotone/.test(code),
  ambientCode: (code) => /neshel-ambient-layer|createAurora|ambient-infinite/.test(code),
  feedbackCode: (code) => /feedback\/loading-button|feedback\/optimistic|neshel-toast/.test(code),
  surface: (code) => /contextrestored/.test(code),
  // Phase 016: WebGL code, the GPU entries and the CSS family.
  webgl: (code) => /webgl2|createShader/.test(code),
  gpuCode: (code) => /#version 300 es|gpu\/image|gpu\/page-curl/.test(code),
  advancedCode: (code) => /advanced\/flip|advanced\/corner-recede|advanced\/cube/.test(code),
  toaster: (code) => /toaster\.show/.test(code),
};

function link(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  symlinkSync(realpathSync(from), to, "junction");
}

async function main() {
  if (!process.argv.includes("--no-build")) pnpm(["--filter", A, "build"], repoRoot);
  const requireFromPlayground = createRequire(
    join(repoRoot, "apps", "playground-vite", "package.json"),
  );
  const { build } = await import(pathToFileURL(requireFromPlayground.resolve("vite")).href);
  const { dir, dispose } = createTempDir("neshel animations bundles ñ-", {
    keep: process.argv.includes("--keep"),
  });
  if (process.argv.includes("--keep")) console.info(`keeping ${dir}`);
  const results = {};
  const failures = [];
  try {
    const tarball = readFileSync(packPackage(PACKAGE, join(dir, "tarball")));
    const target = join(dir, "app", "node_modules", "@neshel-ui", "animations");
    for (const [path, contents] of readTarGz(tarball)) {
      const file = join(target, ...path.replace(/^package\//, "").split("/"));
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, contents);
    }
    for (const sheet of STYLESHEETS) {
      const code = readFileSync(join(target, ...sheet.split("/")));
      const name = `css: ${sheet.replace("dist/", "")}`;
      const gzip = gzipSync(code, { level: 9 }).length;
      const budget = BUDGETS[name];
      results[name] = {
        minBytes: code.length,
        gzipBytes: gzip,
        budgetBytes: budget ?? null,
        markers: {},
      };
      if (budget !== undefined && gzip > budget)
        failures.push(`${name}: ${gzip} B gzip > budget ${budget} B`);
      console.info(
        `${budget !== undefined && gzip > budget ? "FAIL" : "ok  "} ${name} — ${(gzip / 1024).toFixed(2)} KiB gzip (${code.length} B raw)${budget !== undefined ? ` / budget ${(budget / 1024).toFixed(2)} KiB` : ""}`,
      );
    }
    link(
      join(PACKAGE, "node_modules", "@radix-ui", "react-slot"),
      join(dir, "app", "node_modules", "@radix-ui", "react-slot"),
    );
    for (const [name, { source, markers, define, external = [] }] of Object.entries(ENTRIES)) {
      const slug = name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const entry = join(dir, "app", `${slug}.js`);
      writeFileSync(entry, source);
      const outDir = join(dir, "app", "out", slug);
      await build({
        configFile: false,
        logLevel: "silent",
        root: join(dir, "app"),
        ...(define ? { define } : {}),
        build: {
          outDir,
          emptyOutDir: true,
          minify: true,
          lib: { entry, formats: ["es"], fileName: "out" },
          rollupOptions: { external: [/^react($|\/)/, /^react-dom($|\/)/, ...external] },
        },
      });
      const file = readdirSync(outDir).find((item) => /.m?js$/.test(item));
      const code = readFileSync(join(outDir, file));
      const text = code.toString("utf8");
      const gzip = gzipSync(code, { level: 9 }).length;
      const budget = BUDGETS[name];
      const markerResults = Object.fromEntries(
        Object.keys(markers).map((marker) => [marker, MARKERS[marker](text)]),
      );
      results[name] = {
        minBytes: code.length,
        gzipBytes: gzip,
        budgetBytes: budget ?? null,
        markers: markerResults,
      };
      if (budget !== undefined && gzip > budget)
        failures.push(`${name}: ${gzip} B gzip > budget ${budget} B`);
      for (const [marker, expected] of Object.entries(markers)) {
        if (markerResults[marker] !== expected) {
          failures.push(
            `${name}: marker "${marker}" ${expected ? "missing" : "present"} (tree-shaking)`,
          );
        }
      }
      const status = budget !== undefined && gzip > budget ? "FAIL" : "ok  ";
      console.info(
        `${status} ${name} — ${(gzip / 1024).toFixed(2)} KiB gzip (${code.length} B min)${budget !== undefined ? ` / budget ${(budget / 1024).toFixed(2)} KiB` : ""}`,
      );
    }
  } finally {
    dispose();
  }
  const reportIndex = process.argv.indexOf("--report");
  if (reportIndex !== -1)
    writeFileSync(process.argv[reportIndex + 1], `${JSON.stringify(results, null, 2)}\n`);
  if (failures.length) {
    for (const failure of failures) console.error(`ERROR ${failure}`);
    process.exitCode = 1;
  } else {
    console.info(
      "check:animations:bundles passed (packed tarball, budgets and tree-shaking markers).",
    );
  }
}

main().catch((error) => {
  console.error(`check:animations:bundles could not complete: ${error.message}`);
  process.exitCode = 1;
});
