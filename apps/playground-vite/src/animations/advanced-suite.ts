// In-page checks of the Phase 016 gallery in a real layout engine, shared by the CDP check (Chrome) and the Playwright
// check (Chromium, Firefox, WebKit). Decided by observable conditions with ceilings, never by fixed sleeps. GPU rows
// probe real WebGL2 pixels (readPixels right after a synchronous draw); fallback rows are separate cases and never
// count as the main effect. Capabilities an engine lacks are recorded as notes.
import {
  createCornerRecede,
  createGlitch,
  getAdvancedDebugInfo,
} from "@neshel-ui/animations/advanced";
import { getFrameScheduler } from "@neshel-ui/animations/core";
import {
  configureGpu,
  createDisplacementHover,
  getGpuDebugInfo,
  getGpuSupport,
} from "@neshel-ui/animations/gpu";
import { labState } from "./lab-state";

type Case = { id: string; ok: boolean; error?: string };

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
async function frames(count: number) {
  for (let index = 0; index < count; index++) await frame();
}
async function until(label: string, condition: () => boolean, describe: () => unknown, ms = 6000) {
  const start = performance.now();
  while (performance.now() - start < ms) {
    try {
      if (condition()) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  throw new Error(`${label}: not reached within ${ms} ms; ${JSON.stringify(describe())}`);
}
const check = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const byId = <T extends HTMLElement = HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`#${id} missing`);
  return element as T;
};
const notes = () => labState().notes;
type ControlName =
  | "flip"
  | "cube"
  | "ring"
  | "corner"
  | "glitch"
  | "grid"
  | "tilt"
  | "curl"
  | "curlCss"
  | "ripple"
  | "displace"
  | "depth";
// biome-ignore lint/suspicious/noExplicitAny: lab-only control refs.
const controls = () => labState().advanced?.controls as Record<ControlName, { current: any }>;
function reveal(element: Element) {
  element.scrollIntoView({ block: "center" });
}
function dispatchPointer(target: EventTarget, type: string, x: number, y: number) {
  target.dispatchEvent(
    new PointerEvent(type, {
      clientX: x,
      clientY: y,
      pointerType: "mouse",
      pointerId: 1,
      button: 0,
      bubbles: type !== "pointerenter" && type !== "pointerleave",
    }),
  );
}
/** Points of a `polygon(...)` clip-path in px. */
function polygon(value: string): Array<[number, number]> {
  const inner = /polygon\((.*)\)/.exec(value)?.[1] ?? "";
  return inner.split(",").map((pair) => {
    const [x, y] = pair
      .trim()
      .split(/\s+/)
      .map((n) => Number.parseFloat(n));
    return [x ?? 0, y ?? 0];
  });
}
const differs = (a: number[] | undefined, b: number[] | undefined, tolerance = 6) =>
  !!a && !!b && a.some((v, i) => Math.abs(v - (b[i] ?? 0)) > tolerance);

/** GPU main-effect rows need WebGL2; without it they report NO_WEBGL2 (never a pass). */
function requireWebgl2(): void {
  if (!getGpuSupport().webgl2)
    throw new Error("NO_WEBGL2: WebGL2 is unavailable in this environment");
}

async function runCases(list: Array<[string, () => Promise<void>]>): Promise<Case[]> {
  const cases: Case[] = [];
  for (const [id, fn] of list) {
    try {
      await fn();
      cases.push({ id, ok: true });
    } catch (error) {
      cases.push({ id, ok: false, error: String((error as Error)?.message ?? error) });
    }
  }
  return cases;
}

