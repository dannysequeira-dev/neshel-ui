/**
 * H11 `cursorFollower` — decorative cursor follower (catalogue §2; contracts/api-012.md §3). A package-rendered
 * `aria-hidden`, `pointer-events: none` dot inside the area follows the pointer with springs of the shared hover
 * driver (box measured on enter, no layout read per move). Mouse and pen only, never keyboard focus; hidden on
 * leave; off for reduced motion (live). It never captures events: the area keeps every listener and default.
 */
import { defineEffect } from "../core/effect.js";
import { createSpringRig } from "../core/springs.js";
import { validator } from "../core/validate.js";
import {
  createHoverDriver,
  type HoverDriver,
  type HoverOptions,
  type ResolvedHover,
  resolveHover,
} from "./shared.js";

export interface CursorFollowerOptions extends Omit<HoverOptions, "pointerTypes"> {
  /** Pointer types that show the follower (default mouse and pen; touch is not supported). */
  pointerTypes?: readonly ("mouse" | "pen")[];
  /** Diameter in px (4–160, default 28). */
  size?: number;
  /** Blend with the content (`mix-blend-mode: difference`, default false). */
  blend?: boolean;
}

interface ResolvedFollower extends ResolvedHover {
  size: number;
  blend: boolean;
}

const followerV = /* @__PURE__ */ validator("cursorFollower");

export const cursorFollower = /* @__PURE__ */ defineEffect<CursorFollowerOptions, ResolvedFollower>(
  {
    id: "hover/cursor-follower",
    family: "hover",
    // Writes only its own package-rendered layer, never the area's styles.
    channels: [],
    priority: 0,
    reducedMotion: "off",
    resolve(input) {
      const o = followerV.options(input);
      if (Array.isArray(o.pointerTypes) && o.pointerTypes.includes("touch" as never)) {
        followerV.fail(`"pointerTypes" cannot include "touch" (a finger has no cursor).`);
      }
      return {
        ...resolveHover(o as Partial<HoverOptions>, followerV, { stiffness: 260, damping: 26 }),
        size: followerV.number("size", o.size, 28, 4, 160),
        blend: followerV.flag("blend", o.blend, false),
      };
    },
    policy: (o) => o.reducedMotion,
    setup(context) {
      const area = context.element as HTMLElement;
      const dot = document.createElement("span");
      dot.className = "neshel-cursor-follower";
      dot.setAttribute("aria-hidden", "true");
      area.append(dot);
      let border = { left: 0, top: 0 };
      let placed = false;
      const style = () => {
        const o = context.options;
        dot.style.setProperty("--neshel-follower-size", `${o.size}px`);
        dot.toggleAttribute("data-blend", o.blend);
      };
      style();
      let driver: HoverDriver<"p"> | undefined;
      const paint = () => {
        const p = driver?.rig.values.p ?? 0;
        if (context.reduced || p < 0.01) {
          dot.style.opacity = "";
          dot.style.transform = "";
          return;
        }
        const { x, y } = position.values;
        dot.style.opacity = p.toFixed(3);
        dot.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(0.6 + 0.4 * p).toFixed(3)})`;
      };
      // Position springs apart from the visibility, so a leaving dot fades where it is.
      const position = createSpringRig(
        context.scheduler,
        { x: 0, y: 0 },
        context.options.spring,
        paint,
      );
      driver = createHoverDriver(context, {
        token: "cursor-follower",
        focus: false,
        rest: { p: 0 },
        target: (_o, reduced) => ({ p: reduced ? 0 : 1 }),
        onActiveChange(active) {
          if (active) {
            // Border offset of the area, read once per entry (absolute layers start at the padding box).
            border = { left: area.clientLeft || 0, top: area.clientTop || 0 };
          } else placed = false;
        },
        onMove(sample, o, reduced) {
          if (reduced) return;
          const x = sample.left - border.left;
          const y = sample.top - border.top;
          position.setSpring(o.spring);
          // The first sample of an entry jumps (the dot appears under the pointer, then follows).
          if (!placed) {
            placed = true;
            position.set({ x, y });
          } else position.to({ x, y });
        },
        render: paint,
      });
      return {
        update() {
          style();
          driver?.refresh();
        },
        destroy() {
          driver?.destroy();
          position.stop();
          dot.remove();
        },
      };
    },
  },
);
