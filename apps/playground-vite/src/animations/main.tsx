// Animations lab: A (Tilt3D), C (ScrollScene, package API since Phase 011), the engine lab, the Phase
// 010 effects gallery and the Phase 011 scroll gallery use the package; B (CornerRecede) is a prototype.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CinematicGallery } from "./cinematic-gallery";
import { CornerRecedeLab } from "./corner-recede";
import { EffectsLab } from "./effects-lab";
import { EngineLab } from "./engine-lab";
import { GesturesGallery } from "./gestures-gallery";
import "./lab.css";
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
        <p className="lab-eyebrow">Neshel-UI · features 008.0–014</p>
        <h1>Animations lab</h1>
        <p>
          Technical spikes for <code>@neshel-ui/animations</code> (private, unpublished). Tilt3D,
          ScrollScene, the engine lab and the Phase 010–012 galleries use the package; CornerRecede
          is a prototype whose API is not approved.
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
    </main>
  </StrictMode>,
);
