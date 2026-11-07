# Agent instructions (tool-agnostic)

Primary agent context: [CLAUDE.md](CLAUDE.md).

Respect `.specify/memory/constitution.md` and specs. Work in small testable slices;
never automatically publish, push, disable package publishing guards or expose
personal/private project-name backstories. PowerShell 7 is the primary maintainer environment, **not** the only supported platform.
Contributors must support native Windows, Linux and macOS through pnpm/Node scripts;
see `docs/CROSS-PLATFORM.es.md` and `docs/decisions/0003-cross-platform-ci.md`.
