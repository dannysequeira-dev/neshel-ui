// Feature 008.0 animations lab: experiments A (Tilt3D, package API), B (CornerRecede) and
// C (ScrollScene). B and C are playground prototypes; their APIs are not approved (spec FR-080).
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CornerRecedeLab } from "./corner-recede";
import { EngineLab } from "./engine-lab";
import "./lab.css";
import { ScrollSceneLab } from "./scroll-scene";
import { TiltLab } from "./tilt-lab";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <StrictMode>
    <main className="lab">
      <header className="lab-header">
        <p className="lab-eyebrow">Neshel-UI · feature 008.0</p>
        <h1>Animations lab</h1>
        <p>
          Technical spikes for <code>@neshel-ui/animations</code> (private, unpublished). Tilt3D
          uses the package; CornerRecede and ScrollScene are prototypes whose APIs are not approved.
        </p>
      </header>
      <TiltLab />
      <CornerRecedeLab />
      <ScrollSceneLab />
      <EngineLab />
    </main>
  </StrictMode>,
);
