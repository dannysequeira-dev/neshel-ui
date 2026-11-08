---

## description: "Task list for feature 001 — reproducible monorepo foundation"

# Tasks: Reproducible monorepo foundation

**Input**: `specs/001-foundation/` — [spec.md](spec.md), [plan.md](plan.md),
[research.md](research.md), [data-model.md](data-model.md),
[contracts/quality-gates.md](contracts/quality-gates.md), [quickstart.md](quickstart.md)

**Tests**: The spec requires gate scripts and packed-artifact checks (FR-010, FR-015,
FR-020, FR-021); they are listed as tasks in the milestone that introduces them.

**Organization**: Phases follow the approved milestones. 001.1 is the blocking
foundational phase; later milestones map to user stories (US-01…US-06 in spec.md).
Milestones 001.2–001.5 are intentionally coarse and will be refined before implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story from spec.md (US1 = US-01, …)

---

## Phase 1: Setup — milestone 001.0, Spec Kit integration (DONE)

- [x] T001 Protect custom skills and repo configuration in `scripts/bootstrap-spec-kit.mjs`
- [x] T002 Run `pnpm run spec-kit:init` (Specify 1.2.6, Claude, `--script py`) and review the diff
- [x] T003 Verify 28/28 manifest hashes in `.specify/integrations/*.manifest.json` against git index blobs
- [x] T004 Enforce `* text=auto eol=lf` in `.gitattributes` and ignore `__pycache__/` in `.gitignore`
- [x] T005 Document per-checkout feature selection in `.specify/README.md`
- [x] T006 Record D1–D7 in `specs/001-foundation/spec.md`, ADR 0002/0004, ADR 0003 amendment

**Checkpoint**: commits `afe1494`, `beecf5f` (local).

---

## Phase 2: Foundational — milestone 001.1, tooling, lint and CI hygiene

**Purpose**: Clean, blocking lint gate and reproducible CI before distribution work.
**Independent test**: [quickstart.md](quickstart.md) §001.1 — all gates exit 0 locally.

### Biome configuration

- [x] T007 In `biome.json`, set `$schema` to `https://biomejs.dev/schemas/2.6.6/schema.json` and replace `"rules": { "recommended": true }` with `"rules": { "preset": "recommended" }` by hand (research R1; never apply `biome migrate --write`, which proposes `"none"`)
- [x] T008 In `biome.json` `files.includes`, append exactly `!.claude/skills/speckit-*`, `!.specify/templates`, `!.specify/scripts`, `!.specify/workflows`, `!.specify/integrations`, `!.specify/init-options.json`, `!.specify/integration.json` (research R2)
- [x] T009 Verify the exclusion: `pnpm exec biome check .` reports no path under the excluded patterns, and `pnpm exec biome check .specify/README.md .specify/memory/constitution.md .claude/skills/neshel-audit/SKILL.md` still checks 3 files

### First-party fixes

- [x] T010 [P] Replace the value-returning `forEach` callback with a `for…of` loop in `scripts/check-portability.mjs`
- [x] T011 [P] Replace the value-returning `forEach` callback with a `for…of` loop in `scripts/check-workspace.mjs`
- [x] T012 Run `pnpm format` (Biome `check --write`) on first-party files only
- [x] T013 Review the T012 diff for meaning changes in Markdown (tables, hard line breaks, lists), YAML (`pnpm-workspace.yaml`) and CSS (`packages/config/src/styles.css`); fix anything that changes meaning by hand
- [x] T014 Confirm `git diff --stat` touches no Spec Kit–managed file and that the manifest hash check from T003 still passes 28/28

### CI workflow — `.github/workflows/ci.yml`

- [x] T015 Remove the "initial bootstrap only" install step and its `hashFiles` conditions; keep a single `pnpm install --frozen-lockfile` step
- [x] T016 Move `pnpm/action-setup@v4` before `actions/setup-node@v4` and add `cache: pnpm` with `cache-dependency-path: pnpm-lock.yaml` to `setup-node` (research R3)
- [x] T017 Add a blocking `Lint` step running `pnpm lint` after `pnpm run doctor`; delete the trailing "Lint is still a manual gate" comment
- [x] T018 Keep the existing Node matrix unchanged (D1 matrix belongs to T033, research R6)

### Storybook and docs

- [x] T019 [P] Add `core: { disableTelemetry: true }` to `apps/storybook/.storybook/main.ts` (research R4)
- [x] T020 [P] Update the CI table and lint note in `docs/CROSS-PLATFORM.es.md` (lint is now a CI gate)

### Verification

