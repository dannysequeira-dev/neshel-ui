---

## description: "Task list for feature 002 — design tokens, semantic theming and consumer configuration"

# Tasks: Design tokens, semantic theming and consumer configuration

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: required by the spec (FR-003, FR-013, SC-002–SC-006) and the constitution (VI).

**Organization**: phases follow the milestones (each a stop for owner review). User stories:
US1 zero-config Tailwind, US2 plain CSS, US3 theme precedence, US4 typed configuration,
US5 validate/generate. **Nothing below is started; 002.1 requires owner authorization.**

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependency on unfinished tasks in the same phase)
- **[USn]**: user story served; setup/foundational/polish tasks carry no story label
- Every task ends when its tests pass locally; CI status is recorded per milestone

---

## Milestone 002.1 — Contract data, generator core, shipped stylesheets

### Phase 1: Setup

- [x] T001 Create `specs/002-config-and-tokens/evidence.md` with the four status states (implemented / verified locally / verified in GitHub Actions / planned) and one section per milestone
- [x] T002 Add `jiti` `^2.7.0` and `colorjs.io` `~0.7.1` to `dependencies`, and `@neshel-ui/config` `workspace:^` to `peerDependencies` and `devDependencies` of `packages/cli/package.json`; refresh `pnpm-lock.yaml` with pnpm only
- [x] T003 [P] Create `packages/config/test/`, `packages/cli/test/`, `packages/config/type-tests/`; exclude them from `tsconfig.build.json` and the `files` allowlist of both packages
- [x] T004 Change root `package.json`: `test` → `node --test "tests/**/*.test.mjs"`, add `test:packages` → `node --test "packages/*/test/**/*.test.mjs"`, add `generate:tokens`, and order `check` as doctor, lint, typecheck, test, build:packages, test:packages, check:exports, check:pack; `pnpm check:portability` must pass
- [x] T005 Add a "Package tests" step (`pnpm test:packages`) after "Build packages" in `.github/workflows/ci.yml`

### Phase 2: Foundational (blocks all stories)

- [x] T006 [P] Write public types in `packages/config/src/types.ts` per [contracts/config-api.md](contracts/config-api.md) (without `ExactConfig`, which is T035)
- [x] T007 Write `colorRoles`, `contrastPairs` and `defaults` (palette of [contracts/tokens.md](contracts/tokens.md)), deep-frozen, in `packages/config/src/contract.ts`; re-export from `packages/config/src/index.ts`
- [x] T008 [P] Test contract data in `packages/config/test/contract.test.mjs`: role order and uniqueness match tokens.md, pairs reference valid roles, both default themes complete, objects frozen, `dist/index.js` has no `import`
- [x] T009 Implement `packages/cli/src/validate/colour.ts`: syntax allowlist, Color.js (`colorjs.io/fn`, sRGB/HSL/OKLCH only) parse, alpha, gamut check and CSS gamut mapping, `contrastWCAG21`; the only module importing `colorjs.io`
- [x] T010 [P] Test colour handling in `packages/cli/test/colour.test.mjs`: each accepted format, each rejected syntax (named, `var()`, `color-mix()`, `lab()`), malformed input, alpha, out-of-gamut, reference ratios (black/white 21, identical 1, palette values)
- [x] T011 Implement `packages/cli/src/resolve.ts`: defaults + light/dark overrides + named themes from resolved bases, radius derivation, font-stack serialization, code-point sorting of named themes
- [x] T012 Implement `packages/cli/src/generate/css.ts`: header, layer statement, `:root` tokens, complete light / system-dark / dark / named blocks, optional `@theme inline`, LF and trailing newline
- [x] T013 [P] Test resolution and generation in `packages/cli/test/generate.test.mjs`: golden CSS for defaults (tokens and tailwind variants), 21 roles + `color-scheme` per block, selector/at-rule allowlist, no resets/`url()`/`@font-face`, generate twice → identical, override and named-theme resolution
- [x] T014 Implement `packages/cli/src/validate/contrast.ts` and test built-in themes in `packages/cli/test/builtin-contrast.test.mjs`: every pair of both defaults meets its threshold; ratios match tokens.md to two decimals (SC-002)

### Phase 3: User Story 1 — Zero-config with Tailwind (P1)

**Goal**: one import of `tailwind.css` (or the `styles.css` alias) gives tokens, utilities and dark mode.
**Independent test**: Tailwind consumer from tarballs passes; drift test passes.

