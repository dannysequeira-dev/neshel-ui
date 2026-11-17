// Phase 010 gallery: the 30 Entrance, Hover and Press effects from the PACKAGE (not prototypes), their
// options, a forced reduced-motion mode, a composition of every family on one element, and the spike
// elements behind research R2. `window.__neshelLab.effects.runEffectsSuite()` runs computed-style checks
// inside the page so the CDP check (Chrome) and the Playwright check (Chromium, Firefox, WebKit) share
// one definition; real-input cases live in the harnesses.
import type { PresetInput } from "@neshel-ui/animations/core";
import {
  blurIn,
  clipCircle,
  clipReveal,
  type EntranceOptions,
  fadeIn,
  fadeUp,
  flipX,
  maskWipe,
  Reveal,
  rotateIn,
  Stagger,
  scaleIn,
  springIn,
  zoomIn,
} from "@neshel-ui/animations/entrance";
import {
  borderSweep,
  glow,
  Hover,
  lift,
  magnetic,
  mediaZoom,
  parallax,
  shine,
  spotlight,
  Tilt3D,
  underline,
} from "@neshel-ui/animations/hover";
import {
  burst,
  CheckboxDraw,
  ContentSwap,
  NumberTick,
  nudge,
  Press,
  pressScale,
  ripple,
  shake,
  ToggleMorph,
  tapBounce,
} from "@neshel-ui/animations/press";
import { useEffect, useState } from "react";
import { runEffectsSuite } from "./effects-suite";
import { labState } from "./lab-state";

// A heterogeneous list of presets is typed by the shared option interface.
const ENTRANCES: ReadonlyArray<readonly [string, string, PresetInput<EntranceOptions, unknown>]> = [
  ["E01", "fade", fadeIn],
  ["E02", "fade-up", fadeUp],
  ["E03", "scale", scaleIn],
  ["E04", "zoom", zoomIn],
  ["E05", "blur", blurIn],
  ["E06", "clip", clipReveal],
  ["E06", "clip-circle", clipCircle],
  ["E07", "mask-wipe", maskWipe],
  ["E08", "rotate", rotateIn],
  ["E09", "flip-x", flipX],
  ["E11", "spring", springIn],
];