- [x] T021 Run locally: `pnpm run doctor`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build:packages`, `pnpm check:exports`, `pnpm check`, `pnpm build:playground`, `pnpm build:storybook` (confirm no telemetry notice)
- [x] T022 Manually review every `run:` command in `.github/workflows/ci.yml` for shell neutrality (the portability audit only covers `package.json` scripts) and check YAML structure; record actual YAML/workflow validation as "pending push" because the repo has no declared YAML parser and GitHub validates on push
- [x] T023 Record results in `specs/001-foundation/evidence.md` §001.1, marking CI items "pending push"

**Checkpoint**: 001.1 local gates green; stop for maintainer review before committing.

---

## Phase 3: User Story 2 + 6 — milestone 001.2, package distribution correctness (P0)

**Goal**: Packed packages are correct and honest (ADR 0002, ADR 0004).
**Independent test**: `pnpm build:packages && pnpm check:pack` → 0 errors (SC-002–SC-004).

- [ ] T024 [US2] Remove unused `@neshel-ui/core` dependencies from `packages/{layout,typography,components}/package.json`; refresh `pnpm-lock.yaml`
- [ ] T025 [US2] Switch library tsconfigs `packages/*/tsconfig.json` to `module`/`moduleResolution` `NodeNext` with explicit `.js` extensions on relative imports (FR-018); apps keep `Bundler`
- [ ] T026 [US2] Set React peer to a React 19 range in React packages; include `src` in `files` so maps resolve; drop `sideEffects` CSS glob from `packages/cli/package.json` (FR-019 intentional contents)
- [ ] T027 [US6] Add `publint` and `@arethetypeswrong/cli` to the catalog and root devDependencies
- [ ] T028 [US6] Implement `scripts/check-pack.mjs` (`pnpm check:pack`) per data-model PackedArtifact rules, using a workspace-derived package list (FR-025); add `node:test` coverage in `tests/`
- [ ] T029 [US6] Derive package lists in `scripts/check-workspace.mjs`, `scripts/check-exports.mjs`, `scripts/clean.mjs`, `tests/workspace.test.mjs` from the workspace (FR-025)
- [ ] T030 [US6] Add `check:pack` to `pnpm check` and to `.github/workflows/ci.yml`; update `contracts/quality-gates.md` and `evidence.md`

## Phase 4: User Story 6 — milestone 001.3, external consumer smoke (P0)

- [ ] T031 [US6] Implement an external-consumer smoke script under `scripts/` (temp dir with spaces + Unicode outside the repo; install tarballs + Vite/Tailwind; build; assert `--neshel-` in CSS) (FR-021, SC-005)
- [ ] T032 [US6] Add it as a CI job on all three OSes; record results in `evidence.md`

## Phase 5: User Story 1 + 5 — milestone 001.4, matrix and documentation (P0/P1)

- [ ] T033 [US1] Set `.nvmrc` and `.node-version` to 26; CI matrix Node 26 × {ubuntu, windows, macos} + Node 22/24 × ubuntu in `.github/workflows/ci.yml` (D1)
- [ ] T034 [US1] Time-boxed Vite 8 spike (catalog, playground, Storybook, CI); adopt or record the blocker in `research.md` and an ADR (D4, SC-007)
- [ ] T035 [P] [US5] Evaluate GitHub Actions major versions for runtime deprecations in `.github/workflows/ci.yml`
- [ ] T036 [P] [US1] Refresh `docs/CROSS-PLATFORM.es.md`, `docs/roadmap.md`, `README.md`; retire `docs/VALIDATION-REPORT.md` in favour of `evidence.md`

## Phase 6: User Story 5 — milestone 001.5, native CI verification (P1)

- [ ] T037 [US5] With maintainer approval, push and record per-job CI results (run ID, OS, Node) in `specs/001-foundation/evidence.md` (SC-006)

## Phase 7: Polish & cross-cutting

- [ ] T038 Run `/speckit-analyze` after each milestone's tasks are refined; update `roadmap.md` status (implemented / local / CI)

---

## Dependencies & execution order

- Phase 1 (done) → Phase 2 (001.1, blocks everything) → Phase 3 (001.2) → Phase 4 (001.3, needs `check:pack` tarballs) → Phase 5 (001.4) → Phase 6 (001.5).
- Phase 5's Vite spike (T034) may run in parallel with Phases 3–4 on a separate local branch; it must not block them (D4).
- Within 001.1: T007–T009 before T012; T010/T011 independent; T015–T017 sequential (same file); T019/T020 parallel; T021–T023 last.

## Parallel examples

```text
001.1: T010 (check-portability.mjs) ‖ T011 (check-workspace.mjs) ‖ T019 (storybook main.ts) ‖ T020 (CROSS-PLATFORM.es.md)
001.4: T035 (workflow action versions review) ‖ T036 (docs refresh)
```

## Implementation strategy

Deliver one milestone at a time; each ends with local gates, an evidence entry and a
maintainer review before commit. 001.1 is the current authorized scope; nothing from
001.2+ is implemented until approved.
