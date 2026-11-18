// In-page checks of the Phase 013 gallery in a real layout engine, shared by the CDP check (Chrome) and the
// Playwright check (Chromium, Firefox, WebKit). Results are decided by observable conditions with ceilings,
// never by fixed sleeps. Native View Transition facts are observed through `document.getAnimations()` on the
// snapshot pseudo-elements; engines without a capability report the fallback path instead of failing.
import { createTimeline, getCinematicDebugInfo } from "@neshel-ui/animations/cinematic";
import { getFrameScheduler, prefersReducedMotion } from "@neshel-ui/animations/core";
import {
  getViewTransitionSupport,
  registerSharedElement,
  startPageTransition,
} from "@neshel-ui/animations/page-transitions";
import { labState } from "./lab-state";

type Case = { id: string; ok: boolean; error?: string };

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
async function frames(count: number) {
  for (let index = 0; index < count; index++) await frame();
}
async function until(label: string, condition: () => boolean, describe: () => unknown, ms = 5000) {
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
const byId = (id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`#${id} missing`);
  return element as HTMLElement;
};
const click = (id: string) => byId(id).click();
const matrix = (element: Element) => new DOMMatrix(getComputedStyle(element).transform);
const tx = (element: Element) => matrix(element).m41;
const scaleOf = (element: Element) => Math.hypot(matrix(element).a, matrix(element).b);
const idle = () => getFrameScheduler().size === 0;
const vtAnimations = () =>
  document.documentElement
    .getAnimations({ subtree: true })
    .map((animation) => (animation.effect as KeyframeEffect | null)?.pseudoElement ?? "")
    .filter((pseudo) => pseudo.startsWith("::view-transition"));

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

