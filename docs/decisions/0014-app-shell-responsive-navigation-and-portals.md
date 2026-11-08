# ADR 0014 — Application shell, responsive navigation and theme-preserving portals

- Status: **Accepted** (2026-11-08, within the owner's Phase 005 brief)
- Date: 2026-11-08
- Feature: [005](../../specs/005-components-navigation-shell/spec.md); normative detail in
  [contracts/shell-and-overlays.md](../../specs/005-components-navigation-shell/contracts/shell-and-overlays.md)

## Context

The shell and mobile navigation switch behaviour at a configurable breakpoint whose threshold
lives only in generated CSS (ADR 0010: no runtime breakpoint registry, no browser evaluation of
`neshel.config.ts`). The switch also changes JavaScript behaviour (rail vs drawer, focus
management) and must not cause hydration mismatches. Overlays portal to `document.body`, outside
nested theme boundaries.

## Decision

1. **CSS decides the mode.** A responsive class (`neshel-<bp>-shell-desktop`,
   `neshel-<bp>-menu-desktop`) sets layout custom properties and `--neshel-*-mode`; JavaScript
   reads the computed value after mount and on `resize`. Markup never depends on the mode before
   hydration.
2. **Local context only.** `AppShell` owns `collapsed` and `mobileOpen` (controlled or
   uncontrolled) in a context used by Sidebar and SidebarTrigger; no application Provider.
3. **Single instance.** Sidebar children render either inline (desktop) or in a modal sheet
   (mobile, open), never both; MobileMenu content exists only while open.
4. **Theme-preserving portals.** Overlay roots register their trigger; content copies the nearest
   `data-neshel-theme` onto a `display: contents` wrapper inside the portal (fallback: the
   focused element at open time); `container` overrides the target.
5. Persistence of `collapsed` is the application's responsibility (`defaultCollapsed` from the
   server, `onCollapsedChange` to store).

## Consequences

- Shell thresholds follow `neshel generate` automatically in `extend` and `replace` modes.
- A brief moment before hydration where the trigger assumes desktop state; layout itself is
  correct from the first paint because CSS controls it.
- Inline custom-property overrides on arbitrary ancestors are not copied (use `container`).
- Children of the sidebar remount when switching between inline and sheet hosts.

## Alternatives considered

- `matchMedia` with thresholds in JavaScript: requires a runtime registry (rejected in ADR 0010).
- Rendering the sidebar twice and hiding one copy: duplicated landmarks and ids.
- Portalling into the theme boundary: inherits overflow, transforms and stacking contexts.
- A global ThemeProvider for portals: contradicts the no-Provider theming principle.
