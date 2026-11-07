# Spec Kit integration status

This ZIP ships **project-specific Spec Kit content**, including the constitution and
an initial feature spec, but does **not** vendor GitHub Spec Kit's official scripts,
templates or Claude integration skills. Those must come from the official CLI.

On Windows / PowerShell:

```powershell
uv tool install specify-cli
specify version
.\scripts\bootstrap-spec-kit.ps1
```

`scripts/bootstrap-spec-kit.ps1` invokes the official initializer with:

```text
specify init --here --force --non-interactive --integration claude --script ps --ignore-agent-tools
```

It makes a temporary in-memory backup of `constitution.md` and restores it after
initialization. Review `git diff` afterwards and verify `.claude/skills/` and
`.specify/scripts/powershell/` were installed. Then use `/speckit-*` commands in
Claude Code. Do not mistake the CLI command `specify` for the chat commands.

Docs: https://github.github.io/spec-kit/installation.html
