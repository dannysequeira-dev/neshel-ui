# Contract — compatibility and fallback matrix (Phase 016)

"Main" = the catalogue behaviour; "Fallback" = what users get when the main driver is unavailable (never counted as
the main effect). Browser rows are verified in Playwright Chromium (SwiftShader WebGL2), Firefox and WebKit and in
headless Chrome (CDP); Safari, physical GPUs and devices are manual (K-rows in the evidence).

| Id  | Main driver             | Requires                                                | Fallback                         | Reported as                  |
| --- | ----------------------- | ------------------------------------------------------- | -------------------------------- | ---------------------------- |
| D01 | CSS 3D                  | `transform-style: preserve-3d`                          | cross-fade of the faces          | `data-neshel-flip="fade"`    |
| D02 | CSS 3D                  | per-face 3D transforms                                  | cross-fade                       | —                            |
| D03 | CSS 3D + JS spring      | `preserve-3d` (depth sort); z-index written as a backup | flat stacking by z-index         | —                            |
| D04 | WebGL2 mesh             | WebGL2, decodable CORS-clean raster `front`             | CSS rigid page turn              | `mode: "fallback"`, `reason` |
| D05 | CSS hinged fold         | `clip-path: polygon()`, 3D transforms                   | — (instant under reduced motion) | —                            |
| D06 | WebGL2 fragment shader  | WebGL2, CORS-clean image                                | original image, no distortion    | `mode: "static"`, `reason`   |
| D07 | CSS layers              | `clip-path: inset()`                                    | —                                | —                            |
| D08 | WebGL2 fragment shader  | WebGL2, CORS-clean image and map                        | original image                   | `mode: "static"`, `reason`   |
| D09 | CSS 3D plane            | 3D transforms, `mask-image` (fade)                      | no horizon fade                  | —                            |
| D10 | WebGL2 fragment shader  | WebGL2, CORS-clean image and depth map, matching aspect | original image                   | `mode: "static"`, `reason`   |
| D11 | `backdrop-filter` bands | `backdrop-filter` (or `-webkit-`), `mask-image`         | tint gradient or none            | `mode: "tint" \| "none"`     |

GPU failure reasons: `unsupported` (no WebGL2), `shader` (compile/link), `cors` (tainted texture), `texture`
(decode/size/aspect), `memory` (budget), `budget` (waiting for a context), `lost` (context lost, until restored).
