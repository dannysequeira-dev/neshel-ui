# Visual verification — feature 008.0

Captured 2026-11-15 from the built playground lab (`apps/playground-vite/dist/animations.html`) in
headless Chrome 157 at 1280×900 through the DevTools protocol, with real mouse events.

| File                         | What it shows                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tilt-pointer-top-right.png` | Tilt3D "Basic" card with the pointer near its top-right corner: that corner recedes; other cards at rest.                                                                                   |
| `corner-recede-60.png`       | CornerRecede at amount 0.6: rigid plane, hinged fold, segmented tiles, WebGL mesh.                                                                                                          |
| `corner-recede-100.png`      | Amount 1.0. Rigid: the whole card tilts. Fold: flap about a straight crease. Segmented: stepped surface with visible joints. Mesh: smooth curvature (real deformation of a raster texture). |
| `scroll-scene-25.png`        | ScrollScene at 25 % progress: pinned stage, layers displaced by depth, progress bar at a quarter.                                                                                           |

Observations recorded in [research.md](../research.md) R7: the fold showed a hairline seam at rest
(two anti-aliased clip edges) in the first capture; fixed by collapsing the fold to zero at rest,
and the captures were retaken after the fix.
