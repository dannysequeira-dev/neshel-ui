# Security policy

## Supported versions

Neshel-UI 0.1.0 is published on npm. Security fixes target the
latest published 0.x minor version only.

| Version           | Supported   |
| ----------------- | ----------- |
| 0.1.x             | Yes         |
| unreleased `main` | Best effort |

## Reporting a vulnerability

Please **do not** open a public issue for a vulnerability, and never post exploit details, leaked
credentials or private data in issues or pull requests.

Report privately through GitHub's **private vulnerability reporting** ("Security" tab →
"Report a vulnerability") on [dannysequeira-dev/neshel-ui](https://github.com/dannysequeira-dev/neshel-ui).
If that option is not available, open a minimal public issue asking a maintainer to contact you,
without technical details.

There is no staffed security team and therefore no formal response-time commitment. Reports are
handled by the maintainers on a best-effort basis; you will be credited unless you prefer otherwise.

## Scope notes

- `neshel.config.ts` is **executable, trusted project code** run by the CLI with your privileges
  (like `vite.config.ts`). Running the CLI on an untrusted configuration file is not a vulnerability
  of the CLI.
- Published packages are built and published from GitHub Actions; once trusted publishing is
  configured, every version carries npm provenance. A package version without provenance after that
  point should be treated as suspicious and reported.
