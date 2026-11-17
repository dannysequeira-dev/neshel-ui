# Contract — composition matrix (Phase 012)

**Status: implemented and verified locally** ([evidence](../evidence.md)). Unit tests in
`packages/animations/test/composition-012.test.mjs`; browser cases in the Phase 012 gallery suite.

| Combination                         | Expected result                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| Drag + Tilt3D                       | translate (drag) and rotateX/Y (tilt) in one composed transform; each clears independently       |
| Drag + Hover (lift) + Press (scale) | translate sums (drag + lift), scale multiplies (press); no layer overwritten                    |
| Drag + parallax (SP01/SP02)         | scroll layer and drag layer add; scroll compensation keeps the element under the pointer         |
| Drag + inertia + snap (G01/G02)     | one drag motion: decay projection selects the snap point, spring settles                         |
| Pinch + rotate (G08 + G09)          | shared pointers (non-exclusive), scale × and rotateZ + in one transform                          |
| FLIP + Hover                        | FLIP translate + hover lift add; offset-chain measurement ignores the lift                       |
| FLIP + Press                        | FLIP translate + press scale compose; pressing mid-FLIP does not restart it                      |
| FLIP + scroll transforms            | scroll layers ignored by the measurement, compose with the FLIP layer                            |
| Presence + Entrance                 | enter/exit run the consumer's Entrance preset (opacity factor + transform layer), then unmount   |
| Reorder + FLIP                      | reorder shifts siblings while dragging; after the consumer re-renders, the FLIP animator settles  |
| Layout transition + consumer inline styles | consumer `transform` stays the host baseline (prefix), restored exactly on destroy        |
| Drag + G11 squash                   | squash scale (non-uniform) multiplies with the drag translation                                  |
| Gestures + `touch-action` of consumer | composed intersection while attached; consumer's inline value restored exactly on detach      |

Every row is also checked for cleanup: after destroying all effects the element's `style` attribute equals
its original value and `getMotionDebugInfo`/`getGestureDebugInfo` report no listeners, sessions or tasks.