- [x] T015 [US1] Write `scripts/generate-default-css.mjs` (imports built `packages/cli/dist` generator, writes `packages/config/src/tokens.css` and `tailwind.css` with the "do not edit" header); delete the Phase 001 `packages/config/src/styles.css` source; document the regenerate workflow (edit `contract.ts` → `build:packages` → `generate:tokens` → rebuild) in `CONTRIBUTING.md`
- [x] T016 [US1] Update `packages/config/package.json` exports (`./tokens.css`, `./tailwind.css`, `./styles.css`) and its build to copy both files and `tailwind.css` → `dist/styles.css` (extend `scripts/copy-css.mjs` if needed)
- [x] T017 [P] [US1] Test in `packages/config/test/default-css.test.mjs`: committed CSS equals generator output (drift), `dist/styles.css` byte-identical to `dist/tailwind.css`, `tokens.css` has no `@theme`; plus `tests/no-hardcoded-colors.test.mjs` asserting no colour literals in `packages/{layout,typography,components}/src` (FR-002)
- [x] T018 [US1] Extend `scripts/check-pack.mjs` and `scripts/lib/pack-checks.mjs`: exact `config` export set, zero `config` dependencies, `node:`/import-free `dist/index.js`, alias identity, `cli` dependencies exactly `jiti` + `colorjs.io`, public workspace peer allowed only as a caret range, internal packages still rejected, no install lifecycle scripts (`preinstall`, `install`, `postinstall`, `prepare`) in any packed manifest (FR-023); negative cases in `tests/pack-checks.test.mjs`
- [x] T019 [US1] Switch `scripts/check-consumer.mjs` to a `tailwind` variant importing `tailwind.css`, extend utilities (new roles, radius scale, `font-neshel-mono`), add an alias build importing `styles.css`, derive expectations from shipped CSS; update `tests/consumer-checks.test.mjs`
- [x] T020 [P] [US1] Make `scripts/check-exports.mjs` resolve the new CSS subpaths
- [x] T021 [US1] Migrate `apps/playground-vite/src/styles.css` and `apps/storybook/src/styles.css` to `@neshel-ui/config/tailwind.css`
- [x] T022 [P] [US1] Update `packages/config/README.md` with the zero-config imports, the alias and the canonical order (final docs in T064)
- [x] T023 Run `pnpm check`, `pnpm check:consumer`, `pnpm build:playground`, `pnpm build:storybook`; record results in `evidence.md`
- [x] T024 Stop for owner review; push only with explicit approval and record the CI run (5 jobs) in `evidence.md`

---

## Milestone 002.2 — Cascade proof for shipped CSS

### Phase 4: User Story 2 — Plain CSS without Tailwind (P1)

**Goal**: `tokens.css` works as standard CSS. **Independent test**: plain consumer from tarballs.

- [x] T025 [US2] Add a `plain` variant to `scripts/check-consumer.mjs` (Vite + TypeScript, no Tailwind, imports `tokens.css`): no `@theme`, layer statement first, every declaration present, no unknown at-rule warnings in the build log
- [x] T026 [P] [US2] Cover plain-variant expectations in `tests/consumer-checks.test.mjs`

### Phase 5: User Story 3 — Theme precedence (P1)

**Goal**: precedence matrix verified by computed styles. **Independent test**: `pnpm check:browser`.

- [x] T027 [US3] Write `scripts/lib/cdp.mjs`: browser discovery (`NESHEL_CHROME`, per-OS paths), headless launch with temp profile, DevTools client on global `WebSocket`, `Emulation.setEmulatedMedia`, `Runtime.evaluate`, cleanup; pure discovery logic tested in `tests/cdp.test.mjs`
- [x] T028 [US3] Write `scripts/lib/browser-matrix.mjs`: fixture builder (stylesheets in a given order, root/nested elements) and expectations from resolved values, in a temp path with spaces and Unicode
- [x] T029 [US3] Write `scripts/check-browser.mjs` and root script `check:browser`: matrix rows 1–10 and cases C5–C9 against `tokens.css` fixtures and the built `tailwind`/`plain` consumers; fail when `CI=true` and no browser
- [x] T030 [P] [US3] Test in `tests/browser-matrix.test.mjs` that expectations cover every row × 21 roles × `color-scheme` and that fixtures emit the requested orders
- [x] T031 [US3] Add CI steps for both consumer variants and `check:browser` in `.github/workflows/ci.yml`; confirm a browser is found on Windows, Linux and macOS runners
- [x] T032 [P] [US3] Add `apps/storybook/src/Tokens.stories.tsx`: every role and pair with ratios in light and dark, a precedence story (system + nested scope); run the a11y addon
- [x] T033 [P] [US3] Add a light/dark/system selector and a nested scope demo to `apps/playground-vite/src/App.tsx`
- [x] T034 Record local results and a browser inspection of Storybook/playground in `evidence.md`; stop for owner review and approved push (SC-001, SC-005 for shipped CSS)

