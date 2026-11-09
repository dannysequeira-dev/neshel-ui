# Specification analysis — feature 006 (006.0)

Cross-artifact consistency pass over brief.md, spec.md, research.md, contracts, plan.md and
tasks.md, following the `/speckit-analyze` checklist. Run 2026-11-08 before implementation.

## Findings

| ID  | Category       | Severity | Location                       | Finding                                                                                     | Resolution                                                                                                         |
| --- | -------------- | -------- | ------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| C1  | Constitution   | CRITICAL | brief §23 vs constitution VIII | Versioning to 0.1.0 with Changesets needs the private guard lifted, which is forbidden.     | Resolved: simulation in a temporary copy (R15); real transition is an owner-approved PR (contracts/release.md).    |
| C2  | Inconsistency  | HIGH     | roadmap 006/007 vs brief       | Roadmap row 007 owns the pipeline; the brief asks Phase 006 to prepare it.                  | Resolved: 006 prepares and dry-runs; executing publication stays owner-authorised (spec clarifications).           |
| C3  | Underspecified | HIGH     | brief §24 trusted publishing   | Trusted publishers cannot be configured for non-existent packages.                          | Resolved: bootstrap options (R16), owner decision listed in the gate.                                              |
| C4  | Ambiguity      | HIGH     | brief §17 downloads            | ZIPs would reference unpublished npm versions.                                              | Resolved: generated and verified now, linked only after publication (R9).                                          |
| C5  | Coverage       | HIGH     | release-readiness R1           | `light-dark()` fallback cannot be tested with modern engines.                               | Resolved: renamed-function stylesheet reproduces the unsupported path (R13, T050).                                 |
| C6  | Integrity      | HIGH     | brief §21 screen readers       | A manual SR evaluation cannot be fully automated by an agent.                               | Resolved: protocol + AX-tree evidence; R3 status reflects what a human executed (R12).                             |
| C7  | Defect         | MEDIUM   | `.changeset/*.md`              | Two changesets have corrupted frontmatter (Setext heading); Changesets would drop releases. | Resolved by T061 (repair + simulation asserts every package bumps).                                                |
| C8  | Underspecified | MEDIUM   | brief §5 deployment            | No domain; canonical URLs need an origin.                                                   | Resolved: `NESHEL_DOCS_SITE_URL`; unset → `noindex` (docs-site.md).                                                |
| C9  | Ambiguity      | MEDIUM   | brief §10 phone…wide           | `extend` with phone…wide collides with default widths (e.g. `phoneXL` 40rem = `sm`).        | Resolved: the end-to-end example uses `replace` (also used by the Next consumer); `extend` shown with other names. |
| C10 | Coverage       | MEDIUM   | brief §7 "every export"        | `cli` has no exports (empty entry) — coverage must target the `neshel` bin and its options. | Resolved: CLI coverage = commands/options from `neshel --help` checked against the CLI pages (T024).               |
| C11 | Duplication    | LOW      | docs/*.md vs website           | Maintainer guides and website could drift.                                                  | Accepted: website is the consumer source; repo guides link to it and keep maintainer/contract detail (T055).       |
| C12 | Fonts          | LOW      | brief §12 commercial fonts     | The site needs Inter for default metrics.                                                   | Resolved: `@fontsource-variable/inter` (OFL) in the docs app only (R4).                                            |

No CRITICAL or HIGH finding remains unresolved. Every FR maps to at least one task (tasks.md).
