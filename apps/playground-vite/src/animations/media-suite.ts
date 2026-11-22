// In-page checks of the Phase 015 gallery in a real layout engine, shared by the CDP check (Chrome) and the
// Playwright check (Chromium, Firefox, WebKit). Decided by observable conditions with ceilings, never by fixed
// sleeps. Capabilities an engine lacks are recorded as notes (native vs fallback), not failures.
import { getAmbientDebugInfo } from "@neshel-ui/animations/ambient";
import { getFrameScheduler } from "@neshel-ui/animations/core";
import { getMediaDebugInfo, getMediaSupport } from "@neshel-ui/animations/media";
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
const css = (element: Element, name: string, pseudo?: string) =>
  getComputedStyle(element, pseudo).getPropertyValue(name).trim();
const notes = () => labState().notes;
const api = () => {
  const media = labState().media;
  if (!media) throw new Error("media gallery not mounted");
  return media;
};
function reveal(element: Element) {
  element.scrollIntoView({ block: "center" });
}
function dispatchPointer(
  target: EventTarget,
  type: string,
  x: number,
  y: number,
  extra: PointerEventInit = {},
) {
  target.dispatchEvent(
    new PointerEvent(type, {
      clientX: x,
      clientY: y,
      pointerType: "mouse",
      pointerId: 1,
      button: 0,
      bubbles: type !== "pointerenter" && type !== "pointerleave",
      ...extra,
    }),
  );
}
/** Non-transparent pixels on a canvas (CORS-clean package canvases only). */
function paintedPixels(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width === 0) return 0;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let count = 0;
  for (let i = 3; i < data.length; i += 16) if ((data[i] as number) > 0) count++;
  return count;
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

