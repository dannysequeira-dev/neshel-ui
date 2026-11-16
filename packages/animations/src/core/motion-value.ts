/** Motion values: numbers that animate without React state (contracts/controllers.md §3). */

export interface MotionValue {
  get(): number;
  /** Set directly (velocity becomes 0); interrupts nothing by itself. */
  set(value: number): void;
  getVelocity(): number;
  /** Listener runs synchronously on every change; returns the unsubscribe function. */
  subscribe(listener: (value: number) => void): () => void;
}

const drivers = new WeakMap<MotionValue, (value: number, velocity: number) => void>();

export function motionValue(initial: number): MotionValue {
  if (!Number.isFinite(initial)) throw new RangeError("motionValue: initial value must be finite");
  let current = initial;
  let velocity = 0;
  const listeners = new Set<(value: number) => void>();
  const emit = (next: number, nextVelocity: number) => {
    velocity = nextVelocity;
    if (next === current) return;
    current = next;
    for (const listener of [...listeners]) listener(current);
  };
  const value: MotionValue = {
    get: () => current,
    set: (next) => {
      if (!Number.isFinite(next)) throw new RangeError("motionValue.set: value must be finite");
      emit(next, 0);
    },
    getVelocity: () => velocity,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  drivers.set(value, emit);
  return value;
}

/** Engine-internal setter that keeps velocity (drivers only). */
export function driveValue(value: MotionValue, next: number, velocity: number): void {
  const drive = drivers.get(value);
  if (drive) drive(next, velocity);
  else value.set(next);
}
