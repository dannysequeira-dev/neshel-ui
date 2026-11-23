// Animations lab: A (Tilt3D), C (ScrollScene, package API since Phase 011), the engine lab and the Phase
// 010–016 galleries use the package; B keeps the 008.0 CornerRecede technique comparison (research R7), whose
// hinged fold became the D05 package effect shown in the Phase 016 gallery.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdvancedGallery } from "./advanced-gallery";
import { CinematicGallery } from "./cinematic-gallery";
import { CornerRecedeLab } from "./corner-recede";
import { EffectsLab } from "./effects-lab";
import { EngineLab } from "./engine-lab";
import { GesturesGallery } from "./gestures-gallery";
import "./lab.css";
import { MediaGallery } from "./media-gallery";
import { ScrollGallery } from "./scroll-gallery";
import { ScrollSceneLab } from "./scroll-scene";
import { TextSvgGallery } from "./text-svg-gallery";
import { TiltLab } from "./tilt-lab";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <StrictMode>
    <main className="lab">
      <header className="lab-header">
        <p className="lab-eyebrow">Neshel-UI · features 008.0–016</p>
        <h1>Animations lab</h1>
        <p>
          Technical spikes for <code>@neshel-ui/animations</code> (private, unpublished). Tilt3D,
          ScrollScene, the engine lab and the Phase 010–016 galleries use the package; section B
          keeps the 008.0 CornerRecede technique comparison behind the D05 effect.
        </p>
      </header>
      <TiltLab />
      <CornerRecedeLab />
      <ScrollSceneLab />
      <EngineLab />
      <EffectsLab />
      <ScrollGallery />
      <GesturesGallery />
      <CinematicGallery />
      <TextSvgGallery />
      <MediaGallery />
      <AdvancedGallery />
    </main>
  </StrictMode>,
);
