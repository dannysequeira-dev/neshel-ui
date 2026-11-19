# Contract — Native support and fallback matrix (Phase 013)

Observed with Playwright 1.65 (research R1–R3; lab cases in evidence.md §4). **WebKit = Playwright's
WebKit 27.2 build, not Safari**; Safari behaviour is unverified until checked on real Safari.

| Capability / entry                        | Chromium 158                    | Firefox 159                 | WebKit 27.2                     | Fallback (any engine without it)                                    |
| ----------------------------------------- | ------------------------------- | --------------------------- | ------------------------------- | ------------------------------------------------------------------- |
| Same-document VT (PT01, PT03–PT06)        | native                          | native                      | native                          | update runs immediately, no animation                               |
| VT types (`:active-view-transition-type`) | native                          | native                      | native                          | `data-neshel-pt-direction`/`-effect` attributes on `<html>`         |
| `view-transition-class`                   | native                          | native                      | native                          | class-keyed CSS inert → UA cross-fade                               |
| Shared-element morph (PT02)               | native                          | native                      | native                          | `fallback: "flip"` (012 FLIP animator) or none                      |
| Persistent element (PT08)                 | native                          | native                      | native                          | element is the same node; it simply stays                           |
| Direction (PT04) via Navigation API       | native                          | native                      | native                          | router-provided direction, else `unknown` → neutral fade            |
| Cross-document VT (PT09)                  | native (push, forward traverse) | **none** — plain navigation | native (push, forward traverse) | plain navigation; back traverse may restore from bfcache unanimated |
| `pageswap` / `pagereveal`                 | yes                             | no                          | yes                             | effect defaults (no types)                                          |
| React `<ViewTransition>` (React 19.3.1)   | native through React DOM        | native through React DOM    | native through React DOM        | React < 19.3 without the export → plain children                    |
| Route progress (PT07)                     | CSS on package element          | CSS on package element      | CSS on package element          | always available                                                    |
| Timeline / cinematic (C01–C10)            | engine (motion host)            | engine (motion host)        | engine (motion host)            | n/a (no native dependency)                                          |
| C02 pin (CSS sticky)                      | yes                             | yes                         | yes                             | normal flow                                                         |

Statuses in evidence.md use three words only: **native verified** (observed in that engine), **fallback
verified** (the fallback path observed, e.g. Firefox MPA), **unverified** (not observed — e.g. real
Safari, Edge, mobile browsers on devices).
