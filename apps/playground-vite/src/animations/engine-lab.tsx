// Phase 009 engine lab: lab-defined effects competing for `filter` (arbitration, suspension,
// resumption, restoration), a motion value bound to `transform` driven by a controller, and the
// WAAPI driver. `window.__neshelLab.runEngineSuite()` runs the same checks inside the page so the
// CDP check (Chrome) and the Playwright check (Chromium, Firefox, WebKit) share one definition.
import {
  animateElement,
  animateValue,
  attachEffect,
  bindChannel,
  defineEffect,
  type EffectHandle,
  getMotionDebugInfo,
  type MotionControl,
  type MotionResult,
  motionValue,
} from "@neshel-ui/animations/core";
import { useEffect, useRef, useState } from "react";
import { labState } from "./lab-state";

const filterEffect = (id: "media/grayscale" | "feedback/alert", priority: number, value: string) =>
  defineEffect<undefined, Record<string, never>>({
    id,
    family: id.startsWith("media") ? "media" : "feedback",
    channels: [{ channel: "filter", mode: "exclusive" }],
    priority,
    reducedMotion: "static",
    resolve: () => ({}),
    setup(context) {
      context.channels.exclusive("filter").set(value);
      return { update() {}, destroy() {} };
    },
  });

const grayscale = filterEffect("media/grayscale", 0, "grayscale(1)");
const alert = filterEffect("feedback/alert", 5, "sepia(1) hue-rotate(-40deg) saturate(3)");

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const frames = async (count: number) => {
  for (let index = 0; index < count; index++) await frame();
};

