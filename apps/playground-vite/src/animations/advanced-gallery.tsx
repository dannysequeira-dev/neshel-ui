// Phase 016 gallery: the 11 Advanced 3D & Distortion entries (D01–D11) on the real package exports, plus the
// CornerRecede vs Tilt3D comparison. Images, depth and displacement maps are generated locally on Canvas 2D (data URLs,
// CORS-clean for readPixels probes; no third-party content). The in-page suite (advanced-suite.ts) runs against this
// markup in Chrome (CDP) and in Playwright Chromium, Firefox and WebKit.
import {
  CardFlip,
  type CardFlipControl,
  CornerRecede,
  type CornerRecedeControl,
  type CubeControl,
  CubeRotate,
  Glitch,
  type GlitchControl,
  type GridControl,
  getAdvancedDebugInfo,
  PerspectiveGrid,
  RingCarousel,
  type RingControl,
  TiltShift,
  type TiltShiftControl,
} from "@neshel-ui/animations/advanced";
import "@neshel-ui/animations/advanced.css";
import {
  DepthParallax,
  type DepthParallaxControl,
  type DisplacementControl,
  DisplacementHover,
  getGpuDebugInfo,
  getGpuSupport,
  PageCurl,
  type PageCurlControl,
  Ripple,
  type RippleControl,
} from "@neshel-ui/animations/gpu";
import "@neshel-ui/animations/gpu.css";
import { Tilt3D } from "@neshel-ui/animations/hover";
import { useEffect, useMemo, useRef, useState } from "react";
import { benchAdvanced } from "./advanced-bench";
import { advancedReducedFacts, runAdvancedSuite } from "./advanced-suite";
import { labState } from "./lab-state";

/** Deterministic generated picture (data URL). */
function picture(label: string, hueA: number, hueB: number, w = 480, h = 320): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${hueA} 70% 45%)`);
  g.addColorStop(1, `hsl(${hueB} 70% 30%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgb(255 255 255 / 0.3)";
  for (let x = 0; x <= w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px system-ui, sans-serif";
  ctx.fillText(label, 28, 64);
  return canvas.toDataURL("image/png");
}

/** Grayscale depth map (white = near): a raised disc and a ramp, same aspect as the picture. */
function depthMap(w = 480, h = 320): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const ramp = ctx.createLinearGradient(0, 0, 0, h);
  ramp.addColorStop(0, "#202020");
  ramp.addColorStop(1, "#808080");
  ctx.fillStyle = ramp;
  ctx.fillRect(0, 0, w, h);
  const disc = ctx.createRadialGradient(w * 0.5, h * 0.55, 10, w * 0.5, h * 0.55, h * 0.45);
  disc.addColorStop(0, "#ffffff");
  disc.addColorStop(1, "rgb(255 255 255 / 0)");
  ctx.fillStyle = disc;
  ctx.fillRect(0, 0, w, h);
  return canvas.toDataURL("image/png");
}

function Panel({ n, hue }: { n: number; hue: number }) {
  return (
    <section
      className="adv-panel"
      style={{ background: `hsl(${hue} 60% 35%)` }}
      aria-label={`Panel ${n}`}
    >
      <h4>Panel {n}</h4>
      <button type="button" id={`d02-action-${n}`}>
        Action {n}
      </button>
    </section>
  );
}