export async function runAdvancedSuite(): Promise<Case[]> {
  const c = controls();
  return runCases([
    [
      "D01 card flip: real 3D, hidden face inert, in-face toggle flips, focus moves to the visible face",
      async () => {
        const root = byId("d01-card");
        reveal(root);
        // A reduced-motion emulation that just ended reaches the page as an asynchronous `change` event.
        await until(
          "3d mode",
          () => c.flip.current?.mode === "3d",
          () => c.flip.current?.mode,
        );
        const inner = root.querySelector(".neshel-flip-inner") as HTMLElement;
        const back = root.querySelector(".neshel-flip-back") as HTMLElement;
        const front = root.querySelector(".neshel-flip-front") as HTMLElement;
        check(
          getComputedStyle(back).backfaceVisibility === "hidden",
          `backface-visibility ${getComputedStyle(back).backfaceVisibility}; style "${back.getAttribute("style")}"; mode ${c.flip.current?.mode}`,
        );
        check(getComputedStyle(inner).transformStyle === "preserve-3d", "preserve-3d");
        check(back.inert && back.getAttribute("aria-hidden") === "true", "back hidden from AT");
        const toggle = byId("d01-front-toggle");
        toggle.focus();
        toggle.click();
        await until(
          "flipped",
          () => c.flip.current?.side === "back" && c.flip.current.progress > 0.99,
          () => c.flip.current?.progress,
        );
        await frames(3);
        check(front.inert, "front became inert");
        check(
          document.activeElement?.id === "d01-back-link",
          `focus on ${document.activeElement?.id}`,
        );
        const matrix = getComputedStyle(inner).transform;
        check(
          matrix.startsWith("matrix3d") || matrix.startsWith("matrix"),
          `inner transform ${matrix}`,
        );
        byId("d01-back-toggle").click();
        await until(
          "back to front",
          () => c.flip.current?.side === "front" && c.flip.current.progress < 0.01,
          () => c.flip.current?.progress,
        );
      },
    ],
    [
      "D01 interruption: reversing mid-flip continues from the current angle",
      async () => {
        const flip = c.flip.current;
        flip.flip("back");
        await frames(4);
        const mid = flip.progress;
        check(mid > 0 && mid < 1, `mid ${mid}`);
        flip.flip("front");
        await frame();
        check(Math.abs(flip.progress - mid) < 0.25, "no jump");
        await until(
          "settled",
          () => flip.progress < 0.01,
          () => flip.progress,
        );
      },
    ],
    [
      "D02 cube: two faces in 3D during the transition, one interactive panel, no page overflow",
      async () => {
        const root = byId("d02-cube");
        reveal(root);
        const cube = c.cube.current;
        const start = cube.index;
        byId(`d02-action-${start + 1}`).focus();
        cube.next();
        await frames(4);
        const panels = [...root.children] as HTMLElement[];
        const visible = panels.filter((p) => getComputedStyle(p).visibility !== "hidden");
        check(visible.length === 2, `${visible.length} visible faces mid-transition`);
        check(
          visible.every((p) => getComputedStyle(p).transform !== "none"),
          "faces are transformed",
        );
        const active = panels.filter((p) => !p.inert);
        check(active.length === 1, `${active.length} interactive panels`);
        check(
          document.activeElement?.closest("section") === panels[cube.index],
          "focus moved to the incoming panel",
        );
        // No overflow: mid-turn, the projected faces stay inside the cube's own box (the orbit is scaled).
        const box = root.getBoundingClientRect();
        for (const face of visible) {
          const r = face.getBoundingClientRect();
          check(
            r.left >= box.left - 1 &&
              r.right <= box.right + 1 &&
              r.top >= box.top - 1 &&
              r.bottom <= box.bottom + 1,
            `face ${Math.round(r.left)}–${Math.round(r.right)} outside the box ${Math.round(box.left)}–${Math.round(box.right)}`,
          );
        }
        await until(
          "settled",
          () => cube.state !== "running",
          () => cube.state,
        );
        await frames(3);
        check(
          getComputedStyle(panels[cube.index] as HTMLElement).transform === "none",
          "rest pose",
        );
      },
    ],
    [
      "D03 ring: only the front item is focusable; arrow keys rotate; live region announces",
      async () => {
        const root = byId("d03-ring");
        reveal(root);
        const ring = c.ring.current;
        const items = [...root.querySelectorAll("article")] as HTMLElement[];
        check(items.filter((i) => !i.inert).length === 1, "one non-inert item");
        root.focus();
        root.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
        await until(
          "rotated",
          () => ring.index === 1 && Math.abs(ring.angle - 60) < 1,
          () => ring.angle,
        );
        const live = root.querySelector(".neshel-ring-live")?.textContent ?? "";
        check(/Slide 2 of 6/.test(live), `live "${live}"`);
        check(!(items[1] as HTMLElement).inert && (items[0] as HTMLElement).inert, "front moved");
        const front = (items[1] as HTMLElement).getBoundingClientRect();
        const back = (items[4] as HTMLElement).getBoundingClientRect();
        check(front.width >= back.width - 1, "front item not smaller than the back item");
        for (let i = 0; i < 5; i++) ring.previous();
        await until(
          "shortest path",
          () => ring.index === 2 && Math.abs(ring.angle - -240) < 1,
          () => ({ i: ring.index, a: ring.angle }),
        );
        ring.go(0);
        await until(
          "home",
          () => ring.index === 0,
          () => ring.index,
        );
      },
    ],
    [
      "D05 CornerRecede: continuous crease, recede direction, inert ID-free flap, live link (the pointer path is the real-mouse case)",
      async () => {
        const root = byId("d05-root");
        reveal(root);
        await frames(2);
        const surface = byId("d05-surface");
        // Programmatic pose through the same render path as the pointer (the real-mouse case drives the pointer:
        // synthetic hovers race with the real cursor's boundary events after scrolling in WebKit).
        c.corner.current.set("top-right", 1);
        await until(
          "folded",
          () => c.corner.current?.amount > 0.99,
          () => c.corner.current?.amount,
        );
        await frames(2);
        check(c.corner.current.corner === "top-right", c.corner.current.corner);
        const flap = root.querySelector(".neshel-corner-flap") as HTMLElement;
        check(flap && flap.inert && flap.getAttribute("aria-hidden") === "true", "decorative flap");
        check(flap.querySelectorAll("[id]").length === 0, "no duplicated ids");
        const base = polygon(getComputedStyle(surface).clipPath);
        const tri = polygon(flap.style.clipPath);
        // The crease endpoints of the base (2nd and 3rd points for top-right) lie on the flap's crease line.
        const [b1, b2] = [base[1], base[2]] as [[number, number], [number, number]];
        const [f1, , f2] = tri as [[number, number], [number, number], [number, number]];
        check(
          Math.abs(b1[1] - f1[1]) < 0.01 && Math.abs(b1[0] - f1[0]) <= 1,
          `crease start ${b1} vs ${f1}`,
        );
        check(
          Math.abs(b2[0] - f2[0]) < 0.01 && Math.abs(b2[1] - f2[1]) <= 1,
          `crease end ${b2} vs ${f2}`,
        );
        check(
          /rotate3d\(1, 1, 0, \d/.test(flap.style.transform),
          `recede angle ${flap.style.transform}`,
        );
        const link = byId("d05-link");
        link.focus();
        check(document.activeElement === link, "the live link is focusable while folded");
        c.corner.current.set("bottom-left", 1);
        await until(
          "bottom-left (through flat)",
          () => c.corner.current.corner === "bottom-left" && c.corner.current.amount > 0.99,
          () => ({ corner: c.corner.current.corner, amount: c.corner.current.amount }),
        );
        c.corner.current.reset();
        await until(
          "returned",
          () => !root.querySelector(".neshel-corner-flap"),
          () => c.corner.current.amount,
        );
        check(getComputedStyle(surface).clipPath === "none", "clip released at rest");
        link.blur();
      },
    ],
    [
      "D05 vs Tilt3D: the fold leaves the card plane flat while Tilt3D rotates the whole card",
      async () => {
        const tilt = byId("d05-tilt");
        const root = byId("d05-root");
        const t = tilt.getBoundingClientRect();
        dispatchPointer(tilt, "pointerenter", t.right - 4, t.top + 4);
        dispatchPointer(tilt, "pointermove", t.right - 4, t.top + 4);
        c.corner.current.seek("top-right", 1);
        await until(
          "tilted",
          () => getComputedStyle(tilt).transform !== "none",
          () => getComputedStyle(tilt).transform,
        );
        check(
          getComputedStyle(root).transform === "none",
          "CornerRecede never transforms the card",
        );
        dispatchPointer(window, "pointermove", t.right + 400, t.bottom + 400);
        c.corner.current.seek("top-right", 0);
        await frames(3);
      },
    ],
    [
      "D07 glitch: two decorative layers per burst, ≤ 3 slice changes per second, text once",
      async () => {
        const el = byId("d07-text");
        reveal(el);
        const steps0 = getAdvancedDebugInfo().glitchSteps;
        const t0 = performance.now();
        c.glitch.current.play();
        await frames(2);
        const layers = el.querySelectorAll(".neshel-glitch-layer");
        check(layers.length === 2, `${layers.length} layers`);
        check(
          [...layers].every(
            (l) => (l as HTMLElement).inert && l.getAttribute("aria-hidden") === "true",
          ),
          "decorative",
        );
        await until(
          "burst over",
          () => !c.glitch.current.active,
          () => c.glitch.current.active,
          4000,
        );
        const seconds = (performance.now() - t0) / 1000;
        const steps = getAdvancedDebugInfo().glitchSteps - steps0;
        check(
          steps <= Math.ceil(seconds * 3) + 1,
          `${steps} slice changes in ${seconds.toFixed(2)} s`,
        );
        check(el.querySelectorAll(".neshel-glitch-layer").length === 0, "layers removed");
        check((el.textContent ?? "").trim() === "NESHEL SIGNAL", "text once");
      },
    ],
    [
      "D09 floor: decorative clipped layer, running while visible, never intercepts events",
      async () => {
        const host = byId("d09-floor");
        reveal(host);
        c.grid.current.play();
        await until(
          "running",
          () => c.grid.current.state === "running",
          () => c.grid.current.state,
        );
        const layer = host.querySelector(".neshel-grid-floor") as HTMLElement;
        const lines = host.querySelector(".neshel-grid-lines") as HTMLElement;
        check(getComputedStyle(layer).pointerEvents === "none", "pointer-events none");
        check(getComputedStyle(layer).overflow === "hidden", "clipped");
        check(getComputedStyle(lines).animationPlayState === "running", "loop running");
        const r = host.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.bottom - 4);
        check(!hit?.closest(".neshel-grid-floor"), "the floor never receives events");
      },
    ],
    [
      "D11 tilt-shift: backdrop-filter bands with graded masks; content stays readable and selectable",
      async () => {
        const root = byId("d11-root");
        reveal(root);
        const bands = [...root.querySelectorAll(".neshel-tiltshift-band")] as HTMLElement[];
        const mode = c.tilt.current.mode;
        notes().d11Mode = mode;
        check(mode === "backdrop", `mode ${mode} (backdrop-filter expected in this engine)`);
        check(bands.length === 4, `${bands.length} bands`);
        const filter =
          getComputedStyle(bands[0] as HTMLElement).backdropFilter ||
          (
            getComputedStyle(bands[0] as HTMLElement) as unknown as {
              webkitBackdropFilter?: string;
            }
          ).webkitBackdropFilter;
        check(/blur/.test(String(filter)), `band filter ${filter}`);
        const range = byId<HTMLInputElement>("d11-focus");
        const before =
          (bands[0] as HTMLElement).style.maskImage ||
          (bands[0] as HTMLElement).style.webkitMaskImage;
        c.tilt.current.setFocus(0.25);
        await until(
          "focus moved",
          () => Math.abs(c.tilt.current.focus - 0.25) < 0.01,
          () => c.tilt.current.focus,
        );
        const after =
          (bands[0] as HTMLElement).style.maskImage ||
          (bands[0] as HTMLElement).style.webkitMaskImage;
        check(before !== after, "masks follow the focus");
        const text = root.querySelector(".adv-city span") as HTMLElement;
        const hit = document.elementFromPoint(
          text.getBoundingClientRect().left + 4,
          text.getBoundingClientRect().top + 4,
        );
        check(hit === text || text.contains(hit), "content receives events through the overlay");
        c.tilt.current.setFocus(Number(range.value) / 100);
      },
    ],
    [
      "D04 page curl (GPU): real mesh deformation — the start corner lifts away and the page underneath shows",
      async () => {
        requireWebgl2();
        const host = byId("d04-frame");
        reveal(host);
        const curl = c.curl.current;
        await until(
          "gpu ready",
          () => curl.mode === "gpu" && !!host.querySelector("canvas"),
          () => ({ mode: curl.mode, reason: curl.reason }),
        );
        notes().d04 = { mode: curl.mode, support: getGpuSupport() };
        curl.seek(0);
        const flat = curl.probe(0.97, 0.97);
        check(flat && (flat[3] ?? 0) > 200, `flat page painted at the corner ${flat}`);
        curl.seek(0.35);
        const corner = curl.probe(0.97, 0.97);
        check(corner && (corner[3] ?? 255) < 20, `corner lifted away (transparent): ${corner}`);
        const far = curl.probe(0.05, 0.05);
        check(far && (far[3] ?? 0) > 200, `far corner still flat: ${far}`);
        const front = byId("d04-front");
        check(getComputedStyle(front).opacity === "0", "native image covered by the GPU page");
        check(
          byId("d04-under").inert,
          "the page underneath is hidden from AT until the turn completes",
        );
        curl.seek(1);
        await frames(2);
        check(
          front.inert && !byId("d04-under").inert,
          "after the turn only the page underneath is accessible",
        );
        curl.seek(0);
        await frames(2);
      },
    ],
    [
      "D04 page curl (CSS driver): live HTML turns as a rigid page (documented, not deformation)",
      async () => {
        const css = c.curlCss.current;
        check(css.mode === "css", css.mode);
        css.seek(0.5);
        await frames(2);
        const t = getComputedStyle(byId("d04-css-front")).transform;
        check(t !== "none", `rigid transform ${t}`);
        css.seek(0);
        await frames(2);
      },
    ],
    [
      "D06 ripple (GPU): impacts displace real texture coordinates; the clock stops after dissipation",
      async () => {
        requireWebgl2();
        const host = byId("d06-frame");
        reveal(host);
        const ripple = c.ripple.current;
        ripple.seek(0);
        await until(
          "gpu ready",
          () => ripple.mode === "gpu",
          () => ({ mode: ripple.mode, reason: ripple.reason }),
        );
        const points: Array<[number, number]> = [
          [0.3, 0.3],
          [0.5, 0.5],
          [0.7, 0.4],
          [0.4, 0.7],
          [0.6, 0.6],
        ];
        ripple.clear();
        const calm = points.map(([x, y]) => ripple.probe(x, y));
        ripple.seek(0.25);
        const waves = points.map(([x, y]) => ripple.probe(x, y));
        check(
          points.some((_, i) => differs(calm[i], waves[i])),
          "pixels moved under the waves",
        );
        ripple.impact(0.5, 0.5);
        check(ripple.active, "clock running");
        await until(
          "dissipated",
          () => !ripple.active,
          () => ripple.active,
          8000,
        );
      },
    ],
    [
      "D08 displacement map (GPU): the map distorts the image proportionally to the amount",
      async () => {
        requireWebgl2();
        const host = byId("d08-frame");
        reveal(host);
        const fx = c.displace.current;
        fx.set(0);
        await until(
          "gpu ready",
          () => fx.mode === "gpu",
          () => ({ mode: fx.mode, reason: fx.reason }),
        );
        await until(
          "rest",
          () => fx.amount < 0.001,
          () => fx.amount,
        );
        const points: Array<[number, number]> = [
          [0.2, 0.2],
          [0.5, 0.5],
          [0.8, 0.3],
          [0.3, 0.8],
        ];
        const rest = points.map(([x, y]) => fx.probe(x, y));
        fx.set(1);
        await until(
          "full",
          () => fx.amount > 0.99,
          () => fx.amount,
        );
        const full = points.map(([x, y]) => fx.probe(x, y));
        check(
          points.some((_, i) => differs(rest[i], full[i])),
          "displaced pixels",
        );
        fx.set(0);
        await until(
          "back",
          () => fx.amount < 0.01,
          () => fx.amount,
        );
      },
    ],
    [
      "D10 depth parallax (GPU): the pose shifts near pixels against far ones from the explicit depth map",
      async () => {
        requireWebgl2();
        const host = byId("d10-frame");
        reveal(host);
        const fx = c.depth.current;
        await until(
          "gpu ready",
          () => fx.mode === "gpu",
          () => ({ mode: fx.mode, reason: fx.reason }),
        );
        // A row across the raised disc: the 1 px grid lines (high contrast) move with the near depth.
        const points: Array<[number, number]> = Array.from({ length: 64 }, (_, i) => [
          0.2 + (i / 63) * 0.6,
          0.55,
        ]);
        fx.seek(0);
        const left = points.map(([x, y]) => fx.probe(x, y));
        fx.seek(1);
        const right = points.map(([x, y]) => fx.probe(x, y));
        check(
          points.some((_, i) => differs(left[i], right[i])),
          "parallax moved pixels",
        );
        check(
          byId("d10-img").getAttribute("alt") === "Teal landscape with a raised disc",
          "image semantics kept",
        );
        fx.seek(0.5);
      },
    ],
    [
      "GPU context loss: the native image returns while lost; restore rebuilds and draws again",
      async () => {
        requireWebgl2();
        const host = byId("d10-frame");
        const fx = c.depth.current;
        const canvas = host.querySelector("canvas") as HTMLCanvasElement;
        const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
        const ext = gl.getExtension("WEBGL_lose_context");
        check(ext, "WEBGL_lose_context available");
        ext?.loseContext();
        await until(
          "lost",
          () => fx.mode === "static" && fx.reason === "lost",
          () => ({ mode: fx.mode, reason: fx.reason }),
        );
        check(getComputedStyle(byId("d10-img")).opacity === "1", "image visible while lost");
        ext?.restoreContext();
        await until(
          "restored",
          () => fx.mode === "gpu",
          () => ({ mode: fx.mode, reason: fx.reason }),
          8000,
        );
        await until(
          "image covered again",
          () => getComputedStyle(byId("d10-img")).opacity === "0",
          () => getComputedStyle(byId("d10-img")).opacity,
        );
      },
    ],
    [
      "GPU fallback rows (separate): no WebGL2 or a failed shader keeps the native image (never the main effect)",
      async () => {
        const make = () => {
          const frameEl = document.createElement("div");
          frameEl.className = "neshel-gpu-frame";
          frameEl.style.width = "120px";
          const img = document.createElement("img");
          img.alt = "Fallback probe";
          img.src = labState().advanced?.images.displace;
          frameEl.append(img);
          byId("d08").append(frameEl);
          return { frameEl, img };
        };
        const contexts = getGpuDebugInfo().contexts;
        const realWebgl2 = getGpuSupport().webgl2; // before any simulation
        try {
          configureGpu({ simulate: { unsupported: true } });
          const a = make();
          await until(
            "img",
            () => a.img.complete && a.img.naturalWidth > 0,
            () => a.img.complete,
          );
          const fa = createDisplacementHover(a.frameEl);
          fa.set(1);
          await until(
            "unsupported",
            () => fa.reason === "unsupported",
            () => fa.reason,
          );
          check(
            getComputedStyle(a.img).opacity === "1" && !a.frameEl.querySelector("canvas"),
            "image kept",
          );
          fa.destroy();
          a.frameEl.remove();
          if (!realWebgl2)
            throw new Error("NO_WEBGL2: the shader half needs WebGL2 (the unsupported half ran)");
          configureGpu({ simulate: { unsupported: false, shaderFailure: true } });
          const b = make();
          await until(
            "img",
            () => b.img.complete && b.img.naturalWidth > 0,
            () => b.img.complete,
          );
          const fb = createDisplacementHover(b.frameEl);
          fb.set(1);
          await until(
            "shader",
            () => fb.reason === "shader",
            () => fb.reason,
          );
          check(getComputedStyle(b.img).opacity === "1", "image kept after a shader failure");
          fb.destroy();
          b.frameEl.remove();
        } finally {
          configureGpu({ simulate: { unsupported: false, shaderFailure: false } });
        }
        await frames(2);
        check(getGpuDebugInfo().contexts === contexts, "no context leaked by the fallback rows");
      },
    ],
    [
      "cleanup: temporary effects leave no task, flap, layer or context behind",
      async () => {
        const base = { ...getAdvancedDebugInfo() };
        const box = document.createElement("div");
        box.className = "neshel-corner";
        box.innerHTML = '<div style="width:120px;height:80px;background:#334155">x</div>';
        byId("d05").append(box);
        const cr = createCornerRecede(box);
        cr.seek("top-left", 1);
        const span = document.createElement("span");
        span.textContent = "temp";
        byId("d07").append(span);
        const gl = createGlitch(span, { trigger: "manual" });
        gl.play();
        await frames(3);
        cr.destroy();
        gl.destroy();
        box.remove();
        span.remove();
        await frames(3);
        const now = getAdvancedDebugInfo();
        check(
          now.flaps === base.flaps && now.glitchLayers === base.glitchLayers,
          JSON.stringify(now),
        );
        check(now.effects === base.effects, "effects back to the baseline");
        check(getFrameScheduler().size >= 0, "scheduler alive");
      },
    ],
  ]);
}

/** Reduced-motion facts (fresh page with `prefers-reduced-motion: reduce`). */
export async function advancedReducedFacts(): Promise<Record<string, unknown>> {
  const c = controls();
  await frames(3);
  c.glitch.current.play();
  c.ripple.current.impact();
  await frames(3);
  return {
    flipMode: c.flip.current?.mode,
    glitchActive: c.glitch.current?.active,
    gridState: c.grid.current?.state,
    rippleActive: c.ripple.current?.active,
    rippleMode: c.ripple.current?.mode,
    depthMode: c.depth.current?.mode,
    curlMode: c.curl.current?.mode,
    floorRunning: !!document.querySelector('.neshel-grid-floor[data-neshel-grid="running"]'),
  };
}
