// In-page checks of the Phase 010 effects in a real engine (computed styles, pseudo-element layers,
// CSS-token driver, WAAPI layers, spike evidence for research R2). Shared by the CDP check (Chrome) and
// the Playwright check (Chromium, Firefox, WebKit). Results are decided by observable conditions with a
// ceiling, never by fixed sleeps. Synthetic events are used only to reach a state whose RENDERING is
// checked here; real-input behaviour is covered by the harnesses' mouse/keyboard cases.
import { attachEffect } from "@neshel-ui/animations/core";
import { clipReveal, maskWipe } from "@neshel-ui/animations/entrance";
import { borderSweep, glow, lift, shine, spotlight, underline } from "@neshel-ui/animations/hover";

type Case = { id: string; ok: boolean; error?: string };

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
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
const query = (root: ParentNode, selector: string) => {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`${selector} missing`);
  return element;
};
const computed = (element: Element, pseudo?: string) => getComputedStyle(element, pseudo);
const matrix = (element: Element) => new DOMMatrix(computed(element).transform);

function box(): HTMLElement {
  const element = document.createElement("div");
  element.className = "effects-tile effects-probe";
  element.textContent = "probe";
  document.getElementById("effects-title")?.after(element);
  return element;
}
function hoverStart(element: HTMLElement) {
  const r = element.getBoundingClientRect();
  const init = {
    clientX: r.left + r.width / 2,
    clientY: r.top + r.height / 2,
    pointerType: "mouse",
    bubbles: false,
  };
  element.dispatchEvent(new PointerEvent("pointerenter", init));
}
function hoverEnd() {
  window.dispatchEvent(
    new PointerEvent("pointermove", { clientX: -500, clientY: -500, pointerType: "mouse" }),
  );
}