export function AdvancedGallery() {
  const images = useMemo(
    () => ({
      front: picture("Page one", 210, 260),
      ripple: picture("Ripple", 190, 230),
      displace: picture("Displace", 20, 330),
      depth: picture("Depth", 150, 200),
      depthMap: depthMap(),
    }),
    [],
  );
  const flip = useRef<CardFlipControl | null>(null);
  const cube = useRef<CubeControl | null>(null);
  const ring = useRef<RingControl | null>(null);
  const corner = useRef<CornerRecedeControl | null>(null);
  const glitch = useRef<GlitchControl | null>(null);
  const grid = useRef<GridControl | null>(null);
  const tilt = useRef<TiltShiftControl | null>(null);
  const curl = useRef<PageCurlControl | null>(null);
  const curlCss = useRef<PageCurlControl | null>(null);
  const ripple = useRef<RippleControl | null>(null);
  const displace = useRef<DisplacementControl | null>(null);
  const depth = useRef<DepthParallaxControl | null>(null);
  const [focus, setFocus] = useState(0.5);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    labState().advanced = {
      runAdvancedSuite,
      reducedFacts: advancedReducedFacts,
      benchAdvanced,
      controls: {
        flip,
        cube,
        ring,
        corner,
        glitch,
        grid,
        tilt,
        curl,
        curlCss,
        ripple,
        displace,
        depth,
      },
      images,
      debug: () => ({
        advanced: getAdvancedDebugInfo(),
        gpu: getGpuDebugInfo(),
        support: getGpuSupport(),
      }),
    };
  });

  return (
    <section className="lab-section gallery" aria-labelledby="advanced-title">
      <h2 id="advanced-title">Advanced 3D &amp; distortion (Phase 016)</h2>
      <p>
        The 11 Phase 016 entries on the real package. CSS entries live in <code>./advanced</code>;
        the four GPU entries use the optional WebGL2 layer in <code>./gpu</code> and keep the native
        image when WebGL2 is unavailable. Headless engines render WebGL in software.
      </p>

      <h3>CSS 3D</h3>
      <div className="gallery-grid adv-grid">
        <div className="gallery-item" id="d01">
          <span>D01 card flip</span>
          <CardFlip
            id="d01-card"
            controlRef={flip}
            flipped={flipped}
            onFlippedChange={setFlipped}
            className="adv-card"
            front={
              <div className="adv-face">
                <strong>Front</strong>
                <button type="button" id="d01-front-toggle" data-neshel-flip-toggle>
                  Show details
                </button>
              </div>
            }
            back={
              <div className="adv-face adv-face-back">
                <a href="#d01" id="d01-back-link">
                  Details link
                </a>
                <button type="button" id="d01-back-toggle" data-neshel-flip-toggle>
                  Back to front
                </button>
              </div>
            }
          />
        </div>

        <div className="gallery-item" id="d02">
          <span>D02 cube rotation</span>
          <CubeRotate id="d02-cube" controlRef={cube} className="adv-cube">
            <Panel n={1} hue={210} />
            <Panel n={2} hue={280} />
            <Panel n={3} hue={340} />
            <Panel n={4} hue={30} />
          </CubeRotate>
          <div className="adv-row">
            <button type="button" id="d02-prev" onClick={() => cube.current?.previous()}>
              Previous
            </button>
            <button type="button" id="d02-next" onClick={() => cube.current?.next()}>
              Next
            </button>
          </div>
        </div>

        <div className="gallery-item adv-wide" id="d03">
          <span>D03 3D ring carousel</span>
          <RingCarousel id="d03-ring" label="Featured destinations" controlRef={ring}>
            {["Lisbon", "Kyoto", "Quito", "Oslo", "Cusco", "Hanoi"].map((city, i) => (
              <article key={city} className="adv-ring-item" id={`d03-item-${i}`}>
                <strong>{city}</strong>
                <a href={`#d03-${i}`} id={`d03-link-${i}`}>
                  Explore {city}
                </a>
              </article>
            ))}
          </RingCarousel>
          <div className="adv-row">
            <button type="button" id="d03-prev" onClick={() => ring.current?.previous()}>
              Previous
            </button>
            <button type="button" id="d03-next" onClick={() => ring.current?.next()}>
              Next
            </button>
          </div>
        </div>

        <div className="gallery-item adv-wide" id="d05">
          <span>D05 CornerRecede vs Tilt3D</span>
          <div className="adv-compare">
            <figure>
              <CornerRecede id="d05-root" controlRef={corner} className="adv-corner">
                <div className="adv-card adv-face" id="d05-surface">
                  <strong>CornerRecede</strong>
                  <span>The corner under the pointer folds away.</span>
                  <a href="#d05" id="d05-link">
                    Read more
                  </a>
                </div>
              </CornerRecede>
              <figcaption>Hinged fold: only the corner recedes; the card stays flat.</figcaption>
            </figure>
            <figure>
              <Tilt3D maxTilt={12} className="adv-card adv-face" id="d05-tilt">
                <strong>Tilt3D</strong>
                <span>The whole card rotates toward the pointer.</span>
              </Tilt3D>
              <figcaption>Rigid tilt: the whole plane rotates.</figcaption>
            </figure>
            <figure>
              <CornerRecede id="d05-reverse" reverse flap="plain" className="adv-corner">
                <div className="adv-card adv-face">
                  <strong>reverse + plain flap</strong>
                  <span>The corner lifts toward you.</span>
                </div>
              </CornerRecede>
              <figcaption>
                <code>reverse</code> lifts the corner; <code>flap="plain"</code> copies no content.
              </figcaption>
            </figure>
          </div>
        </div>

        <div className="gallery-item" id="d07">
          <span>D07 RGB split / glitch</span>
          <h4 className="adv-glitch-title">
            <Glitch id="d07-text" controlRef={glitch} trigger="hover-focus">
              NESHEL SIGNAL
            </Glitch>
          </h4>
          <button type="button" id="d07-play" onClick={() => glitch.current?.play()}>
            Play burst (≤ 3 slices/s)
          </button>
        </div>

        <div className="gallery-item" id="d09">
          <span>D09 perspective grid floor</span>
          <PerspectiveGrid
            id="d09-floor"
            controlRef={grid}
            className="adv-floor"
            color="rgb(168 85 247)"
            speed={1.5}
          >
            <p className="adv-floor-title">Horizon</p>
          </PerspectiveGrid>
          <button type="button" id="d09-play" onClick={() => grid.current?.play()}>
            Run again (5 s)
          </button>
        </div>

        <div className="gallery-item adv-wide" id="d11">
          <span>D11 tilt-shift blur</span>
          <TiltShift id="d11-root" controlRef={tilt} focus={focus} className="adv-tiltshift">
            <div className="adv-city">
              {Array.from({ length: 24 }, (_, i) => (
                <span key={i}>Block {i + 1}</span>
              ))}
            </div>
          </TiltShift>
          <label>
            Focus{" "}
            <input
              id="d11-focus"
              type="range"
              min={10}
              max={90}
              value={Math.round(focus * 100)}
              onChange={(e) => setFocus(Number(e.currentTarget.value) / 100)}
            />
          </label>
        </div>
      </div>

      <h3>GPU (WebGL2, optional)</h3>
      <div className="gallery-grid adv-grid">
        <div className="gallery-item" id="d04">
          <span>D04 page curl (mesh)</span>
          <PageCurl
            id="d04-frame"
            controlRef={curl}
            className="adv-page"
            front={<img id="d04-front" src={images.front} alt="Page one of the story" />}
            under={
              <article id="d04-under" className="adv-under">
                <h4>Page two</h4>
                <a href="#d04" id="d04-under-link">
                  Continue reading
                </a>
              </article>
            }
          />
          <div className="adv-row">
            <button type="button" id="d04-turn" onClick={() => curl.current?.play()}>
              Turn page
            </button>
            <button type="button" id="d04-back" onClick={() => curl.current?.reverse()}>
              Back
            </button>
          </div>
        </div>

        <div className="gallery-item" id="d04-css-item">
          <span>D04 page curl (CSS driver, live HTML)</span>
          <PageCurl
            id="d04-css"
            driver="css"
            controlRef={curlCss}
            className="adv-page"
            front={
              <article id="d04-css-front" className="adv-under adv-front-html">
                <h4>Live page</h4>
                <a href="#d04-css-item">A real link</a>
              </article>
            }
            under={
              <article id="d04-css-under" className="adv-under">
                <h4>Next page</h4>
              </article>
            }
          />
          <button type="button" id="d04-css-turn" onClick={() => curlCss.current?.play()}>
            Turn (rigid)
          </button>
        </div>

        <div className="gallery-item" id="d06">
          <span>D06 liquid ripple</span>
          <Ripple id="d06-frame" controlRef={ripple} className="adv-media">
            <img id="d06-img" src={images.ripple} alt="Grid pattern under water" />
          </Ripple>
        </div>

        <div className="gallery-item" id="d08">
          <span>D08 displacement-map hover</span>
          <DisplacementHover id="d08-frame" controlRef={displace} className="adv-media">
            <img id="d08-img" src={images.displace} alt="Warm gradient poster" />
          </DisplacementHover>
        </div>

        <div className="gallery-item" id="d10">
          <span>D10 depth-map parallax (2.5D)</span>
          <DepthParallax
            id="d10-frame"
            controlRef={depth}
            depth={images.depthMap}
            className="adv-media"
          >
            <img id="d10-img" src={images.depth} alt="Teal landscape with a raised disc" />
          </DepthParallax>
        </div>
      </div>
    </section>
  );
}
