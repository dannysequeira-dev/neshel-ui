# Contract — Path geometry and morphing (S foundation)

**Status: see [../evidence.md](../evidence.md).** `src/svg/engine/` (`path-data.ts`, `geometry.ts`,
`morph.ts`), exported by `@neshel-ui/animations/svg`; pure functions (no DOM needed except `measurePath`);
research R8–R9; ADR 0029 §3.

## 1. Path data

```ts
parsePathData(d: string): PathCommand[]
serializePathData(commands: readonly PathCommand[], precision?: number): string

type PathCommand =
  | { type: "M" | "L"; x: number; y: number }
  | { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: "Q"; x1: number; y1: number; x: number; y: number }
  | { type: "A"; rx: number; ry: number; angle: number; large: boolean; sweep: boolean; x: number; y: number }
  | { type: "Z" };
```

- Grammar: SVG 2 path data — absolute and relative commands, implicit repetition (`M` pairs after the first
  become `L`), signed/decimal/exponent numbers without separators (`1.5.5`, `-1-2`, `1e-3`), arc flags packed
  without separators (`a1 1 0 00 1 1`).
- Exact normal form: absolute coordinates; `H`/`V` → `L`; `S` → `C` and `T` → `Q` (reflected controls);
  `Z` keeps its position and moves the current point to the subpath start. No precision is lost beyond IEEE
  doubles; geometry is unchanged.
- Errors: `NeshelAnimationsError` with the character offset for unknown commands, missing parameters,
  invalid flags, data not starting with a move, non-finite numbers (`NaN`, `Infinity`, `1e400`). Negative
  arc radii use their absolute value; zero radii make the arc a line (SVG rules).

## 2. Geometry

```ts
getPathGeometry(path: string | readonly PathCommand[]): PathGeometry
measurePath(element: SVGGeometryElement): number

interface PathGeometry {
  readonly length: number;                 // user units
  readonly subpaths: readonly { start: number; length: number; closed: boolean }[];
  pointAt(distance: number): { x: number; y: number; angle: number };  // clamped; angle in degrees
  bounds(): { x: number; y: number; width: number; height: number };
}
```

- Lines exact; quadratic/cubic Béziers by adaptive subdivision (flatness 0.05 user units, depth ≤ 10); arcs
  converted to centre parameterisation (radii scaled up when too small, SVG F.6.6) and flattened.
- Zero-length paths: `length` 0; `pointAt` returns the move point with angle 0. Disconnected subpaths:
  lengths add up; the jump between subpaths is not part of the length (as `getTotalLength`).
- `measurePath` uses `element.getTotalLength()` when it exists and returns a finite number (native, in user
  units), else the JS geometry of the `d` attribute; a `pathLength` attribute overrides the unit for dashes
  (the effects use it instead of the measured length). Transforms and `viewBox` do not change user-space
  length (R8). Local → global coordinates are not needed by any Phase 014 effect: dashes are in user units
  and S03 paths are in CSS px of the moving element (svg-api.md).

## 3. Morph

```ts
getPathMorphCompatibility(from: string, to: string, options?: MorphOptions):
  { compatible: true } | { compatible: false; reason: string; index: number }
interpolatePath(from: string, to: string, options?: MorphOptions): (t: number) => string

interface MorphOptions {
  normalize?: "exact" | "cubic";   // default "exact"
  precision?: number;              // decimals 0–6, default 3
}
```

| Rule                              | Policy                                                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Command equality                  | after the exact normal form, command `k` of both paths has the same type; `"cubic"` first promotes `L`/`Q` to `C` (exact degree elevation)  |
| Segment correspondence            | by index; no reordering, rotation of start points or reversal                                                                                |
| Point counts                      | must be equal (consequence of command equality); no resampling or insertion                                                                  |
| Cubic / quadratic                 | interpolated per control point; mixed only with `"cubic"`                                                                                    |
| Arcs                              | `rx`, `ry`, `angle`, end point interpolated; `large` and `sweep` flags must be equal; `"cubic"` does not convert arcs                        |
| Subpaths / closed paths           | same number of `M` and `Z` at the same indexes                                                                                               |
| Direction / orientation           | not normalised: a reversed path morphs through a fold (author paths in the same direction)                                                  |
| Precision                         | output rounded to `precision`; `t` clamped to 0–1; `t = 0` / `1` return the normal forms of the inputs                                       |
| Invalid geometry, NaN, ±Infinity  | rejected by the parser (§1)                                                                                                                  |
| Incompatible                      | `interpolatePath` throws `NeshelAnimationsError` naming the first mismatching command; effects offer `incompatible: "swap"` (switch at 0.5) |

The normal form changes the `d` string's spelling (absolute commands) but not the geometry; the restored
`d` after `destroy()` is the consumer's original attribute value, character for character.
