# Spec Kit integration status

This ZIP ships **project-specific Spec Kit content**, including the constitution and
an initial feature spec, but does **not** vendor GitHub Spec Kit's official scripts,
templates or Claude integration skills. Those must come from the official CLI.

On **Windows, Linux or macOS** (PowerShell, Bash or Zsh):

```text
uv tool install specify-cli
specify version
pnpm run spec-kit:init
```

`scripts/bootstrap-spec-kit.mjs` invokes the official initializer with:

```text
specify init --here --force --non-interactive --integration claude --script py --ignore-agent-tools
```

It backs up and restores our existing Claude context and constitution during
initialization. Review `git diff` afterwards and verify `.claude/skills/` and
`.specify/scripts/python/` were installed. The previous PowerShell wrapper still works. Then use `/speckit-*` commands in
Claude Code. Do not mistake the CLI command `specify` for the chat commands.

Docs: https://github.github.io/spec-kit/installation.html
