# Spec Kit integration status

**Installed:** official Specify CLI 1.2.6, Claude integration, Python script mode
(`.specify/init-options.json`). Project-owned files in this directory are this README
and `memory/constitution.md`; everything else under `.specify/` and the
`.claude/skills/speckit-*` skills are managed by Spec Kit and hash-tracked in
`.specify/integrations/*.manifest.json`. Do not hand-edit or reformat them; refresh
them with the CLI.

## Re-initialize or upgrade (Windows, Linux or macOS)

```text
uv tool install specify-cli
specify version
pnpm run spec-kit:init
```

`scripts/bootstrap-spec-kit.mjs` runs:

```text
specify init --here --force --non-interactive --integration claude --script py --ignore-agent-tools
```

It backs up project context, custom `neshel-*` skills and repository configuration,
restores them afterwards and prints the path of Spec Kit's proposed version of any
protected file it changed, so it can be reviewed. Always review `git diff` afterwards.

Spec Kit 1.2.6 also installs `.specify/scripts/powershell/`; the Claude skills invoke
only the Python scripts (`python .specify/scripts/python/*.py`), which need Python 3.11+
available as `python` on `PATH`.

## Selecting the active feature (per checkout)

Spec Kit reads the active feature from `SPECIFY_FEATURE_DIRECTORY` or from
`.specify/feature.json`. That file is machine-local and git-ignored, so each fresh
clone selects the feature once. Running Spec Kit's own prerequisite script with the
variable set persists the pointer:

PowerShell 7 (Windows, Linux, macOS):

```powershell
$env:SPECIFY_FEATURE_DIRECTORY = "specs/001-foundation"
python .specify/scripts/python/check_prerequisites.py --json
Remove-Item Env:SPECIFY_FEATURE_DIRECTORY
```

Bash / Zsh (Linux, macOS, Git Bash):

```bash
SPECIFY_FEATURE_DIRECTORY=specs/001-foundation python .specify/scripts/python/check_prerequisites.py --json
```

The file then contains `{"feature_directory":"specs/001-foundation"}`. Before
`plan.md` exists the script also prints `plan.md not found`; that is expected and the
pointer is still written. Do not commit `.specify/feature.json`. `--paths-only` does
**not** persist the pointer.

Use `/speckit-*` skills in Claude Code. Do not mistake the CLI command `specify` for
the chat commands.

Docs: https://github.github.io/spec-kit/installation.html
