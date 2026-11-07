# ADR 0003 — Cross-platform as an architectural requirement

**Date:** 2026-11-07  
**Status:** accepted for foundation 001  
**Supersedes:** Windows-only default assumption (not any package contract)

## Context

Neshel-UI is open source. Contributors and downstream npm consumers may use
Windows, Linux, or macOS. The maintainer uses Windows, but the distributable
output and build pipeline must not depend on that fact.

## Decision

1. Node.js and pnpm are the shared script runtimes; use OS-independent npm
   scripts and Node standard-library file/path operations.
2. GitHub Actions executes a native Linux, Windows and macOS matrix on Node 22,
   plus a Node 24 Linux compatibility job. Failing platforms remain visible.
3. Spec Kit initialization uses its official Python script mode via a Node
   wrapper. Official scripts are never copied manually into this repository.
4. Text files use LF; add automated smoke tests using spaces/unicode in paths.
5. CI bootstraps without a lockfile for the first install only; once committed,
   a frozen installation is mandatory.
6. This is a foundation update, not a reason to build React components early.

## Consequences

- More CI runtime and potential OS-specific dependency defects discovered early.
- New scripts require an entry in the portability audit if shell-bound.
- Local Linux-only green tests are insufficient for a cross-platform claim.
- All release approvals continue to require owner consent.

## Acceptance

`pnpm doctor`, `pnpm test` and workspace builds pass on all three native CI
systems. The repository has no OS-dependent npm script commands. Publishing
guards remain in place. The first real CI run is the authority on parity.
