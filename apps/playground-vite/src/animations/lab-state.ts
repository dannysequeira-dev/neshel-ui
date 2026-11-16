/** Test hook read by `pnpm check:browser:animations` (never part of the package API). */
export interface LabState {
  tiltCommits: number;
  sceneProgress: number;
  sceneMeasurements: number;
  /** ScrollScene cached geometry (diagnostics for failing checks). */
  sceneGeometry?: { top: number; distance: number };
  cornerAmount: number;
  webgl: "pending" | "ready" | "unavailable";
  /** Phase 009 engine lab (set after mount). */
  engine?: {
    api: {
      attach(name: "grayscale" | "alert"): void;
      detach(name: "grayscale" | "alert"): void;
      animate(to: number, duration?: number): { reverse(): void; cancel(): void };
      control(): { reverse(): void; cancel(): void } | undefined;
      waapi(): unknown;
      debug(): unknown;
      unbind(): void;
    };
    runEngineSuite(): Promise<Array<{ id: string; ok: boolean; error?: string }>>;
  };
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
