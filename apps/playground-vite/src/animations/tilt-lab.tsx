// Experiment A: Tilt3D from the package (component, asChild, composition, depth, unmount).
import { Tilt3D } from "@neshel-ui/animations/hover";
import { Profiler, useState } from "react";
import { labState } from "./lab-state";

export function TiltLab() {
  const [mounted, setMounted] = useState(true);
  return (
    <section className="lab-section" aria-labelledby="tilt-title">
      <h2 id="tilt-title">A · Tilt3D</h2>
      <p>
        Pointer-driven 3D tilt with spring return. Keyboard focus inside a card shows a gentle pose;
        with reduced motion the cards stay flat. No React render happens while the pointer moves.
      </p>
      <div className="lab-grid">
        <Profiler
          id="tilt"
          onRender={() => {
            labState().tiltCommits++;
          }}
        >
          {mounted ? (
            <Tilt3D id="tilt-basic" className="lab-card" maxTilt={12}>
              <h3>Basic</h3>
              <p>maxTilt 12°, perspective 1000px.</p>
              <button type="button" id="tilt-focus-target">
                Choose plan
              </button>
            </Tilt3D>
          ) : (
            <div id="tilt-unmounted" className="lab-card lab-card-empty">
              Unmounted
            </div>
          )}
        </Profiler>

        <Tilt3D id="tilt-composed" className="lab-card lab-lift" maxTilt={8} scale={1.03}>
          <h3>Composed</h3>
          <p>
            CSS hover lift on <code>translate</code> + JavaScript tilt on <code>transform</code>.
          </p>
        </Tilt3D>

        <Tilt3D asChild maxTilt={14} perspective={700}>
          <a id="tilt-depth" className="lab-card lab-depth" href="#tilt-title">
            <span className="lab-depth-back" aria-hidden="true" />
            <span className="lab-depth-front">asChild link with depth layers</span>
          </a>
        </Tilt3D>
      </div>
      <button type="button" id="tilt-toggle" onClick={() => setMounted((value) => !value)}>
        {mounted ? "Unmount basic card" : "Mount basic card"}
      </button>
    </section>
  );
}
