// Experiment B: CornerRecede. Four techniques side by side, driven by one amount (0–1) that the
// core spring animates (or the range input sets directly). Prototype only; no package API.
import {
  getFrameScheduler,
  prefersReducedMotion,
  resolveSpring,
  stepSpring,
} from "@neshel-ui/animations/core";
import { type CSSProperties, useEffect, useRef } from "react";
import { type CornerMesh, createCornerMesh } from "./corner-mesh";
import { labState } from "./lab-state";

const TILES = 8;
const spring = resolveSpring({ stiffness: 120, damping: 18, restDelta: 0.001, restSpeed: 0.001 });

/** Static depth of each tile: quadratic falloff with the distance to the top-right corner. */
function tileDepth(column: number, row: number): number {
  const x = (column + 0.5) / TILES; // 0..1, left to right
  const y = (row + 0.5) / TILES; // 0..1, top to bottom
  const distance = Math.hypot((1 - x) * (4 / 3), y) / Math.hypot(4 / 3, 1);
  const falloff = Math.max(0, 1 - distance / 0.9) ** 2;
  return Math.round(-90 * falloff);
}

function CardFace({ label }: { label: string }) {
  return (
    <div className="corner-face">
      <strong>{label}</strong>
      <span>Neshel-UI</span>
    </div>
  );
}

export function CornerRecedeLab() {
  const grid = useRef<HTMLDivElement>(null);
  const range = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mesh = useRef<CornerMesh | undefined>(undefined);
  const motion = useRef({
    state: { value: 0, velocity: 0 },
    target: 0,
    cancel: undefined as (() => void) | undefined,
  });

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    try {
      mesh.current = createCornerMesh(element);
    } catch {
      mesh.current = undefined;
    }
    labState().webgl = mesh.current ? "ready" : "unavailable";
    return () => {
      motion.current.cancel?.();
      mesh.current?.destroy();
      mesh.current = undefined;
    };
  }, []);

  function apply(amount: number) {
    grid.current?.style.setProperty("--corner", amount.toFixed(4));
    mesh.current?.setAmount(amount);
    if (range.current) range.current.value = String(Math.round(amount * 100));
    labState().cornerAmount = amount;
  }

  function animateTo(target: number) {
    const m = motion.current;
    m.target = target;
    if (prefersReducedMotion()) {
      m.cancel?.();
      m.cancel = undefined;
      m.state = { value: target, velocity: 0 };
      apply(target);
      return;
    }
    m.cancel ??= getFrameScheduler().schedule(({ delta }) => {
      const settled = stepSpring(m.state, m.target, spring, delta);
      apply(m.state.value);
      if (settled) m.cancel = undefined;
      return !settled;
    }, "update");
  }

  return (
    <section className="lab-section" aria-labelledby="corner-title">
      <h2 id="corner-title">B · CornerRecede (prototype)</h2>
      <p>
        One corner recedes. Techniques 1–3 move rigid planes with CSS transforms; only technique 4
        deforms geometry, and only for raster content. See{" "}
        <code>specs/008-animations/research.md</code> R7 for costs and limits.
      </p>
      <div className="corner-controls">
        <label htmlFor="corner-amount">Recede amount</label>
        <input
          ref={range}
          id="corner-amount"
          type="range"
          min={0}
          max={100}
          defaultValue={0}
          onInput={(event) => {
            motion.current.cancel?.();
            motion.current.cancel = undefined;
            const value = Number(event.currentTarget.value) / 100;
            motion.current.state = { value, velocity: 0 };
            motion.current.target = value;
            apply(value);
          }}
        />
        <button
          type="button"
          id="corner-toggle"
          onClick={() => animateTo(motion.current.target > 0.5 ? 0 : 1)}
        >
          Animate
        </button>
      </div>
      <div ref={grid} className="corner-grid" style={{ "--corner": 0 } as CSSProperties}>
        <figure>
          <div className="corner-stage">
            <div id="corner-rigid" className="corner-card corner-rigid">
              <CardFace label="1 · Rigid" />
            </div>
          </div>
          <figcaption>
            Rigid plane: <code>rotate3d</code> about an axis through the opposite corner. One DOM
            node, compositor-only, but the whole card tilts: no deformation.
          </figcaption>
        </figure>
        <figure>
          <div className="corner-stage">
            <div id="corner-fold" className="corner-card corner-fold">
              <div className="corner-fold-base">
                <CardFace label="2 · Fold" />
              </div>
              <div className="corner-fold-flap" aria-hidden="true" inert>
                <CardFace label="2 · Fold" />
                <span className="corner-fold-shade" />
              </div>
            </div>
          </div>
          <figcaption>
            Hinged fold: two clipped layers; the corner flap rotates about a straight crease. Exact
            for paper (piecewise planar), needs a duplicated, inert copy of the content.
          </figcaption>
        </figure>
        <figure>
          <div className="corner-stage">
            <div id="corner-segmented" className="corner-card corner-segmented" aria-hidden="true">
              {Array.from({ length: TILES * TILES }, (_, index) => {
                const column = index % TILES;
                const row = Math.floor(index / TILES);
                return (
                  <span
                    key={index}
                    className="corner-tile"
                    style={
                      {
                        "--col": column,
                        "--row": row,
                        "--z": `${tileDepth(column, row)}px`,
                      } as CSSProperties
                    }
                  />
                );
              })}
            </div>
          </div>
          <figcaption>
            Segmented: {TILES}×{TILES} tiles pushed back by a depth field. Approximates a curved
            surface in steps; {TILES * TILES} layers, and live content would need {TILES * TILES}{" "}
            copies.
          </figcaption>
        </figure>
        <figure>
          <div className="corner-stage">
            <canvas
              id="corner-mesh"
              ref={canvas}
              className="corner-card corner-mesh"
              width={480}
              height={360}
              role="img"
              aria-label="WebGL mesh: a card whose top-right corner recedes"
            />
          </div>
          <figcaption>
            WebGL mesh: 32×24 subdivided plane displaced per vertex. Real deformation of a raster
            texture; text inside is not selectable or accessible.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