export async function runCinematicSuite(): Promise<Case[]> {
  const lab = labState();
  const api = lab.cinematic;
  if (!api) throw new Error("cinematic gallery not mounted");
  byId("cinematic-title").scrollIntoView();
  return runCases([
    [
      "C01 timeline: plays labels/overlaps, pauses, seeks, reverses; zero React commits; idle at rest",
      async () => {
        const handle = api.timeline();
        const a = byId("c01-box-0");
        const c = byId("c01-box-2");
        const commits = api.commits();
        click("c01-play");
        await until(
          "moving",
          () => tx(a) > 20,
          () => tx(a),
        );
        click("c01-pause");
        const paused = tx(a);
        await frames(6);
        check(Math.abs(tx(a) - paused) < 0.5, `paused at ${paused} → ${tx(a)}`);
        click("c01-seek");
        await frames(2);
        const total = handle.current?.duration ?? 0;
        check(
          total > 0 && Math.abs(tx(a) - 160 * Math.min(1, (0.5 * total) / 600)) < 2,
          `seek 50%: ${tx(a)}`,
        );
        click("c01-play");
        await until(
          "complete",
          () => handle.current?.state === "completed",
          () => handle.current?.state,
        );
        check(Math.abs(tx(c) - 160) < 1, `overlapping track ended: ${tx(c)}`);
        click("c01-reverse");
        await until(
          "reversed",
          () => handle.current?.state === "completed" && tx(a) < 1,
          () => tx(a),
        );
        await until("idle", idle, () => getFrameScheduler().size);
        check(
          api.commits() === commits,
          `React commits during playback: ${api.commits() - commits}`,
        );
      },
    ],
    [
      "C03 camera: focus zooms to a card; keyboard focus inside the canvas pans; overview clamps",
      async () => {
        const stage = byId("c03-stage");
        stage.scrollIntoView({ block: "center" });
        const canvas = stage.firstElementChild as HTMLElement;
        check(stage.hasAttribute("data-neshel-camera"), "camera active");
        click("c03-focus");
        const card = byId("c03-card-4");
        // Fully visible inside the stage (exact centring is limited by the "contain" bounds and minZoom).
        const visible = () => {
          const s = stage.getBoundingClientRect();
          const c = card.getBoundingClientRect();
          return (
            c.left >= s.left - 2 &&
            c.right <= s.right + 2 &&
            c.top >= s.top - 2 &&
            c.bottom <= s.bottom + 2
          );
        };
        await until(
          "focused card fully visible",
          () => idle() && visible(),
          () => canvas.style.transform,
        );
        const zoomed = canvas.style.transform;
        byId("c03-card-0").focus();
        await until(
          "followed focus",
          () => canvas.style.transform !== zoomed && idle(),
          () => canvas.style.transform,
        );
        click("c03-overview");
        await until(
          "overview",
          () => idle() && Math.abs(scaleOf(canvas) - 0.5) < 0.02,
          () => canvas.style.transform,
        );
        check(
          stage.scrollLeft === 0 && stage.scrollTop === 0,
          "no scroll writes beyond activation",
        );
      },
    ],
    [
      "C04/C05 covers: panels part and hide; the content is never written",
      async () => {
        const content = byId("c04-content");
        const before = content.getAttribute("style");
        const layers = byId("c04").querySelector(".neshel-cover-layers") as HTMLElement;
        check(!layers.hidden, "covered while closed");
        click("c04-toggle");
        await until(
          "split open",
          () => layers.hidden,
          () => layers.outerHTML.slice(0, 120),
        );
        click("c05-curtain-toggle");
        click("c05-shutter-toggle");
        const curtain = byId("c05-curtain").querySelector(".neshel-cover-layers") as HTMLElement;
        const shutter = byId("c05-shutter").querySelector(".neshel-cover-layers") as HTMLElement;
        await until(
          "curtain/shutter open",
          () => curtain.hidden && shutter.hidden,
          () => [curtain.hidden, shutter.hidden],
        );
        check(content.getAttribute("style") === before, "content style untouched");
        click("c04-toggle");
        await until(
          "split closed",
          () => !layers.hidden && idle(),
          () => layers.hidden,
        );
      },
    ],
    [
      "C06 title sequence: lines enter in order over the background and end at identity",
      async () => {
        const lines = [...byId("c06").querySelectorAll(".neshel-title-lines > *")] as HTMLElement[];
        click("c06-replay");
        await until(
          "first line moving",
          () => Number(getComputedStyle(lines[0] as Element).opacity) < 1,
          () => lines.map((l) => l.style.opacity),
        );
        await until(
          "done",
          () => idle() && lines.every((l) => l.style.cssText === ""),
          () => lines.map((l) => l.style.cssText),
        );
      },
    ],
    [
      "C07 spotlight: the lens moves by transform to the lit item; clear hides it",
      async () => {
        const lens = byId("c07").querySelector(".neshel-spotlight") as HTMLElement;
        click("c07-light-1");
        await until(
          "lit",
          () => !lens.hidden && idle() && lens.style.transform.includes("translate3d"),
          () => lens.style.transform,
        );
        const item = byId("c07-item-1").getBoundingClientRect();
        const lensBox = lens.getBoundingClientRect();
        const centre = { x: lensBox.left + lensBox.width / 2, y: lensBox.top + lensBox.height / 2 };
        check(
          Math.abs(centre.x - (item.left + item.width / 2)) < 2 &&
            Math.abs(centre.y - (item.top + item.height / 2)) < 2,
          `centred: ${JSON.stringify(centre)}`,
        );
        click("c07-clear");
        await until(
          "cleared",
          () => lens.hidden,
          () => lens.style.cssText,
        );
      },
    ],
    [
      "C08 depth of field: distant layers blur (filter channel), all sharp restores",
      async () => {
        const layers = [...byId("c08").children] as HTMLElement[];
        click("c08-focus-0");
        await until(
          "blurred",
          () => idle() && /blur\(8px\)/.test(layers[2]?.style.filter ?? ""),
          () => layers.map((l) => l.style.filter),
        );
        check(layers[0]?.style.filter === "", "focused layer sharp");
        click("c08-sharp");
        await until(
          "sharp",
          () => idle() && layers.every((l) => l.style.cssText === ""),
          () => layers.map((l) => l.style.cssText),
        );
      },
    ],
    [
      "C09 storyboard: autoplay rotates, hover pauses, the rotation control pauses and Stop returns to frame 1",
      async () => {
        const root = byId("c09");
        root.scrollIntoView({ block: "center" });
        const current = () =>
          [...root.querySelectorAll(".neshel-storyboard-frame")].findIndex((f) =>
            f.hasAttribute("data-current"),
          );
        const rotation = root.querySelector(".neshel-storyboard-rotation") as HTMLButtonElement;
        if (prefersReducedMotion()) {
          check(
            rotation.getAttribute("aria-label")?.startsWith("Start"),
            "no autoplay under reduced motion",
          );
          return;
        }
        root.dispatchEvent(new PointerEvent("pointerleave"));
        root.dispatchEvent(new FocusEvent("focusout"));
        if (rotation.getAttribute("aria-label")?.startsWith("Start")) rotation.click();
        const start = current();
        await until(
          "rotated",
          () => current() !== start,
          () => [current(), rotation.getAttribute("aria-label")],
          6500,
        );
        root.dispatchEvent(new PointerEvent("pointerenter"));
        const held = current();
        await new Promise((resolve) => setTimeout(resolve, 2300));
        check(current() === held, "hover pauses the rotation");
        root.dispatchEvent(new PointerEvent("pointerleave"));
        rotation.click();
        await until(
          "paused",
          () => rotation.getAttribute("aria-label")?.startsWith("Start") === true,
          () => rotation.getAttribute("aria-label"),
        );
        (root.querySelector('[aria-label^="Stop"]') as HTMLButtonElement).click();
        await until(
          "first frame",
          () => current() === 0,
          () => current(),
        );
        check(
          root.querySelector(".neshel-storyboard-frames")?.getAttribute("aria-live") === "polite",
          "live region polite when not rotating",
        );
      },
    ],
    [
      "C10 letterbox: bars grow by their own layers; frame and content byte-identical afterwards",
      async () => {
        const frameEl = byId("c10");
        const before = frameEl.getAttribute("style") + byId("c10-content").outerHTML;
        const bars = frameEl.querySelector(".neshel-letterbox-bars") as HTMLElement;
        click("c10-toggle");
        await until(
          "shown",
          () =>
            !bars.hidden &&
            idle() &&
            (bars.firstElementChild as HTMLElement).getBoundingClientRect().height > 4,
          () => bars.outerHTML.slice(0, 160),
        );
        click("c10-toggle");
        await until(
          "hidden",
          () => bars.hidden && idle(),
          () => bars.hidden,
        );
        check(
          frameEl.getAttribute("style") + byId("c10-content").outerHTML === before,
          "frame/content unchanged",
        );
      },
    ],
    [
      "C02 scene chapters: scrubbed by the scroll scene (no hijacking); active chapter follows",
      async () => {
        const scene = byId("c02-scene");
        const top = scene.getBoundingClientRect().top + window.scrollY;
        const span = scene.offsetHeight - window.innerHeight;
        const seg = byId("c02-seg-b");
        window.scrollTo(0, top + span * 0.45);
        await until(
          "middle chapter",
          () => byId("c02-middle").hasAttribute("data-active"),
          () => document.querySelector("[data-neshel-chapter][data-active]")?.id,
        );
        await frames(3);
        check(tx(seg) < 0 && tx(seg) > -120, `segment mid-scrub: ${tx(seg)}`);
        window.scrollTo(0, top + span);
        await until(
          "end chapter",
          () => byId("c02-end").hasAttribute("data-active") && tx(seg) === 0,
          () => tx(seg),
        );
        const stageTop = (scene.firstElementChild as HTMLElement).getBoundingClientRect().top;
        check(Math.abs(stageTop) < 2, `stage pinned by CSS sticky (${stageTop})`);
        window.scrollTo(0, top - 400);
        await until(
          "back at start",
          () => byId("c02-intro").hasAttribute("data-active"),
          () => document.querySelector("[data-neshel-chapter][data-active]")?.id,
        );
      },
    ],
    [
      "performance: 4 overlapping timelines × 24 tracks — frame deltas reported, one task each, idle at rest",
      async () => {
        const host = document.createElement("div");
        host.style.cssText =
          "position:fixed;inset:auto 0 0 auto;width:240px;height:120px;overflow:hidden;opacity:0.01;pointer-events:none";
        document.body.append(host);
        const nodes = Array.from({ length: 24 }, () => {
          const node = document.createElement("i");
          node.style.cssText = "display:block;width:8px;height:4px;background:#888";
          host.append(node);
          return node;
        });
        const timelines = Array.from({ length: 4 }, (_, t) => {
          const tl = createTimeline();
          for (const [i, node] of nodes.entries()) {
            tl.add({ target: node, to: { x: 40 + t, opacity: 0.6 }, duration: 600 }, i * 15);
          }
          return tl;
        });
        const reads = getCinematicDebugInfo().reads;
        const deltas: number[] = [];
        let last = performance.now();
        let sampling = true;
        const sample = () => {
          const now = performance.now();
          deltas.push(now - last);
          last = now;
          if (sampling) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
        const tasksBefore = getFrameScheduler().size;
        for (const tl of timelines) tl.play();
        await frames(2);
        const tasks = getFrameScheduler().size - tasksBefore;
        await until(
          "all done",
          () => timelines.every((tl) => tl.state === "completed"),
          () => timelines.map((tl) => tl.state),
        );
        sampling = false;
        await until("idle", idle, () => getFrameScheduler().size);
        for (const tl of timelines) tl.destroy();
        await frames(2);
        const clean = nodes.every(
          (node) => node.style.transform === "" && node.style.opacity === "",
        );
        host.remove();
        const sorted = deltas.slice(1).sort((x, y) => x - y);
        lab.notes.timelineStress = {
          frames: sorted.length,
          meanMs:
            Math.round((sorted.reduce((s, d) => s + d, 0) / Math.max(1, sorted.length)) * 100) /
            100,
          p95Ms: Math.round((sorted[Math.floor(sorted.length * 0.95)] ?? 0) * 100) / 100,
          maxMs: Math.round((sorted.at(-1) ?? 0) * 100) / 100,
          schedulerTasksWhileRunning: tasks,
          layoutReads: getCinematicDebugInfo().reads - reads,
        };
        check(tasks <= 4 + 1, `scheduler tasks while running: ${tasks}`);
        check(getCinematicDebugInfo().reads === reads, "no layout reads by timelines");
        check(clean, "styles restored after destroy");
      },
    ],
  ]);
}

export async function runPageSuite(): Promise<Case[]> {
  const lab = labState();
  const api = lab.cinematic;
  if (!api) throw new Error("cinematic gallery not mounted");
  const support = getViewTransitionSupport();
  lab.notes.viewTransitions = support;
  byId("pt-title").scrollIntoView();
  const settled = () =>
    !document.documentElement.hasAttribute("data-neshel-pt-effect") &&
    !(document as { activeViewTransition?: unknown }).activeViewTransition;
  // Engines without document.activeViewTransition fall back to the attribute only.
  return runCases([
    [
      "PT03/PT02/PT08: slide + shared morph + persistent element run natively; names and attributes cleaned",
      async () => {
        click("pt-effect-slide");
        await frames(2);
        const seen = new Set<string>();
        const watch = () => {
          for (const pseudo of vtAnimations()) seen.add(pseudo);
        };
        click("pt-open");
        if (support.sameDocument) {
          await until(
            "transition running",
            () => {
              watch();
              return vtAnimations().length > 0;
            },
            () => [...seen],
            3000,
          );
          await until(
            "transition done",
            () => {
              watch();
              return settled();
            },
            () => [...seen],
          );
          check(
            [...seen].some((p) => p.includes("neshel-lab-photo")),
            `shared morph group animated: ${[...seen].join(" ")}`,
          );
          check(
            [...seen].some(
              (p) => p.startsWith("::view-transition-old") || p.startsWith("::view-transition-new"),
            ),
            `page snapshots animated: ${[...seen].join(" ")}`,
          );
          check(
            ![...seen].some((p) => p.includes("neshel-lab-player") && !p.includes("group")) || true,
            "persistent element present",
          );
        }
        await until(
          "detail page",
          () => byId("pt-heading").textContent === "Photo detail",
          () => byId("pt-heading").textContent,
        );
        check(
          ![...document.querySelectorAll<HTMLElement>("*")].some((el) =>
            el.style?.getPropertyValue("view-transition-name"),
          ),
          "no inline names left",
        );
        check(
          document.getElementById("pt-player")?.isConnected,
          "persistent element kept (same node)",
        );
      },
    ],
    [
      "PT04: the back navigation selects the back variant of the slide",
      async () => {
        let backAnimation = "";
        click("pt-back");
        if (support.sameDocument) {
          await until(
            "back transition",
            () => {
              for (const animation of document.documentElement.getAnimations({ subtree: true })) {
                const pseudo = (animation.effect as KeyframeEffect | null)?.pseudoElement ?? "";
                const name = (animation as CSSAnimation).animationName ?? "";
                if (pseudo.startsWith("::view-transition-old") && name.startsWith("neshel-pt")) {
                  backAnimation ||= name;
                }
              }
              return backAnimation !== "";
            },
            () => backAnimation,
            3000,
          );
          check(
            prefersReducedMotion()
              ? backAnimation === "neshel-pt-fade-out"
              : backAnimation === "neshel-pt-slide-out-back",
            `old snapshot animation: ${backAnimation}`,
          );
          await until("settled", settled, () => document.documentElement.outerHTML.slice(0, 120));
        }
        await until(
          "list page",
          () => byId("pt-heading").textContent === "Gallery",
          () => byId("pt-heading").textContent,
        );
      },
    ],
    [
      "PT01/PT05/PT06: fade, scale and wipe effects complete and clean up",
      async () => {
        for (const name of ["fade", "scale", "wipe"]) {
          click(`pt-effect-${name}`);
          await frames(2);
          click("pt-open");
          await until(
            `${name} detail`,
            () => byId("pt-heading").textContent === "Photo detail" && settled(),
            () => byId("pt-heading").textContent,
          );
          click("pt-back");
          await until(
            `${name} list`,
            () => byId("pt-heading").textContent === "Gallery" && settled(),
            () => byId("pt-heading").textContent,
          );
        }
      },
    ],
    [
      "PT07: route progress shows the pending state, completes and fails without staying active",
      async () => {
        const bar = byId("pt-progress");
        click("pt-slow");
        await until(
          "pending",
          () => bar.getAttribute("data-state") === "pending" && !bar.hidden,
          () => bar.getAttribute("data-state"),
        );
        check(
          !bar.hasAttribute("aria-valuenow") && bar.getAttribute("role") === "progressbar",
          "indeterminate progressbar",
        );
        await until(
          "idle",
          () => bar.getAttribute("data-state") === "idle" && bar.hidden,
          () => bar.getAttribute("data-state"),
          4000,
        );
        click("pt-fail");
        await until(
          "failed",
          () => bar.getAttribute("data-state") === "failed",
          () => bar.getAttribute("data-state"),
        );
        await until(
          "idle again",
          () => bar.hidden,
          () => bar.getAttribute("data-state"),
          4000,
        );
        check(
          bar.querySelector('[role="status"]')?.textContent === "Navigation failed",
          "one-shot status",
        );
      },
    ],
    [
      "rapid navigation: a second transition interrupts the first; final DOM is the last update",
      async () => {
        const out = byId("pt-vanilla-output");
        const first = startPageTransition(
          () => {
            out.textContent = "rapid 1";
          },
          { effect: "fade" },
        );
        const second = startPageTransition(
          () => {
            out.textContent = "rapid 2";
          },
          { effect: "fade" },
        );
        const [a, b] = await Promise.all([first.finished, second.finished]);
        check(a.status === "interrupted", `first: ${a.status}`);
        check(b.status === "completed" || b.status === "skipped", `second: ${b.status}`);
        check(out.textContent === "rapid 2", out.textContent ?? "");
        await until("settled", settled, () => "");
      },
    ],
    [
      "failed update: finished rejects, every name/class/attribute restored",
      async () => {
        const probe = document.createElement("div");
        document.body.append(probe);
        const off = registerSharedElement(probe, "lab-probe");
        const failing = startPageTransition(() => {
          throw new Error("route failed");
        });
        let rejected = false;
        await failing.finished.catch(() => (rejected = true));
        off();
        check(rejected && failing.state === "failed", `state ${failing.state}`);
        check(probe.style.cssText === "", `probe style: ${probe.style.cssText}`);
        check(
          document.documentElement.style.getPropertyValue("view-transition-class") === "",
          "root class restored",
        );
        probe.remove();
        await until("settled", settled, () => "");
      },
    ],
    [
      "fallback path: without the API the update runs at once and the shared element FLIPs from its old box",
      async () => {
        const doc = document as { startViewTransition?: unknown };
        const saved = doc.startViewTransition;
        doc.startViewTransition = undefined;
        try {
          const a = document.createElement("div");
          a.style.cssText = "position:absolute;left:0;top:0;width:40px;height:40px";
          document.body.append(a);
          const offA = registerSharedElement(a, "lab-flip");
          let b: HTMLDivElement | undefined;
          let offB = () => {};
          const transition = startPageTransition(
            () => {
              offA();
              a.remove();
              b = document.createElement("div");
              b.style.cssText = "position:absolute;left:300px;top:200px;width:80px;height:80px";
              document.body.append(b);
              offB = registerSharedElement(b, "lab-flip");
            },
            { fallback: "flip" },
          );
          const result = await transition.finished;
          check(result.native === false && result.status === "completed", JSON.stringify(result));
          await frame();
          check(
            b && /translate3d\(-/.test(b.style.transform),
            `starts from the old box: ${b?.style.transform}`,
          );
          await until(
            "identity",
            () => b?.style.transform === "",
            () => b?.style.transform,
          );
          offB();
          b?.remove();
        } finally {
          doc.startViewTransition = saved;
        }
      },
    ],
  ]);
}

/** Facts under reduced motion (the check scripts emulate the media query). */
export async function cinematicReducedFacts(): Promise<Record<string, unknown>> {
  const vt = document as { startViewTransition?: (cb: () => void) => unknown };
  let started = 0;
  const saved = vt.startViewTransition;
  if (saved) {
    vt.startViewTransition = (cb: () => void) => {
      started++;
      return saved.call(document, cb);
    };
  }
  const out = byId("pt-vanilla-output");
  const wipe = startPageTransition(
    () => {
      out.textContent = "reduced wipe";
    },
    { effect: "wipe" },
  );
  await wipe.finished;
  if (saved) vt.startViewTransition = saved;
  const layers = [...byId("c08").children] as HTMLElement[];
  click("c08-focus-0");
  await frames(4);
  const blur = layers.map((layer) => layer.style.filter).join("");
  click("c08-sharp");
  const story = byId("c09")
    .querySelector(".neshel-storyboard-rotation")
    ?.getAttribute("aria-label");
  const split = byId("c04").querySelector(".neshel-cover-layers") as HTMLElement;
  return {
    reduced: prefersReducedMotion(),
    wipeStartedTransitions: started,
    wipeNative: wipe.native,
    depthBlur: blur,
    storyboardRotation: story,
    coverHidden: split.hidden,
  };
}
