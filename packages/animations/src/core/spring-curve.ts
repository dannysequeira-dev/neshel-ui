/**
 * Spring curve sampling (Phase 013, internal): the duration until rest and a JavaScript easing that follows
 * a 0 → 1 spring, so a timeline can drive a spring-defined entrance (E11) deterministically (seekable).
 * Same integrator and sampling step as `springEasing` (CSS); cached per resolved spring object.
 */
import type { Easing } from "./easing.js";
import { type SpringOptions, stepSpring } from "./spring.js";

const cache = new WeakMap<object, { duration: number; easing: Easing }>();

export function springCurve(spring: Required<SpringOptions>): { duration: number; easing: Easing } {
  const cached = cache.get(spring);
  if (cached) return cached;
  const step = 1 / 240;
  const state = { value: 0, velocity: 0 };
  const samples: number[] = [0];
  let time = 0;
  while (time < 10) {
    time += step;
    const settled = stepSpring(state, 1, spring, step);
    samples.push(state.value);
    if (settled) break;
  }
  samples[samples.length - 1] = 1;
  const last = samples.length - 1;
  const easing = ((t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const x = t * last;
    const index = Math.floor(x);
    const a = samples[index] ?? 1;
    const b = samples[index + 1] ?? 1;
    return a + (b - a) * (x - index);
  }) as Easing;
  const curve = { duration: Math.round(time * 1000), easing };
  cache.set(spring, curve);
  return curve;
}
