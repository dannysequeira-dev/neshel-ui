# First message to Claude Code

Copy this **after** extracting the ZIP, installing dependencies, initializing Git,
and optionally bootstrapping the official Spec Kit Claude integration.

---

**Claude, this repository is the new Neshel-UI open source design system.**

Before touching files, read and honor:

- `CLAUDE.md`
- `.specify/memory/constitution.md`
- `docs/vision.md`, `docs/architecture.md`, `docs/package-contracts.md`
- `docs/theming.md`, `docs/typography.md`, `docs/roadmap.md`
- `specs/001-foundation/spec.md` and ADRs.

The maintainer is on Windows 11 / PowerShell 7, but the library **must run and build on native Windows, Linux and macOS**. Treat `@neshel-ui` as a proposed npm scope, not
an available one. These packages are intentionally private scaffolds.

**First task (do not implement library components yet):**

1. Read `docs/CROSS-PLATFORM.es.md` and ADR 0003. Audit the repository, Node/pnpm configuration, package graphs, CSS exports and
   Storybook / Vite setup. Identify invalid or outdated dependencies and fix only
   confirmed setup problems; do not add features beyond the first specification.
2. Run `pnpm install` and commit a valid `pnpm-lock.yaml`. Run `pnpm run doctor`, `pnpm check:workspace`,
   `pnpm build:packages`, `pnpm check:exports`, `pnpm test`, `pnpm typecheck`,
   `pnpm lint`, `pnpm build:playground`, `pnpm build:storybook`. Report real results,
   including failures, fixes and environment constraints.
3. Confirm official Spec Kit commands are installed via `pnpm spec-kit:init` and do not overwrite our
   custom constitution or project-specific Claude skills. Use `/speckit-clarify`,
   `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze` as appropriate for the
   001-foundation spec. Keep a log of decisions in `docs/decisions/`.
4. Propose (do not execute yet) the next smallest vertical slice, preferably
   semantic tokens + typed `defineConfig` + CSS generator, with acceptance tests.
5. Ensure the GitHub Actions matrix includes native Windows/Linux/macOS; report each actual CI outcome, not inferred parity. End with a concise status report, outstanding gates and exact next step.

**Never push, publish to npm, remove `private: true`, create remote repos, or
claim release readiness without my explicit approval.**

---

After the foundation is verified, use the next Spec Kit slice for configuration and
tokens, then layout, then Capsize typography, then basic components.
