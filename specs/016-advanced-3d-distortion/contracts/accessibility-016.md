# Contract — accessibility (Phase 016)

Applies the 008 accessibility contract and the 010–015 rules. Rows are verified by unit tests (jsdom) and the
in-page browser suite; manual screen-reader and device passes are listed in [manual-checks.md](../manual-checks.md).

| Rule                                   | D01                               | D02                           | D03                                      | D04               | D05                 | D06                 | D07                | D08           | D09               | D10          | D11                 |
| -------------------------------------- | --------------------------------- | ----------------------------- | ---------------------------------------- | ----------------- | ------------------- | ------------------- | ------------------ | ------------- | ----------------- | ------------ | ------------------- |
| Reduced motion (initial + live)        | fade / instant                    | fade                          | static (jumps)                           | instant           | instant             | off                 | off                | static        | static            | static       | static              |
| Content exists once in the AX tree     | faces distinct; hidden face inert | inactive panels inert         | non-front items inert                    | `<img>` kept      | flap inert, ID-free | `<img>` kept        | layers aria-hidden | `<img>` kept  | layer aria-hidden | `<img>` kept | overlay aria-hidden |
| Keyboard                               | toggles are native buttons        | consumer controls; focus kept | ←/→/Home/End                             | consumer controls | focus-visible fold  | — (decorative)      | focus trigger      | focus-visible | —                 | —            | —                   |
| Focus never on hidden content          | yes                               | yes                           | yes                                      | n/a               | flap inert          | n/a                 | layers inert       | n/a           | n/a               | n/a          | n/a                 |
| No essential content hidden on failure | n/a                               | n/a                           | n/a                                      | img / CSS shown   | n/a                 | img shown           | n/a                | img shown     | n/a               | img shown    | content shown       |
| Flashing ≤ 3/s, bounded area           | —                                 | —                             | —                                        | —                 | —                   | smooth waves        | hard cap 3 Hz      | —             | —                 | —            | —                   |
| No pointer capture / no scroll hijack  | yes                               | yes                           | capture only during a drag; `pan-y` kept | yes               | yes                 | passive, no capture | yes                | yes           | yes               | yes          | yes                 |
| Exact restore on destroy               | yes                               | yes                           | yes                                      | yes               | yes                 | yes                 | yes                | yes           | yes               | yes          | yes                 |

Notes: decorative canvases are `aria-hidden` + `role="presentation"`; package layers never intercept events; the
D03 live region is polite and announces only on navigation; D07 never animates under reduced motion and has no
option above 3 slice changes per second.