export async function runMediaSuite(): Promise<Case[]> {
  notes().mediaSupport = getMediaSupport();
  return runCases([
    [
      "M02 an image already loaded is never hidden; a broken image stays visible with its alt text",
      async () => {
        const cached = byId<HTMLImageElement>("m02-cached");
        reveal(cached);
        await until(
          "cached shown",
          () => css(cached, "opacity") === "1",
          () => css(cached, "opacity"),
        );
        const broken = byId<HTMLImageElement>("m02-broken");
        await until(
          "broken visible",
          () =>
            broken.complete &&
            css(broken, "opacity") === "1" &&
            !broken.parentElement?.querySelector(".neshel-blurup-layer"),
          () => ({ opacity: css(broken, "opacity"), complete: broken.complete }),
        );
        check(broken.getAttribute("alt")?.startsWith("Unavailable"), "alt kept");
      },
    ],
    [
      "M02/M03 a deferred image is hidden only while loading, then revealed after decode; attributes untouched",
      async () => {
        // Fresh, still-loading instances (the gallery's first ones were revealed by the 8 s revealTimeout).
        api().remountDeferred();
        await frames(3);
        const img = byId<HTMLImageElement>("m02-deferred");
        const m03 = byId<HTMLImageElement>("m03-img");
        reveal(img);
        await frames(2);
        check(css(img, "opacity") === "0", `hidden while loading: ${css(img, "opacity")}`);
        check(
          img.parentElement?.querySelector(".neshel-blurup-layer")?.getAttribute("aria-hidden") ===
            "true",
          "placeholder layer",
        );
        check(/inset\(100%/.test(m03.style.clipPath), `M03 clipped: ${m03.style.clipPath}`);
        api().loadDeferred();
        await until(
          "revealed",
          () =>
            css(img, "opacity") === "1" &&
            !img.parentElement?.querySelector(".neshel-blurup-layer") &&
            (m03.style.clipPath === "" || m03.style.clipPath === "none"),
          () => ({ opacity: css(img, "opacity"), clip: m03.style.clipPath, state: img.complete }),
        );
        check(
          img.getAttribute("width") === "320" &&
            img.getAttribute("alt") === "Warm gradient, loaded on demand",
          "native attributes",
        );
      },
    ],
    [
      "M01 Ken Burns stays inside its frame (no edge uncovered, uniform scale) and leaves no task at rest",
      async () => {
        const frameEl = byId("m01").querySelector(".neshel-kenburns") as HTMLElement;
        const img = frameEl.querySelector("img") as HTMLImageElement;
        reveal(frameEl);
        api().kenBurns()?.seek(1);
        await frames(2);
        const f = frameEl.getBoundingClientRect();
        const r = img.getBoundingClientRect();
        check(
          r.left <= f.left + 0.5 &&
            r.top <= f.top + 0.5 &&
            r.right >= f.right - 0.5 &&
            r.bottom >= f.bottom - 0.5,
          `image covers the frame: ${JSON.stringify({ f, r })}`,
        );
        check(["hidden", "clip"].includes(css(frameEl, "overflow-x")), "frame clips");
        check(css(img, "scale") === "1.18", `uniform scale ${css(img, "scale")}`);
        api().kenBurns()?.seek(0);
        await until(
          "idle",
          () => getFrameScheduler().size === 0,
          () => getFrameScheduler().size,
        );
      },
    ],
    [
      "M04 pointer press and drag move the divider; the after layer clip follows; native range value in sync",
      async () => {
        const root = byId("m04-frame");
        reveal(root);
        await frames(1);
        const rect = root.getBoundingClientRect();
        const input = root.querySelector("input") as HTMLInputElement;
        dispatchPointer(root, "pointerdown", rect.left + rect.width * 0.25, rect.top + 10);
        dispatchPointer(root, "pointerup", rect.left + rect.width * 0.25, rect.top + 10);
        await frames(2);
        check(Math.abs(Number(input.value) - 25) <= 1, `value ${input.value}`);
        const after = root.querySelector("[data-neshel-compare-after]") as HTMLElement;
        check(
          /inset\(0(px)? 0(px)? 0(px)? 2[45]/.test(css(after, "clip-path")),
          `clip ${css(after, "clip-path")}`,
        );
        check(css(root, "touch-action") === "pan-y", `touch-action ${css(root, "touch-action")}`);
        check(input.getAttribute("aria-valuetext")?.includes("% before"), "value text");
        const jump = root.parentElement?.querySelector(
          ".neshel-compare-jumps button",
        ) as HTMLButtonElement;
        jump.click();
        await frames(1);
        check(input.value === "100", `jump to before: ${input.value}`);
      },
    ],
    [
      "M05 duotone applies through the filter channel and leaves the image untouched",
      async () => {
        const img = byId<HTMLImageElement>("m05-img");
        reveal(img);
        const src = img.getAttribute("src");
        api().duotone()?.seek(1);
        await frames(2);
        const filter = css(img, "filter");
        notes().m05Filter = filter.startsWith("url") ? "svg-filter" : filter;
        check(/url\(|grayscale/.test(filter), `filter ${filter}`);
        check(img.getAttribute("src") === src, "image source untouched");
        api().duotone()?.seek(0);
        await frames(2);
        check(css(img, "filter") === "none", "no filter at 0");
      },
    ],
    [
      "M06 video scrub: metadata, a fast burst coalesced to few seeks, target reached, never played",
      async () => {
        const video = byId<HTMLVideoElement>("m06-video");
        reveal(video);
        const playable = video.canPlayType("video/webm") || video.canPlayType("video/mp4");
        notes().m06 = {
          webm: video.canPlayType("video/webm"),
          mp4: video.canPlayType("video/mp4"),
        };
        if (!playable) {
          (notes().m06 as Record<string, unknown>).skipped = "no decodable source in this engine";
          return;
        }
        try {
          await until(
            "metadata",
            () => video.readyState >= 1 && Number.isFinite(video.duration),
            () => video.readyState,
            8000,
          );
        } catch (error) {
          (notes().m06 as Record<string, unknown>).skipped =
            `metadata not loaded: ${String((error as Error).message).slice(0, 80)}`;
          return;
        }
        const before = getMediaDebugInfo();
        for (let i = 0; i <= 60; i++) api().scrub(i / 120);
        await until(
          "target",
          () => !video.seeking && Math.abs(video.currentTime - video.duration * 0.5) < 0.1,
          () => ({ t: video.currentTime, d: video.duration, seeking: video.seeking }),
          8000,
        );
        const after = getMediaDebugInfo();
        const issued = after.seeksIssued - before.seeksIssued;
        (notes().m06 as Record<string, unknown>).burst = {
          requested: after.seeksRequested - before.seeksRequested,
          issued,
        };
        check(issued <= 8, `issued ${issued} seeks for 61 requests`);
        check(video.paused, "never played");
      },
    ],
    [
      "M07 lightbox: native modal dialog, close focused, scroll locked, FLIP; close restores focus and scroll",
      async () => {
        const trigger = byId("m07-thumb").closest("button") as HTMLButtonElement;
        reveal(trigger);
        trigger.focus();
        trigger.click();
        const dialog = trigger.parentElement?.querySelector("dialog") as HTMLDialogElement;
        await until(
          "open",
          () => dialog.open && dialog.getAttribute("data-state") === "open",
          () => dialog.outerHTML.slice(0, 120),
        );
        check(dialog.matches(":modal"), "showModal (top layer, inert background)");
        check(
          document.activeElement === dialog.querySelector("[data-neshel-lightbox-close]"),
          "close focused",
        );
        check(
          css(document.documentElement, "overflow-y") === "hidden" ||
            css(document.documentElement, "overflow") === "hidden",
          "scroll locked",
        );
        (dialog.querySelector("[data-neshel-lightbox-close]") as HTMLButtonElement).click();
        await until(
          "closed",
          () => !dialog.open,
          () => dialog.getAttribute("data-state"),
        );
        check(
          document.activeElement === trigger,
          `focus back: ${document.activeElement?.outerHTML.slice(0, 60)}`,
        );
        check(document.documentElement.style.overflow === "", "scroll unlocked");
      },
    ],
    [
      "M08 cross-fade: only the active slide is exposed; inactive slides inert; opacities settle",
      async () => {
        const stack = byId("m08-stack");
        reveal(stack);
        byId("m08-next").click();
        await until(
          "settled",
          () =>
            css(stack.children[1] as Element, "opacity") === "1" &&
            css(stack.children[0] as Element, "opacity") === "0",
          () => [...stack.children].map((c) => css(c, "opacity")),
        );
        check(
          !(stack.children[1] as HTMLElement).inert && (stack.children[0] as HTMLElement).inert,
          "inert inactive slides",
        );
        check(stack.children[2]?.getAttribute("aria-hidden") === "true", "hidden from AT");
      },
    ],
    [
      "M09 pixel dissolve: real cells painted on a decorative canvas, released at the end (fallback noted)",
      async () => {
        const stack = byId("m09-stack");
        reveal(stack);
        await frames(2);
        byId("m09-toggle").click();
        await frames(4);
        const canvas = stack.querySelector("canvas") as HTMLCanvasElement | null;
        notes().m09 = canvas ? "dissolve" : "fade";
        if (canvas) {
          check(
            canvas.getAttribute("aria-hidden") === "true" &&
              css(canvas, "pointer-events") === "none",
            "decorative",
          );
          const painted = paintedPixels(canvas);
          check(painted > 0, "cells painted mid-transition");
        }
        await until(
          "released",
          () =>
            !stack.querySelector("canvas") && css(stack.children[1] as Element, "opacity") === "1",
          () => !!stack.querySelector("canvas"),
        );
      },
    ],
    [
      "M10 hover pan follows the pointer within bounds and returns on leave",
      async () => {
        const frameEl = byId("m10-frame");
        reveal(frameEl);
        await frames(1);
        const r = frameEl.getBoundingClientRect();
        const img = frameEl.querySelector("img") as HTMLImageElement;
        dispatchPointer(frameEl, "pointerenter", r.right - 1, r.top + r.height / 2);
        dispatchPointer(frameEl, "pointermove", r.right - 1, r.top + r.height / 2);
        await until(
          "panned",
          () => img.style.translate.startsWith("-"),
          () => img.style.translate,
        );
        const ir = img.getBoundingClientRect();
        check(ir.right >= r.right - 0.5 && ir.left <= r.left + 0.5, "still covers the frame");
        dispatchPointer(window, "pointermove", r.right + 400, r.bottom + 400);
        await until(
          "rest",
          () => img.style.scale === "",
          () => img.style.scale,
        );
      },
    ],
    [
      "B01–B10 decorative layers: aria-hidden, no hit testing, running only while allowed; canvases painted",
      async () => {
        api().replayAmbient();
        for (const id of ["b01", "b02", "b03", "b06", "b07", "b10"]) {
          const layer = byId(id).querySelector(".neshel-ambient-layer") as HTMLElement;
          check(layer?.getAttribute("aria-hidden") === "true", `${id} aria-hidden`);
          check(css(layer, "pointer-events") === "none", `${id} pointer-events`);
        }
        const b01 = byId("b01");
        reveal(b01);
        const part = b01.querySelector(".neshel-ambient-part") as HTMLElement;
        await until(
          "b01 running",
          () => css(part, "animation-play-state") === "running",
          () => css(part, "animation-play-state"),
        );
        check(css(part, "animation-name") === "neshel-gradient-shift", css(part, "animation-name"));
        const grain = byId("b03").querySelector(".neshel-grain-plane") as HTMLElement;
        check(
          css(grain, "background-image").includes("data:image/svg+xml"),
          "shared static grain texture",
        );
        const b04 = byId("b04");
        reveal(b04);
        const canvas = b04.querySelector("canvas") as HTMLCanvasElement;
        await until(
          "particles painted",
          () => paintedPixels(canvas) > 0,
          () => canvas.width,
        );
        const r = b04.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width - 8, r.top + r.height - 8);
        check(hit !== canvas, "the canvas never intercepts the pointer");
        const b05 = byId("b05");
        reveal(b05);
        const stars = b05.querySelector("canvas") as HTMLCanvasElement;
        await until(
          "stars painted",
          () => paintedPixels(stars) > 0,
          () => stars.width,
        );
        const shape = byId("b08").querySelector(".lab-shape") as HTMLElement;
        reveal(shape);
        await until(
          "floating",
          () => shape.style.transform.includes("translate"),
          () => shape.style.transform,
        );
      },
    ],
    [
      "Ambient page toggle pauses every effect (zero canvas tasks, CSS paused) and resumes; no React commits per frame",
      async () => {
        api().replayAmbient();
        const b04 = byId("b04");
        reveal(b04);
        await until(
          "ticking",
          () => getAmbientDebugInfo().ticking > 0,
          () => getAmbientDebugInfo(),
        );
        const commits = labState().media?.commits?.() ?? 0;
        await frames(20);
        check(
          (labState().media?.commits?.() ?? 0) === commits,
          "no React commit during ambient playback",
        );
        const toggle = byId<HTMLButtonElement>("b-toggle");
        toggle.click();
        await frames(2);
        check(toggle.getAttribute("aria-pressed") === "true", "toggle pressed");
        check(getAmbientDebugInfo().ticking === 0, `ticking ${getAmbientDebugInfo().ticking}`);
        const part = byId("b01").querySelector(".neshel-ambient-part") as HTMLElement;
        check(css(part, "animation-play-state") === "paused", "CSS layers paused");
        toggle.click();
        await until(
          "resumed",
          () => getAmbientDebugInfo().ticking > 0,
          () => getAmbientDebugInfo(),
        );
      },
    ],
    [
      "Ambient off-screen: an effect scrolled out of view holds no task; back in view it resumes",
      async () => {
        api().replayAmbient();
        const b04 = byId("b04");
        reveal(b04);
        await until(
          "ticking",
          () => getAmbientDebugInfo().ticking > 0,
          () => getAmbientDebugInfo(),
        );
        window.scrollTo(0, 0);
        await until(
          "paused off-screen",
          () => getAmbientDebugInfo().ticking === 0,
          () => getAmbientDebugInfo(),
        );
        reveal(b04);
        await until(
          "resumed",
          () => getAmbientDebugInfo().ticking > 0,
          () => getAmbientDebugInfo(),
        );
      },
    ],
    [
      "B09 pointer glow follows the pointer on its layer; hidden at rest",
      async () => {
        const b09 = byId("b09");
        reveal(b09);
        api().ambient().b09?.play();
        await frames(1);
        const r = b09.getBoundingClientRect();
        dispatchPointer(b09, "pointerenter", r.left + 40, r.top + 30);
        dispatchPointer(b09, "pointermove", r.left + 50, r.top + 30);
        const layer = b09.querySelector(".neshel-pointer-glow") as HTMLElement;
        await until(
          "glow",
          () =>
            layer.style.getPropertyValue("--neshel-glow-x") !== "" &&
            layer.hasAttribute("data-active"),
          () => layer.getAttribute("style"),
        );
        dispatchPointer(window, "pointermove", r.right + 500, r.bottom + 500);
        await until(
          "rest",
          () => !layer.hasAttribute("data-active"),
          () => layer.outerHTML.slice(0, 80),
        );
      },
    ],
    [
      "F01/F03/F04/F09 indicators: progressbar roles and names; values only when known",
      async () => {
        check(byId("f01-spinner").getAttribute("role") === "progressbar", "spinner role");
        check(byId("f01-spinner").getAttribute("aria-label") === "Loading results", "spinner name");
        check(
          !byId("f03-indeterminate").hasAttribute("aria-valuenow"),
          "indeterminate has no value",
        );
        check(byId("f03-known").getAttribute("aria-valuenow") === "40", "known value");
        byId("f03-more").click();
        await until(
          "value",
          () => byId("f03-known").getAttribute("aria-valuenow") === "60",
          () => byId("f03-known").getAttribute("aria-valuenow"),
        );
        check(!byId("f04-dots").hasAttribute("aria-valuenow"), "dots indeterminate");
        api().ring(0.5);
        await until(
          "ring",
          () => byId("f09-ring").getAttribute("aria-valuenow") === "50",
          () => byId("f09-ring").getAttribute("aria-valuenow"),
        );
        const ring = css(byId("f01-spinner").firstElementChild as Element, "animation-name");
        check(ring === "neshel-fb-spin", `spinner animation ${ring}`);
      },
    ],
    [
      "F02/F10 skeleton hidden from AT with a shimmer layer; pending text stays one text",
      async () => {
        check(byId("f02-skeleton").getAttribute("aria-hidden") === "true", "skeleton hidden");
        check(byId("f02-token").getAttribute("data-neshel-fx") === "shimmer", "token on the child");
        check(css(byId("f02-token"), "content", "::after") !== "none", "shimmer layer");
        const text = byId("f10-text");
        check(
          text.childNodes.length === 1 && text.textContent === "Saving your changes",
          "one text node",
        );
        notes().f10Clip = css(text, "background-clip") || css(text, "-webkit-background-clip");
      },
    ],
    [
      "F05 success mark is drawn on demand and never announces by itself",
      async () => {
        const mark = byId("f05-mark");
        check(mark.getAttribute("aria-hidden") === "true", "decorative");
        byId("f05-show").click();
        const path = mark.querySelector(".neshel-success-path") as SVGPathElement;
        await until(
          "drawn",
          () => Number.parseFloat(css(path, "stroke-dashoffset")) === 0,
          () => css(path, "stroke-dashoffset"),
        );
        check(!mark.closest("[aria-live]"), "not in a live region");
        byId("f05-show").click();
      },
    ],
    [
      "F06 toasts: regions exist before content; announced once; enter/exit; close button removes",
      async () => {
        const region = byId("f06").querySelector("section.neshel-toaster") as HTMLElement;
        const polite = region.querySelector('[role="status"]') as HTMLElement;
        check(polite && region.querySelector('[role="alert"]'), "live regions present");
        byId("f06-show").click();
        await until(
          "open",
          () => region.querySelector('.neshel-toast[data-state="open"]') !== null,
          () => region.innerHTML.slice(0, 200),
        );
        check(polite.textContent?.includes("Draft saved"), "announced");
        const count = polite.querySelectorAll("p").length;
        await frames(10);
        check(polite.querySelectorAll("p").length === count, "no repeated announcement");
        (region.querySelector(".neshel-toast-close") as HTMLButtonElement).click();
        await until(
          "removed",
          () => region.querySelectorAll(".neshel-toast").length === 0,
          () => region.querySelectorAll(".neshel-toast").length,
        );
      },
    ],
    [
      "F07 loading button keeps focus and name and blocks a second activation",
      async () => {
        const button = byId<HTMLButtonElement>("f07-button");
        reveal(button);
        const paid = api().paid();
        button.focus();
        button.click();
        await until(
          "loading",
          () => button.getAttribute("aria-disabled") === "true",
          () => button.outerHTML,
        );
        button.click();
        await frames(2);
        check(api().paid() === paid + 1, `activated once: ${api().paid() - paid}`);
        check(document.activeElement === button, "focus kept");
        check(button.textContent === "Pay now", "name unchanged");
        check(css(button, "content", "::after") !== "none", "spinner layer");
        await until(
          "done",
          () => !button.hasAttribute("aria-disabled"),
          () => button.outerHTML,
          4000,
        );
      },
    ],
    [
      "F08 optimistic pending is busy; failure is distinct and rolls back",
      async () => {
        const like = byId("f08-like");
        const rollbacks = api().rollbacks();
        like.click();
        await until(
          "pending",
          () => like.getAttribute("aria-busy") === "true",
          () => like.outerHTML,
        );
        byId("f08-fail").click();
        await until(
          "failed",
          () => like.getAttribute("data-neshel-optimistic") === "failed",
          () => like.outerHTML,
        );
        check(api().rollbacks() === rollbacks + 1, "rollback called");
        check(!like.hasAttribute("aria-busy"), "not busy after failure");
        api().setStatus("idle");
      },
    ],
  ]);
}

/** Facts under emulated `prefers-reduced-motion: reduce` (the checks switch the media feature live). */
export async function mediaReducedFacts(): Promise<Record<string, unknown>> {
  const media = api();
  media.replayAmbient();
  media.kenBurns()?.play();
  await frames(6);
  const part = byId("b01").querySelector(".neshel-ambient-part") as HTMLElement | null;
  const spinner = byId("f01-spinner").firstElementChild as HTMLElement;
  const kb = byId("m01").querySelector("img") as HTMLImageElement;
  return {
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    ambientLayer: part?.parentElement?.getAttribute("data-neshel-ambient"),
    ambientAnimation: part ? css(part, "animation-name") : "missing",
    canvasTasks: getAmbientDebugInfo().ticking,
    spinnerAnimation: css(spinner, "animation-name"),
    spinnerDuration: css(spinner, "animation-duration"),
    kenBurnsScale: kb.style.scale,
  };
}

// --- Performance matrix (performance-matrix-015.md): observations, never a pass/fail gate -----------------

type Stats = { mean: number; p95: number; max: number };
function stats(values: number[]): Stats {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, v) => sum + v, 0) / Math.max(1, sorted.length);
  const pick = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
  const round = (n: number) => Math.round(n * 100) / 100;
  return { mean: round(mean), p95: round(pick(0.95)), max: round(sorted.at(-1) ?? 0) };
}
async function intervals(count: number): Promise<Stats> {
  const out: number[] = [];
  let last = await new Promise<number>((r) => requestAnimationFrame(r));
  for (let i = 0; i < count; i++) {
    const now = await new Promise<number>((r) => requestAnimationFrame(r));
    out.push(now - last);
    last = now;
  }
  return stats(out.slice(5));
}

