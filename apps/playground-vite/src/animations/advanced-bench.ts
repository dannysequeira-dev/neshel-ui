// Phase 016 performance matrix (specs/016-advanced-3d-distortion/contracts/performance-matrix-016.md), run in-page by
// `pnpm bench:animations:advanced`. Observations, never a gate: headless engines rasterise WebGL in software
// (SwiftShader in Chromium) or behind masked renderers, so GPU figures do not describe physical GPUs. Per scenario:
// creation → first frame (ms), sustained rAF intervals (mean/p95 ms), long tasks (Chromium), GPU resources (contexts,
// estimated texture/drawing-buffer bytes, compile errors) and the draws issued.
import {
  createCardFlip,
  createCornerRecede,
  createGlitch,
  createPerspectiveGrid,
  createRingCarousel,
  createTiltShift,
  getAdvancedDebugInfo,
} from "@neshel-ui/animations/advanced";
import {
  configureGpu,
  createDepthParallax,
  createDisplacementHover,
  createPageCurl,
  createRipple,
  getGpuDebugInfo,
} from "@neshel-ui/animations/gpu";

const frame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
function stats(values: number[]) {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    mean: round(mean),
    p95: round(s[Math.floor(s.length * 0.95)] ?? 0),
    max: round(s.at(-1) ?? 0),
  };
}
async function sustained(count: number, each?: (i: number) => void) {
  const intervals: number[] = [];
  let last = await frame();
  let longTasks = 0;
  let observer: PerformanceObserver | undefined;
  try {
    observer = new PerformanceObserver((list) => {
      longTasks += list.getEntries().length;
    });
    observer.observe({ type: "longtask", buffered: false });
  } catch {}
  for (let i = 0; i < count; i++) {
    each?.(i);
    const now = await frame();
    intervals.push(now - last);
    last = now;
  }
  observer?.disconnect();
  return { interval: stats(intervals.slice(5)), longTasks };
}

function picture(w: number, h: number, hue: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  if (x) {
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, `hsl(${hue} 70% 40%)`);
    g.addColorStop(1, `hsl(${hue + 60} 70% 30%)`);
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.strokeStyle = "rgb(255 255 255 / .3)";
    for (let i = 0; i <= w; i += 32) x.strokeRect(i, 0, 0, h);
  }
  return c;
}
function radial(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  if (x) {
    const g = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, h / 2);
    g.addColorStop(0, "#fff");
    g.addColorStop(1, "#000");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
  }
  return c;
}