---

## Milestone 002.3 — Typed configuration and validation

### Phase 6: User Story 4 — Typed configuration (P2)

**Goal**: `defineConfig` types catch mistakes; validation reports them precisely.
**Independent test**: type fixtures and validator tests.

- [x] T035 [US4] Implement `defineConfig` and `ExactConfig` in `packages/config/src/define-config.ts`; export from `index.ts`
- [x] T036 [P] [US4] Positive type fixtures in `packages/config/type-tests/valid.ts` (contract example, named theme, metrics, readonly arrays)
- [x] T037 [P] [US4] Negative fixtures with `@ts-expect-error` in `packages/config/type-tests/invalid.ts`: misspelled role, named theme without `extends`, `extends` on `light`, `system` key, `version: 2`, unknown top-level key, extra key on a non-literal object
- [x] T038 [US4] Include `type-tests/` in `packages/config` typecheck only (excluded from build and pack)
- [x] T039 [US4] Implement `packages/cli/src/diagnostics.ts`: types, sorting, text formatting (TTY/`NO_COLOR`), did-you-mean (edit distance ≤ 2)
- [x] T040 [US4] Implement `packages/cli/src/validate/structure.ts` with every structural code of [data-model.md](data-model.md)
- [x] T041 [P] [US4] Test in `packages/cli/test/structure.test.mjs`: one negative case per code, all errors in one pass, sort order, metrics `info`
- [x] T042 [US4] Compose structure, colour and contrast stages with policy precedence in `packages/cli/src/validate/index.ts`
- [x] T043 [P] [US4] Test in `packages/cli/test/validate.test.mjs`: colour codes, alpha on `border` allowed, out-of-gamut warning, contrast under the four policy combinations of [contracts/cli.md](contracts/cli.md)
- [x] T044 [US4] Add a `defineConfig`-only bundle check to the `plain` consumer (`scripts/check-consumer.mjs`): size delta < 1 kB minified and no contract data in the chunk (SC-006); record evidence and stop for review

---

## Milestone 002.4 — CLI commands

### Phase 7: User Story 5 — Validate and generate (P2), part 1

**Goal**: `neshel validate` / `generate` per contract. **Independent test**: CLI negative matrix.

- [x] T045 [US5] Implement discovery in `packages/cli/src/load/discover.ts`
- [x] T046 [US5] Implement jiti loading in `packages/cli/src/load/load-config.ts` (`fsCache: false`, `moduleCache: false`, plain-object default export, error mapping to exit 3)
- [x] T047 [US5] Implement `packages/cli/src/output.ts`: resolution order, rejections, byte compare, temp sibling + rename, Windows `EPERM`/`EBUSY` retry, cleanup
- [x] T048 [US5] Implement `packages/cli/src/commands/validate.ts` and `generate.ts` (`--check`, `--strict`)
- [x] T049 [US5] Rewrite `packages/cli/src/bin.ts`: `parseArgs`, help/version, exit codes 0–5, `--debug`, stderr diagnostics / stdout summary; `src/index.ts` stays empty
- [x] T050 [P] [US5] Test helpers in `packages/cli/test/helpers.mjs`: temp dirs with spaces and Unicode, spawn `dist/bin.js`, fixture writers
- [x] T051 [P] [US5] Test discovery and loading (all exit 3 cases) in `packages/cli/test/load.test.mjs`, asserting that loading a TS config creates no files (FR-022)
- [x] T052 [P] [US5] Test `validate` (exit 1 cases with paths) in `packages/cli/test/cmd-validate.test.mjs`
- [x] T053 [P] [US5] Test `generate` in `packages/cli/test/cmd-generate.test.mjs`: write, unchanged keeps mtime, `--check` 0/4/4, output rejections and usage errors exit 2
- [x] T054 [P] [US5] Test I/O failures in `packages/cli/test/io.test.mjs`: unwritable target and injected rename failure exit 5 with the previous file intact
- [x] T055 [US5] Golden outputs for three fixture configs in `packages/cli/test/fixtures/golden/`, compared byte-for-byte on every CI job (SC-003)
- [x] T056 [P] [US5] Update `packages/cli/README.md`: commands, exit codes, output rules, trust model (FR-027)
- [ ] T057 Record evidence; stop for owner review and approved push (SC-003, SC-004)