/** P1–P13: initialisation (create → first frame) and sustained frame intervals against a static baseline. */
export async function benchMediaAmbient(config: {
  frames: number;
}): Promise<Record<string, unknown>> {
  const ambient = await import("@neshel-ui/animations/ambient");
  const media = await import("@neshel-ui/animations/media");
  const feedback = await import("@neshel-ui/animations/feedback");
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:0;top:0;width:1600px;height:900px;z-index:10;pointer-events:none";
  document.body.appendChild(host);
  window.scrollTo(0, 0);
  const box = (w: number, h: number, bg = "#0b1020") => {
    const el = document.createElement("div");
    el.className = "neshel-ambient";
    el.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;background:${bg};color:#cbd5ff;overflow:hidden`;
    host.appendChild(el);
    return el;
  };
  const results: Record<string, unknown> = {};
  const run = async (name: string, setup: () => Array<{ destroy(): void }>) => {
    const t0 = performance.now();
    const controls = setup();
    const createMs = performance.now() - t0;
    await frame();
    const initMs = performance.now() - t0;
    const before = getAmbientDebugInfo();
    const sustained = await intervals(config.frames);
    const after = getAmbientDebugInfo();
    results[name] = {
      createMs: Math.round(createMs * 100) / 100,
      initMs: Math.round(initMs * 100) / 100,
      sustained,
      ticking: after.ticking,
      draws: after.draws - before.draws,
      surfaces: after.surfaces,
      observers: after.observers,
      visibilityListeners: after.visibilityListeners,
    };
    for (const c of controls) c.destroy();
    host.replaceChildren();
    await frames(3);
  };
  const long = { duration: 600000, lowPower: false as const };
  results.P1_baseline = { sustained: await intervals(config.frames) };
  for (const n of [60, 120, 400])
    await run(`P5_particles_${n}`, () => [
      ambient.createParticles(box(1600, 900), { ...long, max: n, density: 40 }),
    ]);
  for (const n of [360, 800])
    await run(`P6_starfield_${n}`, () => [
      ambient.createStarfield(box(1600, 900), { ...long, max: n, density: 80 }),
    ]);
  for (const [w, h] of [
    [400, 300],
    [1600, 900],
  ] as const) {
    await run(`P7_aurora_${w}x${h}`, () => [ambient.createAurora(box(w, h), { duration: 600000 })]);
    await run(`P7_mesh_${w}x${h}`, () => [
      ambient.createMeshGradient(box(w, h), { duration: 600000 }),
    ]);
  }
  await run("P8_five_ambient", () => [
    ambient.createParticles(box(800, 450), long),
    ambient.createStarfield(box(800, 450), long),
    ambient.createAurora(box(800, 450), { duration: 600000 }),
    ambient.createGrain(box(800, 450), { jitter: true, duration: 600000 }),
    ambient.createWaves(box(800, 450), { duration: 600000 }),
  ]);
  await run("P10_hidden_offscreen", () => {
    const el = box(800, 450);
    el.style.top = "5000px"; // outside the viewport (fixed host): the shared observer pauses it
    return [ambient.createParticles(el, long)];
  });
  // P13: a dissolve of two generated 1600×900 pictures at 16 px cells (5 625 cells).
  const pic = (labState().media?.pictures?.a as string) ?? "";
  const stack = box(1600, 900, "#000");
  stack.className = "neshel-crossfade";
  for (let i = 0; i < 2; i++) {
    const img = document.createElement("img");
    img.src = pic;
    img.alt = "";
    stack.appendChild(img);
  }
  await until(
    "pictures",
    () => [...stack.querySelectorAll("img")].every((i) => i.complete),
    () => "decode",
  );
  const dissolve = media.createPixelDissolve(stack, { duration: 1000, cell: 16 });
  const cellsBefore = getMediaDebugInfo().cells;
  const t0 = performance.now();
  dissolve.show(1);
  const showMs = performance.now() - t0; // synchronous start: shuffle + surface creation
  const dissolveFrames = await intervals(50);
  results.P13_dissolve_1600x900_16px = {
    mode: dissolve.mode,
    showMs: Math.round(showMs * 100) / 100,
    cells: getMediaDebugInfo().cells - cellsBefore,
    sustained: dissolveFrames,
  };
  dissolve.destroy();
  host.replaceChildren();
  // P9: six toasts (store only, motion is CSS) — store cost per show.
  const toaster = feedback.createToaster({ max: 6 });
  const s0 = performance.now();
  for (let i = 0; i < 6; i++) toaster.show({ title: `Toast ${i}` });
  results.P9_toaster_store_6_shows_ms = Math.round((performance.now() - s0) * 1000) / 1000;
  toaster.destroy();
  host.remove();
  results.afterCleanup = { ...getAmbientDebugInfo(), media: getMediaDebugInfo() };
  return results;
}
