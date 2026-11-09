# Visual verification — feature 005

Screenshots captured on 2026-11-08 with headless Chrome 156 (CDP) from the local Storybook build
(`pnpm build:storybook`, `storybook-static/iframe.html`), Windows 11. They document appearance;
behaviour is verified by `pnpm check:browser:components`.

| File                       | Story                         | Viewport | Notes                                                                                  |
| -------------------------- | ----------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `demo-a-desktop-light.png` | Demo A — Responsive dashboard | 1280 px  | Expanded sidebar, active item, cards, status badges                                    |
| `demo-a-desktop-dark.png`  | Demo A, dark theme            | 1280 px  | Same tokens resolved by `data-neshel-theme="dark"`                                     |
| `demo-a-rail.png`          | Demo A after SidebarTrigger   | 1280 px  | Icon rail (3.5rem); captured before the rail footer `nowrap` fix (footer text wrapped) |
| `demo-a-mobile-drawer.png` | Demo A, mobile drawer open    | 390 px   | Sidebar content moved into the modal sheet; close button focused                       |
| `demo-b-form.png`          | Demo B — Advanced form        | 900 px   | Input, Select, Combobox (single, multiple), MultiSelect                                |