export function EngineLab() {
  const target = useRef<HTMLDivElement>(null);
  const waapiTarget = useRef<HTMLDivElement>(null);
  const [debug, setDebug] = useState("{}");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const element = target.current;
    const waapiElement = waapiTarget.current;
    if (!element || !waapiElement) return;
    // An inline declaration with `!important` (React's style prop cannot express the priority).
    element.style.setProperty("filter", "saturate(1.2)", "important");
    const lab = labState();
    const handles: Partial<Record<string, EffectHandle<undefined>>> = {};
    const offset = motionValue(0);
    let release: (() => void) | undefined;
    let control: MotionControl | undefined;
    const warnings: string[] = [];
    const show = () => setDebug(JSON.stringify(getMotionDebugInfo(element) ?? null));

    const api = {
      attach(name: "grayscale" | "alert") {
        const original = console.warn;
        console.warn = (message: unknown) => warnings.push(String(message));
        try {
          handles[name] = attachEffect(
            element,
            name === "grayscale" ? grayscale : alert,
            undefined,
            {
              conflicts: "warn",
            },
          );
        } finally {
          console.warn = original;
        }
        show();
      },
      detach(name: "grayscale" | "alert") {
        handles[name]?.destroy();
        delete handles[name];
        show();
      },
      state: (name: string) => handles[name]?.state ?? "none",
      bind() {
        release ??= bindChannel(
          offset,
          element,
          { channel: "transform", layer: (x) => ({ translateX: x }) },
          { effectId: "hover/offset" },
        );
      },
      unbind() {
        release?.();
        release = undefined;
      },
      animate(to: number, duration = 400) {
        api.bind();
        control = animateValue(offset, to, { type: "tween", duration, easing: "standard" });
        setStatus("running");
        control.finished.then(
          (result: MotionResult) => setStatus(`${result.status}:${result.direction}`),
          (error: unknown) => setStatus(`failed:${String(error)}`),
        );
        return control;
      },
      control: () => control,
      waapi() {
        return animateElement(
          waapiElement,
          "filter",
          ["blur(0px)", "blur(4px)"],
          { type: "tween", duration: 300, easing: "decelerate" },
          { effectId: "media/blur" },
        );
      },
    };

    const runEngineSuite = async () => {
      const cases: Array<{ id: string; ok: boolean; error?: string }> = [];
      const run = async (id: string, fn: () => Promise<void> | void) => {
        try {
          await fn();
          cases.push({ id, ok: true });
        } catch (error) {
          cases.push({ id, ok: false, error: String((error as Error)?.message ?? error) });
        }
      };
      const check = (condition: boolean, message: string) => {
        if (!condition) throw new Error(message);
      };
      const filter = () => element.style.getPropertyValue("filter");

      await run("engine: arbitration, suspension, resumption and exact restoration", async () => {
        check(
          filter() === "saturate(1.2)" &&
            element.style.getPropertyPriority("filter") === "important",
          `initial ${filter()}`,
        );
        api.attach("grayscale");
        await frames(2);
        check(filter() === "grayscale(1)", `grayscale ${filter()}`);
        api.attach("alert");
        await frames(2);
        check(api.state("grayscale") === "suspended", `grayscale state ${api.state("grayscale")}`);
        check(filter().startsWith("sepia(1)"), `alert ${filter()}`);
        check(
          warnings.some(
            (w) => w.includes('"media/grayscale" is suspended') && w.includes('"feedback/alert"'),
          ),
          `warnings ${warnings.join(" | ")}`,
        );
        api.detach("alert");
        await frames(2);
        check(api.state("grayscale") === "active", "grayscale did not resume");
        check(filter() === "grayscale(1)", `resumed ${filter()}`);
        api.detach("grayscale");
        await frames(2);
        check(filter() === "saturate(1.2)", `restored ${filter()}`);
        check(element.style.getPropertyPriority("filter") === "important", "priority not restored");
        check(getMotionDebugInfo(element) === undefined, "host not released");
      });

      await run(
        "engine: external inline change during ownership is kept after release",
        async () => {
          api.attach("alert");
          await frames(2);
          element.style.setProperty("filter", "contrast(1.5)");
          api.detach("alert");
          await frames(2);
          check(filter() === "contrast(1.5)", `after release ${filter()}`);
          element.style.setProperty("filter", "saturate(1.2)", "important");
        },
      );

      await run("controller: tween completes; inline transform kept and restored", async () => {
        const c = api.animate(120, 300);
        const result = await c.finished;
        check(
          result.status === "completed" && result.direction === "forward" && result.value === 120,
          JSON.stringify(result),
        );
        await frames(2);
        check(
          element.style.transform === "translateY(0px) translate3d(120px, 0px, 0px)",
          `transform ${element.style.transform}`,
        );
        offset.set(0);
        api.unbind();
        await frames(2);
        check(element.style.transform === "translateY(0px)", `restored ${element.style.transform}`);
      });

      await run(
        "controller: reverse mid-run completes at the origin; cancel resolves cancelled",
        async () => {
          const c = api.animate(100, 600);
          await frames(8);
          c.reverse();
          const reversed = await c.finished;
          check(
            reversed.status === "completed" &&
              reversed.direction === "reverse" &&
              reversed.value === 0,
            JSON.stringify(reversed),
          );
          const d = api.animate(100, 600);
          await frames(4);
          d.cancel();
          const cancelled = await d.finished;
          check(
            cancelled.status === "cancelled" && cancelled.value > 0 && cancelled.value < 100,
            JSON.stringify(cancelled),
          );
          const e = api.animate(50, 600);
          await frames(2);
          const f = api.animate(0, 200);
          check((await e.finished).status === "interrupted", "not interrupted");
          await f.finished;
          api.unbind();
        },
      );

      await run(
        "WAAPI: real browser animation, end state committed, no animation left",
        async () => {
          const c = api.waapi();
          await frames(2);
          check(
            waapiElement.getAnimations().length === 1,
            `animations ${waapiElement.getAnimations().length}`,
          );
          const result = await c.finished;
          check(result.status === "completed", JSON.stringify(result));
          check(waapiElement.getAnimations().length === 0, "fill-forever animation left");
          check(
            waapiElement.style.filter === "blur(4px)",
            `committed ${waapiElement.style.filter}`,
          );
          waapiElement.style.removeProperty("filter");
        },
      );

      return cases;
    };

    lab.engine = { api, runEngineSuite };
    return () => {
      for (const handle of Object.values(handles)) handle?.destroy();
      release?.();
    };
  }, []);

  return (
    <section className="lab-section" aria-labelledby="engine-title">
      <h2 id="engine-title">D · Motion engine (Phase 009)</h2>
      <p>
        Two lab-defined effects claim <code>filter</code>: the higher priority wins, the other is
        suspended and resumes; the original inline <code>filter</code> (with <code>!important</code>
        ) is restored exactly. A motion value bound to <code>transform</code> keeps the element's
        own inline transform.
      </p>
      <div className="engine-row">
        <div
          ref={target}
          id="engine-target"
          className="engine-target"
          style={{ transform: "translateY(0px)" }}
        >
          Target
        </div>
        <div ref={waapiTarget} id="engine-waapi" className="engine-target">
          WAAPI
        </div>
      </div>
      <div className="engine-controls">
        <button
          type="button"
          id="engine-attach-gray"
          onClick={() => labState().engine?.api.attach("grayscale")}
        >
          Attach grayscale (priority 0)
        </button>
        <button
          type="button"
          id="engine-attach-alert"
          onClick={() => labState().engine?.api.attach("alert")}
        >
          Attach alert (priority 5)
        </button>
        <button
          type="button"
          id="engine-detach-alert"
          onClick={() => labState().engine?.api.detach("alert")}
        >
          Detach alert
        </button>
        <button
          type="button"
          id="engine-detach-gray"
          onClick={() => labState().engine?.api.detach("grayscale")}
        >
          Detach grayscale
        </button>
        <button
          type="button"
          id="engine-animate"
          onClick={() => labState().engine?.api.animate(120)}
        >
          Animate offset
        </button>
        <button
          type="button"
          id="engine-reverse"
          onClick={() => labState().engine?.api.control()?.reverse()}
        >
          Reverse
        </button>
        <button
          type="button"
          id="engine-cancel"
          onClick={() => labState().engine?.api.control()?.cancel()}
        >
          Cancel
        </button>
        <button type="button" id="engine-waapi-run" onClick={() => labState().engine?.api.waapi()}>
          WAAPI blur
        </button>
      </div>
      <p>
        Last result: <output id="engine-status">{status}</output>
      </p>
      <pre id="engine-debug" className="engine-debug">
        {debug}
      </pre>
    </section>
  );
}
