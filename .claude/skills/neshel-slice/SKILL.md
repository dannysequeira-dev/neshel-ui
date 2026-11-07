---
name: neshel-slice
description: Plan or implement a new Neshel-UI package feature through a Spec Kit slice. Use for tokens, layout, typography, components, or CLI work.
---

# Neshel slice workflow

1. Read `CLAUDE.md` and `.specify/memory/constitution.md`.
2. Open the active feature spec from `specs/` and identify unresolved questions.
3. If official Spec Kit commands are installed, use clarify -> plan -> tasks ->
   analyze, then implement only the smallest approved group of tasks.
4. Check architecture boundaries, TypeScript API and package exports.
5. Write tests (and a Storybook story for UI behavior) before marking work done.
6. Run `pnpm check` and relevant consumer builds; distinguish tests run from tests planned.
7. Document outcomes and stop for review before publication or remote pushes.
