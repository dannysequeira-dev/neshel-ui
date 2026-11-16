// Experiment C: ScrollScene. A tall section whose stage is pinned with `position: sticky` (CSS, no
// JavaScript pinning). Progress 0–1 is computed from cached geometry (no layout read per scroll),
// optionally smoothed by a spring ("smooth scrub"), and written once per frame as
// `--scene-progress`; depth layers and timeline segments derive from it in CSS. Geometry is
// re-measured by a ResizeObserver and on viewport resize. Prototype only; no package API.
import {
  getFrameScheduler,
  prefersReducedMotion,
  resolveSpring,
  stepSpring,
} from "@neshel-ui/animations/core";
import { type CSSProperties, useEffect, useRef } from "react";
import { labState } from "./lab-state";

const LAYERS = [
  { id: "far", depth: 0.2, label: "Far" },
  { id: "mid", depth: 0.6, label: "Mid" },
  { id: "near", depth: 1.2, label: "Near" },
  { id: "front", depth: 2, label: "Front" },
] as const;

const smoothSpring = resolveSpring({
  stiffness: 90,
  damping: 20,
  restDelta: 0.0005,
  restSpeed: 0.0005,
});
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function ScrollSceneLab() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const smooth = useRef(false);

  useEffect(() => {
    const element = section.current;
    const pinned = stage.current;
    if (!element || !pinned) return;
    const scheduler = getFrameScheduler();
    const geometry = { top: 0, distance: 1 };
    const progress = { value: 0, velocity: 0 };
    let target = 0;
    let cancel: (() => void) | undefined;

    // read phase: the only layout reads, once per resize (not per scroll).
    const measure = () => {
      const rect = element.getBoundingClientRect();
      geometry.top = rect.top + window.scrollY;
      geometry.distance = Math.max(1, element.offsetHeight - window.innerHeight);
      labState().sceneMeasurements++;
    };
    const write = (value: number) => {
      pinned.style.setProperty("--scene-progress", value.toFixed(4));
      labState().sceneProgress = value;
    };
    const tick = ({ delta }: { delta: number }) => {
      target = clamp01((window.scrollY - geometry.top) / geometry.distance);
      if (!smooth.current || prefersReducedMotion()) {
        progress.value = target;
        progress.velocity = 0;
        write(target);
        cancel = undefined;
        return false;
      }
      const settled = stepSpring(progress, target, smoothSpring, delta);
      write(progress.value);
      if (settled) cancel = undefined;
      return !settled;
    };
    const request = () => {
      cancel ??= scheduler.schedule(tick, "update");
    };
    const remeasure = () => {
      scheduler.schedule(() => {
        measure();
        request();
      }, "read");
    };

    measure();
    request();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", remeasure, { passive: true });
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(remeasure) : undefined;
    observer?.observe(element);
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", remeasure);
      observer?.disconnect();
      cancel?.();
    };
  }, []);

  return (
    <section className="lab-section" aria-labelledby="scene-title">
      <h2 id="scene-title">C · ScrollScene (prototype)</h2>
      <p>
        Scroll through the section: the stage stays pinned (CSS sticky) while layers at different
        depths move with the progress. Progress is computed once per frame from cached geometry.
      </p>
      <label className="scene-toggle">
        <input
          type="checkbox"
          id="scene-smooth"
          onChange={(event) => {
            smooth.current = event.currentTarget.checked;
            window.dispatchEvent(new Event("scroll"));
          }}
        />
        Smooth scrub (spring)
      </label>
      <section ref={section} id="scene" className="scene" aria-label="Scroll scene">
        <div
          ref={stage}
          id="scene-stage"
          className="scene-stage"
          style={{ "--scene-progress": 0 } as CSSProperties}
        >
          {LAYERS.map((layer) => (
            <div
              key={layer.id}
              id={`scene-layer-${layer.id}`}
              className="scene-layer"
              style={{ "--depth": layer.depth } as CSSProperties}
              aria-hidden="true"
            >
              {layer.label}
            </div>
          ))}
          <p id="scene-caption" className="scene-caption">
            Rooted in faith. Built with hope.
          </p>
          <div className="scene-progress" aria-hidden="true" />
        </div>
      </section>
      <div className="scene-native">
        <h3>Native scroll-driven animation (progressive enhancement)</h3>
        <p>
          Uses <code>animation-timeline: view()</code> when the browser supports it; otherwise the
          box simply stays visible.
        </p>
        <div id="scene-native-box" className="scene-native-box">
          view()
        </div>
      </div>
      <div className="scene-after">End of the scene.</div>
    </section>
  );
}