export async function benchAdvanced(config: { frames: number }): Promise<Record<string, unknown>> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:0;top:0;width:1280px;height:800px;z-index:10;pointer-events:none;background:#0b1020;display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start";
  document.body.appendChild(host);
  window.scrollTo(0, 0);
  const results: Record<string, unknown> = {};
  const box = (w: number, h: number) => {
    const el = document.createElement("div");
    el.style.cssText = `position:relative;width:${w}px;height:${h}px;flex:none;color:#fff`;
    host.appendChild(el);
    return el;
  };
  const gpuFrame = (w: number, h: number, dpr: number) => {
    const el = box(w, h);
    const canvas = picture(w * dpr, h * dpr, 200);
    canvas.style.cssText = "display:block;width:100%;height:100%";
    el.appendChild(canvas);
    return el;
  };
  const run = async (
    name: string,
    setup: () => Array<{ destroy(): void }>,
    each?: (controls: Array<{ destroy(): void }>, i: number) => void,
  ) => {
    const t0 = performance.now();
    const controls = setup();
    const createMs = performance.now() - t0;
    await frame();
    await frame();
    const firstFrameMs = performance.now() - t0;
    const before = getGpuDebugInfo();
    const s = await sustained(config.frames, each ? (i) => each(controls, i) : undefined);
    const after = getGpuDebugInfo();
    results[name] = {
      createMs: Math.round(createMs * 100) / 100,
      firstFrameMs: Math.round(firstFrameMs * 100) / 100,
      ...s,
      draws: after.draws - before.draws,
      contexts: after.contexts,
      textureKiB: Math.round(after.textureBytes / 1024),
      drawingBufferKiB: Math.round(after.drawingBufferBytes / 1024),
      compileErrors: after.compileErrors,
    };
    for (const c of controls) c.destroy();
    host.replaceChildren();
    await frame();
    await frame();
  };

  results.baseline = await sustained(config.frames);

  // CSS entries.
  const flipCard = () => {
    const root = box(200, 130);
    root.innerHTML =
      '<div style="display:grid;width:100%;height:100%"><div style="grid-area:1/1;background:#334155">A</div><div style="grid-area:1/1;background:#7c3aed">B</div></div>';
    return createCardFlip(root);
  };
  for (const n of [1, 12])
    await run(
      `D01_flip_x${n}`,
      () => Array.from({ length: n }, flipCard),
      (cs, i) => {
        if (i % 40 === 0) for (const c of cs) (c as ReturnType<typeof createCardFlip>).toggle();
      },
    );
  await run(
    "D03_ring_rapid",
    () => {
      const root = box(600, 200);
      root.setAttribute("aria-label", "Bench ring");
      root.style.display = "grid";
      for (let i = 0; i < 8; i++) {
        const it = document.createElement("article");
        it.style.cssText =
          "grid-area:1/1;width:140px;height:110px;background:#334155;justify-self:center";
        root.appendChild(it);
      }
      return [createRingCarousel(root, { label: "Bench ring" })];
    },
    (cs, i) => {
      if (i % 10 === 0) (cs[0] as ReturnType<typeof createRingCarousel>).next();
    },
  );
  const corner = () => {
    const root = box(220, 150);
    root.innerHTML =
      '<div style="width:220px;height:150px;background:#1e3a8a">Card <a href="#x">link</a></div>';
    return createCornerRecede(root);
  };
  for (const n of [1, 6]) {
    await run(
      `D05_corner_x${n}_moving`,
      () => Array.from({ length: n }, corner),
      (cs, i) => {
        for (const c of cs)
          (c as ReturnType<typeof createCornerRecede>).set(
            i % 60 < 30 ? "top-right" : "bottom-left",
            0.4 + 0.6 * Math.abs(Math.sin(i / 7)),
          );
      },
    );
    await run(`D05_corner_x${n}_idle`, () => Array.from({ length: n }, corner));
  }
  await run("D07_glitch_x6", () =>
    Array.from({ length: 6 }, () => {
      const span = document.createElement("span");
      span.textContent = "NESHEL SIGNAL";
      span.style.cssText = "position:relative;display:inline-block;font:700 32px system-ui";
      host.appendChild(span);
      const g = createGlitch(span, { trigger: "manual", duration: 2000 });
      g.play();
      return g;
    }),
  );
  for (const n of [1, 2])
    await run(`D09_floor_x${n}`, () =>
      Array.from({ length: n }, () => {
        const root = box(600, 300);
        root.style.isolation = "isolate";
        return createPerspectiveGrid(root, { duration: 600000, color: "rgb(168 85 247)" });
      }),
    );
  for (const bands of [1, 2]) {
    const tilt = () => {
      const root = box(600, 300);
      root.innerHTML = Array.from(
        { length: 24 },
        (_, i) =>
          `<span style="display:inline-block;width:90px;height:60px;margin:4px;background:#0ea5e9">B${i}</span>`,
      ).join("");
      return createTiltShift(root, { bands });
    };
    await run(`D11_tiltshift_${bands * 2}bands_static`, () => [tilt()]);
    await run(
      `D11_tiltshift_${bands * 2}bands_moving`,
      () => [tilt()],
      (cs, i) =>
        (cs[0] as ReturnType<typeof createTiltShift>).setFocus(
          0.3 + 0.4 * Math.abs(Math.sin(i / 20)),
        ),
    );
  }

  // GPU entries.
  for (const dpr of [1, 2]) {
    configureGpu({ maxDpr: dpr });
    for (const mesh of ["small", "medium", "large"] as const)
      await run(
        `D04_curl_${mesh}_dpr${dpr}`,
        () => {
          const el = gpuFrame(320, 240, 1);
          const curl = createPageCurl(el, { mesh, maxDpr: dpr });
          return [curl];
        },
        (cs, i) => (cs[0] as ReturnType<typeof createPageCurl>).seek((i % 90) / 90),
      );
    await run(
      `D06_ripple_dpr${dpr}`,
      () => [createRipple(gpuFrame(320, 240, 1), { maxDpr: dpr, damping: 0.6 })],
      (cs, i) => {
        if (i % 30 === 0)
          (cs[0] as ReturnType<typeof createRipple>).impact(Math.random(), Math.random());
      },
    );
    await run(
      `D08_displace_dpr${dpr}`,
      () => [createDisplacementHover(gpuFrame(320, 240, 1), { maxDpr: dpr })],
      (cs, i) =>
        (cs[0] as ReturnType<typeof createDisplacementHover>).set(Math.abs(Math.sin(i / 15))),
    );
    await run(
      `D10_depth_dpr${dpr}`,
      () => [createDepthParallax(gpuFrame(320, 240, 1), { depth: radial(320, 240), maxDpr: dpr })],
      (cs, i) => (cs[0] as ReturnType<typeof createDepthParallax>).seek((Math.sin(i / 20) + 1) / 2),
    );
  }
  configureGpu({ maxDpr: 2 });
  await run(
    "gpu_six_surfaces",
    () => [
      createRipple(gpuFrame(200, 150, 1)),
      createDisplacementHover(gpuFrame(200, 150, 1)),
      createDepthParallax(gpuFrame(200, 150, 1), { depth: radial(200, 150) }),
      createPageCurl(gpuFrame(200, 150, 1)),
      createDisplacementHover(gpuFrame(200, 150, 1)),
      createDepthParallax(gpuFrame(200, 150, 1), { depth: radial(200, 150) }),
    ],
    (cs, i) => {
      (cs[1] as ReturnType<typeof createDisplacementHover>).set(Math.abs(Math.sin(i / 10)));
      (cs[2] as ReturnType<typeof createDepthParallax>).seek((i % 60) / 60);
      (cs[3] as ReturnType<typeof createPageCurl>).seek((i % 60) / 60);
    },
  );
  configureGpu({ simulate: { unsupported: true } });
  await run(
    "gpu_unavailable",
    () => [createDisplacementHover(gpuFrame(320, 240, 1))],
    (cs, i) =>
      (cs[0] as ReturnType<typeof createDisplacementHover>).set(Math.abs(Math.sin(i / 15))),
  );
  configureGpu({ simulate: { unsupported: false } });

  // Off-screen: the surface never draws while outside the viewport (shared visibility gate).
  {
    const off = document.createElement("div");
    off.style.cssText = "position:fixed;left:0;top:-4000px;width:320px;height:240px";
    off.appendChild(picture(320, 240, 120));
    document.body.appendChild(off);
    const fx = createDisplacementHover(off);
    for (let i = 0; i < 10; i++) await frame();
    const before = getGpuDebugInfo();
    await sustained(60, (i) => fx.set(Math.abs(Math.sin(i / 8))));
    results.gpu_offscreen = { draws: getGpuDebugInfo().draws - before.draws, mode: fx.mode };
    fx.destroy();
    off.remove();
  }

  // Context loss → restore, and mount/unmount churn.
  {
    const el = gpuFrame(320, 240, 1);
    const fx = createDepthParallax(el, { depth: radial(320, 240) });
    for (let i = 0; i < 60 && fx.mode !== "gpu"; i++) await frame();
    const gl = el.querySelector("canvas.neshel-gpu-canvas") as HTMLCanvasElement | null;
    const ext = (gl?.getContext("webgl2") as WebGL2RenderingContext | null)?.getExtension(
      "WEBGL_lose_context",
    );
    ext?.loseContext();
    for (let i = 0; i < 30 && fx.mode !== "static"; i++) await frame();
    const t0 = performance.now();
    ext?.restoreContext();
    let restoredMs: number | null = null;
    for (let i = 0; i < 240; i++) {
      await frame();
      if (fx.mode === "gpu") {
        restoredMs = Math.round((performance.now() - t0) * 100) / 100;
        break;
      }
    }
    results.context_loss_restore = { restoredMs, restores: getGpuDebugInfo().restores };
    fx.destroy();
    host.replaceChildren();
  }
  {
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) {
      const el = gpuFrame(160, 120, 1);
      const fx = createRipple(el);
      fx.impact();
      await frame();
      fx.destroy();
      el.remove();
    }
    await frame();
    const info = getGpuDebugInfo();
    results.mount_unmount_x20 = {
      totalMs: Math.round((performance.now() - t0) * 100) / 100,
      contexts: info.contexts,
      textures: info.textures,
      programs: info.programs,
      buffers: info.buffers,
      surfaces: info.surfaces,
    };
  }
  results.final = { advanced: getAdvancedDebugInfo(), gpu: getGpuDebugInfo() };
  host.remove();
  return results;
}
