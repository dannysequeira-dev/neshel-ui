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
  /** Phase 010 effects gallery (set after mount). */
  effects?: {
    runEffectsSuite(): Promise<Array<{ id: string; ok: boolean; error?: string }>>;
    replay(): void;
    /** P10 demo state (`copied`). */
    setCopied(value: boolean): void;
    /** Hold the P10 confirmation: no automatic reset while held (issue #9). */
    holdCopied(hold: boolean): void;
    /** The gallery's "Force reduced motion" switch. */
    setReduced(value: boolean): void;
  };
  /** Phase 011 scroll gallery (set after mount). */
  scroll?: {
    runScrollSuite(): Promise<Array<{ id: string; ok: boolean; error?: string }>>;
    reducedFacts(): Record<string, unknown>;
    debug(): unknown;
  };
  /** Phase 012 gestures/layout gallery (set after mount). */
  gestures?: {
    runGesturesSuite(): Promise<Array<{ id: string; ok: boolean; error?: string }>>;
    reducedFacts(): Promise<Record<string, unknown>>;
    debug(): unknown;
  };
  /** Phase 013 cinematic/page-transitions gallery (set after mount). */
  cinematic?: {
    runCinematicSuite(): Promise<Array<{ id: string; ok: boolean; error?: string }>>;
    runPageSuite(): Promise<Array<{ id: string; ok: boolean; error?: string }>>;
    reducedFacts(): Promise<Record<string, unknown>>;
    debug(): unknown;
    commits(): number;
    timeline(): import("@neshel-ui/animations/cinematic").TimelineHandle;
    camera(): import("@neshel-ui/animations/cinematic").CameraHandle;
    setPage(page: "list" | "detail"): void;
  };
  /** Observations reported by in-page suites (not pass/fail). */
  notes: Record<string, unknown>;
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
    notes: {},
  };
  return window.__neshelLab;
}
