/** Test hook read by `pnpm check:browser:animations` (never part of the package API). */
export interface LabState {
  tiltCommits: number;
  sceneProgress: number;
  sceneMeasurements: number;
  cornerAmount: number;
  webgl: "pending" | "ready" | "unavailable";
}

declare global {
  interface Window {
    __neshelLab?: LabState;
  }
}

export function labState(): LabState {
  window.__neshelLab ??= {
    tiltCommits: 0,
    sceneProgress: 0,
    sceneMeasurements: 0,
    cornerAmount: 0,
    webgl: "pending",
  };
  return window.__neshelLab;
}
