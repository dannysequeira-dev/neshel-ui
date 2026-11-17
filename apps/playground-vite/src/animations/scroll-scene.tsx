// Experiment C, migrated in Phase 011: the 008.0 ScrollScene prototype now runs on the package API
// (`<ScrollScene>` = SP05 sticky pinning + scene progress, `<ScrollLayer>` = SP01 depth layers, `smooth` =
// SP10). The geometry cache, invalidation set (content above, compensated changes, insertions, resize,
// fonts) and smoothing live in the scroll engine (contracts/scroll-engine.md); the lab checks that
// validated the prototype (CI run 43936536735 regressions included) now validate the package.
import {
  getScrollDebugInfo,
  ScrollLayer,
  ScrollScene,
  useScrollScene,
} from "@neshel-ui/animations/scroll";
import { type CSSProperties, useEffect, useState } from "react";
import { labState } from "./lab-state";

const LAYERS = [
  { id: "far", depth: 0.2, label: "Far" },
  { id: "mid", depth: 0.6, label: "Mid" },
  { id: "near", depth: 1.2, label: "Near" },
  { id: "front", depth: 2, label: "Front" },
] as const;

/** Publishes the scene's progress and cached geometry to the lab hook (test diagnostics only). */
function SceneProbe() {
  const timeline = useScrollScene();
  useEffect(() => {
    if (!timeline) return;
    return timeline.subscribe((value) => {
      const state = labState();
      state.sceneProgress = value;
      state.sceneMeasurements = getScrollDebugInfo().measurements;
      state.sceneGeometry = {
        top: timeline.geometry.subjectStart,
        distance: timeline.geometry.end - timeline.geometry.start,
      };
    });
  }, [timeline]);
  return null;
}

export function ScrollSceneLab() {
  const [smooth, setSmooth] = useState(false);
  return (
    <section className="lab-section" aria-labelledby="scene-title">
      <h2 id="scene-title">C · ScrollScene (package API since Phase 011)</h2>
      <p>
        Scroll through the section: the stage stays pinned (CSS sticky) while layers at different
        depths move with the progress. Progress comes from cached geometry (no layout read per
        scroll).
      </p>
      <label className="scene-toggle">
        <input
          type="checkbox"
          id="scene-smooth"
          checked={smooth}
          onChange={(event) => setSmooth(event.currentTarget.checked)}
        />
        Smooth scrub (spring)
      </label>
      <ScrollScene
        id="scene"
        className="scene"
        stageClassName="scene-stage"
        length={3}
        smooth={smooth}
      >
        <SceneProbe />
        {LAYERS.map((layer) => (
          <ScrollLayer
            key={layer.id}
            id={`scene-layer-${layer.id}`}
            className="scene-layer"
            depth={layer.depth}
            distance={360}
            style={{ "--depth": layer.depth } as CSSProperties}
            aria-hidden="true"
          >
            {layer.label}
          </ScrollLayer>
        ))}
        <p id="scene-caption" className="scene-caption">
          Rooted in faith. Built with hope.
        </p>
        <div className="scene-progress" aria-hidden="true" />
      </ScrollScene>
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