const MEDIA = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#db2777"/></linearGradient></defs><rect width="320" height="200" fill="url(#g)"/><circle cx="240" cy="60" r="34" fill="#fde68a"/></svg>',
)}`;

export function EffectsLab() {
  const [replay, setReplay] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [on, setOn] = useState(false);
  const [checked, setChecked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [errors, setErrors] = useState(0);
  const [bell, setBell] = useState(0);
  const [count, setCount] = useState(1200);
  const [copied, setCopied] = useState(false);
  const policy = reduced ? ("always" as const) : ("user" as const);

  useEffect(() => {
    labState().effects = {
      runEffectsSuite,
      replay: () => setReplay((value) => value + 1),
    };
  }, []);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <section className="lab-section" aria-labelledby="effects-title">
      <h2 id="effects-title">E · Effects gallery (Phase 010, package API)</h2>
      <p>
        Every card below uses <code>@neshel-ui/animations</code> as shipped: entrances render
        through the motion host, hover decor on the package&apos;s own <code>::before</code>/
        <code>::after</code> layers, press visuals inside native controls.
      </p>
      <div className="effects-toolbar">
        <button type="button" id="effects-replay" onClick={() => setReplay((value) => value + 1)}>
          Replay entrances
        </button>
        <label>
          <input
            type="checkbox"
            id="effects-reduced"
            checked={reduced}
            onChange={(event) => setReduced(event.target.checked)}
          />{" "}
          Force reduced motion (<code>reducedMotion: &quot;always&quot;</code>)
        </label>
      </div>

      <h3>Entrance &amp; Reveal (E01–E11)</h3>
      <div className="effects-grid">
        {ENTRANCES.map(([id, name, preset]) => (
          <Reveal
            key={name}
            id={`enter-${name}`}
            preset={preset}
            options={{ reducedMotion: policy }}
            replayKey={replay}
            className="effects-tile"
          >
            <strong>{id}</strong> {name}
          </Reveal>
        ))}
        <Stagger
          id="enter-stagger"
          preset={fadeUp}
          options={{ distance: 12 }}
          reducedMotion={policy}
          replayKey={replay}
          className="effects-tile effects-stack"
        >
          <span>E10</span>
          <span>stagger</span>
          <span>children</span>
        </Stagger>
      </div>

      <h3>Hover &amp; Pointer (H01–H10)</h3>
      <div className="effects-grid">
        <Hover
          id="hover-lift"
          preset={lift}
          options={{ distance: 6, reducedMotion: policy }}
          asChild
        >
          <button type="button" className="effects-tile">
            H01 lift
          </button>
        </Hover>
        <Hover id="hover-glow" preset={glow} options={{ reducedMotion: policy }} asChild>
          <button type="button" className="effects-tile">
            H02 glow
          </button>
        </Hover>
        <Tilt3D id="hover-tilt" className="effects-tile" maxTilt={10} reducedMotion={policy}>
          H03 Tilt3D (008)
        </Tilt3D>
        <Hover
          id="hover-magnetic"
          preset={magnetic}
          options={{ reducedMotion: policy }}
          className="effects-tile"
        >
          H04 magnetic
        </Hover>
        <Hover
          id="hover-spotlight"
          preset={spotlight}
          options={{ intensity: 0.5, reducedMotion: policy }}
          className="effects-tile effects-dark"
        >
          H05 spotlight
        </Hover>
        <Hover id="hover-sweep" preset={borderSweep} options={{ reducedMotion: policy }} asChild>
          <button type="button" className="effects-tile">
            H06 border sweep
          </button>
        </Hover>
        <div className="effects-tile">
          <Hover
            id="hover-underline"
            preset={underline}
            options={{ reducedMotion: policy }}
            asChild
          >
            <a href="#effects-title">H07 underline grow</a>
          </Hover>
        </div>
        <Hover
          id="hover-media"
          preset={mediaZoom}
          options={{ reducedMotion: policy }}
          className="effects-tile effects-media"
        >
          <img src={MEDIA} alt="Gradient landscape" width={320} height={200} />
        </Hover>
        <Hover
          id="hover-parallax"
          preset={parallax}
          options={{ strength: 18, reducedMotion: policy }}
          className="effects-tile effects-parallax"
        >
          <span data-neshel-depth="0.4" className="effects-layer effects-layer-back" />
          <span data-neshel-depth="1" className="effects-layer effects-layer-front">
            H09 parallax
          </span>
        </Hover>
        <Hover id="hover-shine" preset={shine} options={{ reducedMotion: policy }} asChild>
          <button type="button" className="effects-tile effects-dark">
            H10 shine
          </button>
        </Hover>
      </div>

      <h3>Press &amp; Microinteractions (P01–P10)</h3>
      <div className="effects-grid">
        <Press id="press-scale" preset={pressScale} options={{ reducedMotion: policy }} asChild>
          <button type="button" className="effects-tile">
            P01 press scale
          </button>
        </Press>
        <Press id="press-ripple" preset={ripple} options={{ reducedMotion: policy }} asChild>
          <button type="button" className="effects-tile">
            P02 ripple
          </button>
        </Press>
        <Press id="press-bounce" preset={tapBounce} options={{ reducedMotion: policy }} asChild>
          <button type="button" className="effects-tile">
            P03 tap bounce
          </button>
        </Press>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          id="press-toggle"
          className="effects-tile effects-row"
          onClick={() => setOn((value) => !value)}
        >
          <ToggleMorph checked={on} reducedMotion={policy} /> P04 notifications
        </button>
        <label className="effects-tile effects-row" htmlFor="press-checkbox-input">
          <input
            id="press-checkbox-input"
            type="checkbox"
            className="effects-visually-hidden"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />
          <CheckboxDraw id="press-checkbox" checked={checked} reducedMotion={policy} /> P05 accept
        </label>
        <Press
          id="press-burst"
          preset={burst}
          options={{ trigger: likes, reducedMotion: policy }}
          asChild
        >
          <button
            type="button"
            className="effects-tile"
            aria-pressed={likes % 2 === 1}
            onClick={() => setLikes((value) => value + 1)}
          >
            P06 like ({likes})
          </button>
        </Press>
        <div className="effects-tile">
          <Press
            id="press-shake"
            preset={shake}
            options={{ trigger: errors, reducedMotion: policy }}
            asChild
          >
            <input
              aria-label="Code"
              aria-invalid={errors > 0}
              aria-describedby="press-shake-error"
              defaultValue="1234"
            />
          </Press>
          <button type="button" id="press-shake-submit" onClick={() => setErrors((v) => v + 1)}>
            P07 submit
          </button>
          <p id="press-shake-error" role="alert">
            {errors > 0 ? "Invalid code." : ""}
          </p>
        </div>
        <Press
          id="press-nudge"
          preset={nudge}
          options={{ trigger: bell, repeat: 1, reducedMotion: policy }}
          asChild
        >
          <button type="button" className="effects-tile" onClick={() => setBell((v) => v + 1)}>
            P08 nudge
          </button>
        </Press>
        <div className="effects-tile">
          <NumberTick id="press-number" value={count} reducedMotion={policy} live="polite" />
          <button type="button" id="press-number-add" onClick={() => setCount((v) => v + 250)}>
            P09 +250
          </button>
        </div>
        <button
          type="button"
          id="press-copy"
          className="effects-tile"
          onClick={() => setCopied(true)}
        >
          <ContentSwap id="press-swap" active={copied} confirm="Copied ✓" reducedMotion={policy}>
            P10 copy
          </ContentSwap>
        </button>
      </div>

      <h3>Composition on one element</h3>
      <div className="effects-grid">
        <Reveal preset={fadeUp} replayKey={replay} options={{ reducedMotion: policy }} asChild>
          <Hover preset={[lift, glow]} asChild>
            <Press preset={[pressScale, ripple]} asChild>
              <Tilt3D asChild maxTilt={8} reducedMotion={policy}>
                <button type="button" id="combo" className="effects-tile effects-combo">
                  Entrance + Hover (lift, glow) + Press (scale, ripple) + Tilt3D
                </button>
              </Tilt3D>
            </Press>
          </Hover>
        </Reveal>
      </div>

      {/* Spike elements behind research R2 (not package API; checked by the suite). */}
      <div className="effects-spikes" aria-hidden="true">
        <div id="spike-keyframes" style={{ transform: "rotate(10deg)" }} />
        <div id="spike-transition" className="spike-package spike-consumer" />
      </div>
    </section>
  );
}