---

## Milestone 002.5 — Configured consumer, documentation, closure

### Phase 8: User Story 5 — part 2, and cross-cutting polish

- [ ] T058 [US5] Add a `configured` variant to `scripts/check-consumer.mjs`: packed `cli` + `config`, `neshel.config.ts` with light/dark overrides and a `sepia` theme, `neshel generate` via the installed bin, build, assert generated declarations and layer statement
- [ ] T059 [US5] Extend `scripts/check-browser.mjs` with generated CSS: rows 11–12 and cases C1–C4 (import orders, leakage) on static fixtures and the configured consumer
- [ ] T060 [P] [US5] Cover configured expectations in `tests/consumer-checks.test.mjs` and `tests/browser-matrix.test.mjs`
- [ ] T061 [US5] Add CI steps for the configured consumer and generated-CSS browser cases
- [ ] T062 [P] [US3] Add a named-theme demo to `apps/playground-vite` using a workspace `neshel.config.ts` and explicit `neshel generate &&` in its `dev`/`build` scripts (FR-031; pnpm skips `pre*` scripts by default)
- [ ] T063 Execute [quickstart.md](quickstart.md) against packed tarballs and record it in `evidence.md` (SC-007)
- [ ] T064 [P] Finalize `packages/config/README.md`
- [ ] T065 [P] Update root `README.md` (theming section, links)
- [ ] T066 [P] Update `docs/package-contracts.md` distribution table and tested compatibility
- [ ] T067 [P] Rewrite `docs/theming.md` for the implemented contract
- [ ] T068 [P] Update `docs/architecture.md` statuses (implemented / verified)
- [ ] T069 Add a changeset (`.changeset/*.md`): `@neshel-ui/config` minor (new exports, tokens, palette, alias) and `@neshel-ui/cli` minor (commands)
- [ ] T070 Create `specs/002-config-and-tokens/traceability.md` mapping FR-001–FR-032, SC-001–SC-007 and US1–US5 to evidence
- [ ] T071 Run the full gate suite; update the Verification sections of ADR 0006/0007 with evidence
- [ ] T072 Closure report; stop for owner approval (no push or publish without approval; `private` guards unchanged)

---

## Dependencies & execution order

```text
002.1: T001–T005 → T006,T007 → T008 ‖ (T009 → T010) ‖ (T011 → T012 → T013) → T014
       → T015 → T016 → T017 ‖ T018 ‖ T019 ‖ T020 → T021, T022 → T023 → T024
002.2 (needs 002.1): T025 → T026 ; T027 → T028 → T029 → T030 ; T031 after T025+T029 ; T032 ‖ T033 → T034
002.3 (needs 002.1; T044 also needs T025 from 002.2): T035 → T036 ‖ T037 → T038 ; T039 → T040 → T041 ; T042 (needs T014, T040) → T043 ; T044 (needs T025, T035)
002.4 (needs 002.3): T045 ‖ T046 ‖ T047 → T048 → T049 → T050 → T051 ‖ T052 ‖ T053 ‖ T054 → T055 ; T056 ‖ ; → T057
002.5 (needs 002.2 and 002.4): T058 → T059 → T060 → T061 ; T062 ; T063 ; T064–T068 ‖ ; T069 → T070 → T071 → T072
```

- User-story order: US1 (002.1) → US2, US3 (002.2) → US4 (002.3) → US5 (002.4–002.5).
- 002.2 and 002.3 depend on 002.1; they may be reordered if the owner prefers, except that T044 needs the `plain` consumer (T025).

## Parallel examples

- 002.1 after T007: `T008`, `T009→T010`, `T011→T012→T013` in parallel.
- 002.3: `T036` and `T037` in parallel; `T041` and `T043` once their modules exist.
- 002.4 tests: `T051`–`T054` in parallel after `T050`.
- 002.5 docs: `T064`–`T068` in parallel.

## Implementation strategy

1. **MVP = 002.1**: zero-config Tailwind consumers get the final token contract and palette,
   generated by the real generator, without any CLI command exposed.
2. **002.2** proves the cascade before any configured CSS exists, so later failures isolate to
   generation.
3. **002.3 → 002.4** add typing, validation and the commands; **002.5** proves the configured mode
   end-to-end and closes the feature.
4. Each milestone: local gates → evidence → owner review → approved push → CI 5/5 recorded.
