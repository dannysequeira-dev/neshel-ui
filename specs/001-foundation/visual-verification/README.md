# US-03 browser verification (2026-11-08)

Real browser rendering of the Vite playground and Storybook dev servers, captured with
headless Google Chrome 156.0.8078.81 driven through the Chrome DevTools Protocol from a
disposable local script (not part of the repository; no dependencies added). The theme toggle
was clicked with real mouse events (`Input.dispatchMouseEvent`), not `element.click()`.
Environment: Windows 11, Node 26.13.0, pnpm 12.16.1, Vite 8.3.6, Storybook 10.6.6, commit
`16a183c`, viewport 1280×900.

| File                             | What it shows                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `playground-1-default-light.png` | `pnpm dev:playground` on load: default (light) tokens, no `data-neshel-theme`         |
| `playground-2-dark.png`          | After the first click on "Toggle sample theme": `data-neshel-theme="dark"`            |
| `playground-3-light-again.png`   | After the second click: `data-neshel-theme="light"`                                   |
| `storybook-1-manager.png`        | `pnpm dev:storybook`, story "Foundations / Welcome – Default"                         |
| `storybook-2-story-canvas.png`   | The story canvas (`iframe.html?id=foundations-welcome--default`)                      |
| `report.json`                    | Computed tokens and colours per state, console messages, failed requests, navigations |

## Observed

| Property                 | Light (load)                        | Dark (1st click)                 | Light (2nd click) |
| ------------------------ | ----------------------------------- | -------------------------------- | ----------------- |
| `data-neshel-theme`      | none                                | `dark`                           | `light`           |
| `color-scheme`           | light                               | dark                             | light             |
| `--neshel-primary`       | `#6d28d9`                           | `#c4a6ff`                        | `#6d28d9`         |
| `--neshel-background`    | `#ffffff`                           | `#0d0b13`                        | `#ffffff`         |
| `--neshel-surface`       | `#f7f4fa`                           | `#191521`                        | `#f7f4fa`         |
| `main` background / text | rgb(255,255,255) / rgb(24,18,31)    | rgb(13,11,19) / rgb(246,242,250) | as light          |
| Card background / border | rgb(247,244,250) / rgb(230,222,238) | rgb(25,21,33) / rgb(41,33,54)    | as light          |
| Button background / text | rgb(109,40,217) / rgb(255,255,255)  | rgb(196,166,255) / rgb(24,18,31) | as light          |

Storybook story: rendered; "Neshel-UI" label in rgb(109,40,217); section border
rgb(230,222,238); `--neshel-primary` `#6d28d9` inside the preview iframe.

Console: no errors or uncaught exceptions from application code. Only entries: Vite HMR debug
messages, the React DevTools info message, one Storybook 11 deprecation warning
(`ariaLabel` on `PopoverProvider`, Storybook UI), Chrome verbose rendering notes, and
`404 /favicon.ico` on both servers (the apps define no favicon).

Notes: Inter is not loaded, so the fallback system font renders (font loading is the
consumer's responsibility, constitution V). The Phase 001 baseline `--neshel-primary` is
violet, while the brand identity is a navy rose with gold accents; the final palette belongs
to feature 002. Starting both dev servers at the same time runs `build:packages` twice; in
the first attempt the second build rewrote `packages/config/dist/styles.css` and Vite
reloaded the open playground once (no error).

## Manual reproduction (any OS)

```text
pnpm dev:playground     # open http://localhost:5173
```

1. The card shows "Neshel-UI", "Foundation playground" and a violet "Toggle sample theme" button on white.
2. In DevTools → Elements, `<html>` has no `data-neshel-theme`; Computed shows `--neshel-primary: #6d28d9`.
3. Click the button: the page turns near-black, the button lilac; `<html data-neshel-theme="dark">`; `--neshel-primary: #c4a6ff`.
4. Click again: light colours return; `data-neshel-theme="light"`.
5. Console: no red errors except a possible `favicon.ico` 404.

```text
pnpm dev:storybook      # open http://localhost:6006
```

6. "Foundations → Welcome → Default" renders the "Foundation baseline" card with the violet "Neshel-UI" label.

Start the two servers one after the other (or run `pnpm build:packages` once first) to avoid
the concurrent rebuild described above.
