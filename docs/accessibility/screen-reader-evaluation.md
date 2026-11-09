# Screen-reader evaluation (release requirement R3)

Feature 006 — honest scope statement and a ready-to-run manual protocol.

## What has been done

| Evidence                                                                                  | Engines / tools                               | Result                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility-tree snapshots of a Dialog and an open MultiSelect listbox (`ariaSnapshot`) | Playwright Chromium, Firefox, WebKit          | Roles, names and structure identical across engines (dialog named by its title, labelled textbox and combobox, grouped listbox with named groups) — see [`browsers-report.local.json`](../../specs/006-docs-dx-release/evidence/browsers-report.local.json) and the CI artefact `browsers-report-*` |
| axe-core (light, dark, and with open listboxes)                                           | Chromium, Firefox, WebKit; Chrome (CDP suite) | No violations                                                                                                                                                                                                                                                                                       |
| Defect found and fixed through this evidence                                              | —                                             | Selection listboxes had **no accessible name**; they now take the name of their control                                                                                                                                                                                                             |

## What has NOT been done

**No human has yet operated the components with a real screen reader** for this release
candidate. Accessibility-tree snapshots show what assistive technology receives; they do not show
how NVDA, JAWS, VoiceOver or Narrator announce it, nor verbosity, focus-following or live-region
timing. Neshel-UI therefore makes **no claim of screen-reader conformance**.

## Manual protocol (≈ 45 minutes per pairing)

Recommended pairings (at least one before 0.1.0, ideally two):

| Platform   | Screen reader      | Browser |
| ---------- | ------------------ | ------- |
| Windows 11 | NVDA 2025.x (free) | Firefox |
| macOS      | VoiceOver          | Safari  |
| Windows 11 | Narrator           | Edge    |

Test target: the documentation site component pages (`pnpm docs:build && pnpm docs:preview`) or a
starter. For each step record _what was announced_ and _pass / issue_.

1. **Button** — Tab to a button; name and role announced; loading button announced as dimmed/unavailable.
2. **Dialog** — open from its trigger: dialog role, title and description announced; Tab cycles inside;
   Escape closes; focus returns to the trigger and is announced.
3. **AlertDialog** — initial focus on Cancel announced; outside click does nothing.
4. **Select** — label and current value announced on focus; opening announces the listbox and its
   name; arrow keys announce options and selected state; Escape keeps the value.
5. **MultiSelect** — selecting announces state; removing a chip announces "X removed" (live region)
   and focus moves to the next chip.
6. **Combobox** — typing announces the number or first result; "No results" announced; selection
   announced; inside a Popover, the first Escape closes only the list.
7. **DropdownMenu** — menu role, item count/position, checkbox and radio states announced.
8. **NavigationMenu / Navbar** — navigation landmark named; current page announced.
9. **AppShell / Sidebar** — on a narrow viewport the drawer is announced as a dialog titled by
   `mobileTitle`; activating a link closes it.
10. **Typography** — heading levels navigable with the screen reader's heading list.

Record results in a copy of the table below and attach it to the release PR.

| Step | Announcement | Result | Notes |
| ---- | ------------ | ------ | ----- |
| 1    |              |        |       |

## Status

R3 automated browser coverage: **met** (Chromium, Firefox, WebKit on Linux and macOS CI).
R3 manual screen-reader workflow: **protocol ready, execution pending** — an owner/maintainer action
before (or explicitly accepted for) the 0.1.0 publication.