export async function runEffectsSuite(): Promise<Case[]> {
  const cases: Case[] = [];
  const run = async (id: string, fn: () => Promise<void> | void) => {
    try {
      await fn();
      cases.push({ id, ok: true });
    } catch (error) {
      cases.push({ id, ok: false, error: String((error as Error)?.message ?? error) });
    }
  };

  await run(
    "spike R2a: a CSS keyframe animation of transform overrides the inline transform",
    async () => {
      const element = byId("spike-keyframes");
      element.classList.add("spike-animate");
      await frame();
      await frame();
      const m = matrix(element);
      element.classList.remove("spike-animate");
      // Inline rotate(10deg) would give b ≈ 0.17; the animation's translateX(30px) wins instead.
      check(Math.abs(m.b) < 1e-3 && Math.abs(m.e - 30) < 0.5, `computed ${m.toString()}`);
    },
  );

  await run(
    "spike R2b: the consumer's own transition replaces a layered package transition",
    () => {
      const property = computed(byId("spike-transition")).transitionProperty;
      check(property === "background-color", `transition-property ${property}`);
    },
  );

  await run("R-1: no package transition or animation on consumer elements in the gallery", () => {
    const hosts = document.querySelectorAll<HTMLElement>(
      "[data-neshel-fx], .neshel-reveal, .neshel-hover, .neshel-press, .neshel-stagger",
    );
    check(hosts.length > 20, `${hosts.length} hosts`);
    for (const host of hosts) {
      if (
        host.classList.contains("neshel-swap") ||
        host.closest(".neshel-toggle, .neshel-checkbox")
      )
        continue; // package-owned elements
      const style = computed(host);
      const durations = style.transitionDuration.split(",").map((d) => Number.parseFloat(d));
      check(
        durations.every((d) => d === 0) && style.animationName === "none",
        `#${host.id || host.className}: transition ${style.transitionProperty} ${style.transitionDuration}, animation ${style.animationName}`,
      );
    }
  });

  await run(
    "entrance: the start pose is written, then every gallery reveal ends exactly as before",
    async () => {
      window.__neshelLab?.effects?.replay();
      const fadeUp = () => byId("enter-fade-up");
      await until(
        "start pose applied",
        () => /translate3d/.test(fadeUp().style.transform) && Number(fadeUp().style.opacity) < 1,
        () => fadeUp().style.cssText,
      );
      const reveals = [...document.querySelectorAll<HTMLElement>("[id^='enter-']")];
      const targets = reveals.flatMap((el) =>
        el.id === "enter-stagger" ? [...el.children] : [el],
      );
      await until(
        "all entrances finished",
        () => targets.every((el) => (el as HTMLElement).style.cssText === ""),
        () => targets.map((el) => (el as HTMLElement).style.cssText).filter(Boolean),
        8000,
      );
      for (const el of targets) {
        const style = computed(el);
        check(style.opacity === "1", `${el.id} opacity ${style.opacity}`);
        check(style.transform === "none", `${el.id} transform ${style.transform}`);
        check(style.clipPath === "none" && style.filter === "none", `${el.id} clip/filter`);
      }
    },
  );

  await run("entrance: clip-path and gradient mask render in this engine, then clear", async () => {
    const clipped = box();
    const masked = box();
    const a = attachEffect(clipped, clipReveal, { duration: 3000, easing: "linear" });
    const b = attachEffect(masked, maskWipe, { duration: 3000, easing: "linear" });
    await until(
      "clip and mask applied",
      () =>
        computed(clipped).clipPath.startsWith("inset(") &&
        /linear-gradient/.test(
          computed(masked).maskImage ||
            ((computed(masked) as unknown as Record<string, string>).webkitMaskImage ?? ""),
        ),
      () => ({ clip: computed(clipped).clipPath, mask: computed(masked).maskImage }),
    );
    a.destroy();
    b.destroy();
    await frame();
    await frame();
    check(clipped.style.cssText === "" && masked.style.cssText === "", "restored");
    clipped.remove();
    masked.remove();
  });

  await run("hover decor: lift shadow and glow ring render on the ::before layer", async () => {
    const element = box();
    const handles = [attachEffect(element, lift), attachEffect(element, glow)];
    check(computed(element).position === "relative", "decor host positioned (zero specificity)");
    hoverStart(element);
    await until(
      "lift and glow at full progress",
      () =>
        element.style.getPropertyValue("--neshel-lift-progress") === "1" &&
        element.style.getPropertyValue("--neshel-glow-progress") === "1",
      () => element.style.cssText,
    );
    const before = computed(element, "::before");
    check(before.content !== "none" && before.pointerEvents === "none", `layer ${before.content}`);
    const shadows = before.boxShadow;
    check(/rgba?\(/.test(shadows) && !/^none$/.test(shadows), `box-shadow ${shadows}`);
    check(/(14px|-14px)/.test(shadows) || / 14px /.test(shadows), `lift offset in ${shadows}`);
    check(Math.abs(matrix(element).f + 4) < 0.5, `lift translate ${computed(element).transform}`);
    hoverEnd();
    await until(
      "back at rest",
      () => element.style.cssText === "",
      () => element.style.cssText,
    );
    check(
      computed(element, "::before").boxShadow.includes("0px 0px 0px 0px"),
      "transparent at rest",
    );
    for (const handle of handles) handle.destroy();
    element.remove();
  });

  await run(
    "hover decor: spotlight, underline and shine compose as background layers",
    async () => {
      const element = box();
      const handles = [
        attachEffect(element, spotlight, { intensity: 0.6 }),
        attachEffect(element, underline, { thickness: 3 }),
        attachEffect(element, shine, { duration: 3000 }),
      ];
      hoverStart(element);
      await until(
        "spotlight and underline at full progress, shine sweeping",
        () =>
          element.style.getPropertyValue("--neshel-spotlight-progress") === "1" &&
          element.style.getPropertyValue("--neshel-underline-progress") === "1" &&
          element.style.getPropertyValue("--neshel-shine-progress") !== "",
        () => element.style.cssText,
      );
      const before = computed(element, "::before");
      const layers = before.backgroundImage.split(/,(?![^(]*\))/);
      check(/radial-gradient/.test(before.backgroundImage), `spotlight ${before.backgroundImage}`);
      check(
        (before.backgroundImage.match(/gradient\(/g) ?? []).length >= 3,
        `layers ${layers.length}`,
      );
      check(/100% 3px/.test(before.backgroundSize), `underline size ${before.backgroundSize}`);
      hoverEnd();
      await until(
        "rest",
        () => element.style.getPropertyValue("--neshel-underline-progress") === "",
        () => element.style.cssText,
      );
      for (const handle of handles) handle.destroy();
      element.remove();
    },
  );

  await run("hover: border sweep ring on ::after, rotating only while active", async () => {
    const element = box();
    const handle = attachEffect(element, borderSweep, { duration: 600 });
    const after = () => computed(element, "::after");
    check(after().animationPlayState === "paused", `idle ${after().animationPlayState}`);
    hoverStart(element);
    await until(
      "ring visible",
      () => Number(after().opacity) > 0.99,
      () => after().opacity,
    );
    check(after().animationPlayState === "running", `active ${after().animationPlayState}`);
    const first = after().getPropertyValue("--neshel-sweep-angle");
    await frame();
    await frame();
    await frame();
    const second = after().getPropertyValue("--neshel-sweep-angle");
    if (window.__neshelLab) window.__neshelLab.notes.sweepAngleAnimates = first !== second;
    hoverEnd();
    await until(
      "ring hidden",
      () => Number(after().opacity) < 0.01,
      () => after().opacity,
    );
    handle.destroy();
    element.remove();
  });

  await run("reduced (reducedMotion 'always'): lift keeps its shadow, never moves", async () => {
    const element = box();
    const handle = attachEffect(element, lift, { reducedMotion: "always" });
    hoverStart(element);
    await until(
      "shadow on",
      () => element.style.getPropertyValue("--neshel-lift-progress") === "1",
      () => element.style.cssText,
    );
    await frame();
    check(computed(element).transform === "none", `transform ${computed(element).transform}`);
    hoverEnd();
    handle.destroy();
    element.remove();
  });

  await run(
    "press: toggle thumb travels by CSS state; engine clears its values at rest",
    async () => {
      const button = byId("press-toggle");
      const thumb = query(button, ".neshel-toggle-thumb");
      const start = button.getAttribute("aria-checked");
      button.click();
      await until(
        "thumb at the end",
        () => button.getAttribute("aria-checked") !== start && thumb.style.cssText === "",
        () => thumb.style.cssText,
      );
      const track = query(button, ".neshel-toggle");
      const expected =
        button.getAttribute("aria-checked") === "true" ? track.offsetWidth - track.offsetHeight : 0;
      const x = new DOMMatrix(`translate(${computed(thumb).translate.split(" ")[0] || "0px"})`).e;
      check(Math.abs(x - expected) < 1, `thumb x ${x}, expected ${expected}`);
      button.click();
      await until(
        "thumb back",
        () => button.getAttribute("aria-checked") === start && thumb.style.cssText === "",
        () => thumb.style.cssText,
      );
    },
  );

  await run("press: checkbox mark draws to a zero dash offset", async () => {
    const input = byId("press-checkbox-input") as HTMLInputElement;
    if (input.checked) input.click();
    input.click();
    const svg = byId("press-checkbox");
    await until(
      "mark drawn",
      () => !!svg.querySelector(".neshel-checkbox-mark") && svg.style.cssText === "",
      () => svg.outerHTML.slice(0, 160),
    );
    const offset = Number.parseFloat(
      computed(query(svg, ".neshel-checkbox-mark")).strokeDashoffset,
    );
    check(Math.abs(offset) < 1e-3, `dash offset ${offset}`);
    input.click();
  });

  await run("press: content swap hides the idle slot and shows the confirmation", async () => {
    byId("press-copy").click();
    const swap = byId("press-swap");
    const idle = swap.children[0] as HTMLElement;
    const confirm = swap.children[1] as HTMLElement;
    await until(
      "swapped",
      () => idle.hidden && computed(idle).display === "none" && computed(confirm).opacity === "1",
      () => ({ idle: computed(idle).display, confirm: computed(confirm).opacity }),
    );
    check(swap.getAttribute("data-neshel-fx") === "content-swap", "token");
  });

  await run(
    "press: number tick counts in the aria-hidden copy; the accessible copy is final",
    async () => {
      const number = byId("press-number");
      const visual = number.children[0] as HTMLElement;
      const accessible = number.children[1] as HTMLElement;
      const before = Number(accessible.textContent?.replace(/,/g, ""));
      byId("press-number-add").click();
      const target = (before + 250).toLocaleString("en-US");
      await until(
        "accessible copy final",
        () => accessible.textContent === target,
        () => accessible.textContent,
      );
      check(visual.getAttribute("aria-hidden") === "true", "visual copy hidden from AT");
      await until(
        "visual copy final",
        () => visual.textContent === target,
        () => visual.textContent,
      );
    },
  );

  await run(
    "press: ripple layer is aria-hidden, inert, non-interactive, removed when idle",
    async () => {
      const button = byId("press-ripple");
      const r = button.getBoundingClientRect();
      button.dispatchEvent(
        new PointerEvent("pointerdown", {
          button: 0,
          isPrimary: true,
          clientX: r.left + 10,
          clientY: r.top + 10,
          bubbles: true,
        }),
      );
      const layer = query(button, ".neshel-ripple-layer");
      check(
        layer.getAttribute("aria-hidden") === "true" && layer.hasAttribute("inert"),
        "hidden + inert",
      );
      check(computed(layer).pointerEvents === "none", "no pointer events");
      check(button.getAnimations({ subtree: true }).length > 0, "WAAPI animation running");
      window.dispatchEvent(new PointerEvent("pointerup", { button: 0 }));
      await until(
        "layer removed",
        () => !button.querySelector(".neshel-ripple-layer"),
        () => button.innerHTML,
      );
    },
  );

  await run("press: burst particles appear on the trigger and are removed", async () => {
    const button = byId("press-burst");
    button.click();
    await until(
      "particles",
      () => button.querySelectorAll(".neshel-burst-particle").length > 0,
      () => button.innerHTML,
    );
    await until(
      "removed",
      () => !button.querySelector(".neshel-burst-layer"),
      () => button.innerHTML,
      4000,
    );
  });

  return cases;
}
