# Neshel-UI: soporte multiplataforma (Windows, Linux y macOS)

> Alcance: Node.js 22.13+ (Node 22 y 24 en CI), pnpm fijado en `package.json`,
> React/TypeScript y CSS. **No se necesita WSL para desarrollar en Windows.**

## Aplicar el ZIP de actualización al repositorio existente

La actualización conserva los seis paquetes y **no incluye `.git` ni `node_modules`**.
Incluye únicamente archivos nuevos o modificados; el ZIP no tiene carpeta superior.

1. Guardá primero cualquier cambio local (`git status`). No sobrescribás trabajo
   sin revisar; el ZIP reemplazará algunos archivos de configuración/documentación.
2. Extraé el ZIP directamente sobre el **root** de Neshel-UI.
3. Revisá `git diff` antes de hacer commit.

**Windows / PowerShell 7:**

```powershell
# Ejecutar desde la raiz del repositorio (sin cambiar de carpeta)
Expand-Archive -LiteralPath "$HOME\Downloads\neshel-ui-cross-platform.zip" -DestinationPath . -Force
git status --short
git diff --stat
```

**Linux / macOS:**

```bash
cd /ruta/a/neshel-ui
unzip -o ~/Downloads/neshel-ui-cross-platform.zip -d .
git status --short
git diff --stat
```

## Requisitos

- Node.js 22.13+; se recomienda Node 22 para desarrollo local al iniciar.
- pnpm **12.16.1** (el `packageManager` es la referencia definitiva).
- Git. Claude Code es opcional.
- **Solo para Spec Kit:** Python 3.11+ y `uv` con `specify-cli`.

### Instalar pnpm (cualquier OS)

Usá la versión fijada por el repo:

```text
npm install --global pnpm@12.16.1
```

Se puede usar un gestor de Node de cada plataforma (`fnm`, `nvm`, `mise`,
Volta, etc.); no imponemos uno. `.nvmrc` y `.node-version` apuntan a Node 22.

## Desarrollo (los mismos comandos en los tres sistemas)

```text
pnpm install --frozen-lockfile
pnpm run doctor
pnpm lint
pnpm test
pnpm typecheck
pnpm build:packages
pnpm check:exports
pnpm build:playground
pnpm build:storybook
```

También: `pnpm format` (aplica las correcciones de Biome), `pnpm check` (doctor, lint,
tipos, tests, build y exports en un solo paso), `pnpm dev:playground`, `pnpm dev:storybook`.

`pnpm run doctor` comprueba la versión de Node y audita manifestos, scripts y
colisiones de nombres en rutas que pueden fallar en sistemas de archivos
case-insensitive. **No sustituye las pruebas de los runners nativos.**

`pnpm-lock.yaml` está commiteado. CI instala siempre con `--frozen-lockfile` para
proteger la reproducibilidad en Windows, macOS y Linux; si cambiás dependencias,
commiteá el lockfile actualizado en el mismo cambio.

Biome no procesa los archivos que administra Spec Kit (`.claude/skills/speckit-*` y
`.specify/{templates,scripts,workflows,integrations}`, más sus JSON de metadatos):
están registrados por hash en sus manifiestos y no se reformatean a mano.

## Spec Kit + Claude, sin scripts ligados a Windows

```text
uv tool install specify-cli
specify version
pnpm run spec-kit:init
```

`pnpm run spec-kit:init` invoca el CLI oficial en modo no interactivo usando
**`--script py`**, compatible con Windows/macOS/Linux. Preserva los archivos
de contexto existentes (`CLAUDE.md`, `AGENTS.md`, constitution y settings).
El inicializador modifica el repositorio: revisá `git diff` después.

> El wrapper `scripts/bootstrap-spec-kit.ps1` sigue disponible para Windows,
> pero redirige al mismo script Node. Algunos _extensions_ opcionales de Spec
> Kit pueden seguir requiriendo Bash o PowerShell; verificarlos al habilitarlos.

## CI — pruebas reales, no solo promesas

`.github/workflows/ci.yml` ejecuta en GitHub Actions:

| Host             | Runtime | Checks                                                |
| ---------------- | ------- | ----------------------------------------------------- |
| `ubuntu-latest`  | Node 22 | doctor, lint, tests, tipos, packages, Vite, Storybook |
| `windows-latest` | Node 22 | los mismos                                            |
| `macos-latest`   | Node 22 | los mismos                                            |
| `ubuntu-latest`  | Node 24 | los mismos                                            |

Matriz con `fail-fast: false`: un fallo de Windows no oculta uno de macOS.
Instalación con `--frozen-lockfile` y caché del store de pnpm (`actions/setup-node`,
clave derivada de `pnpm-lock.yaml`). El lint es un gate bloqueante. No hay workflow de
publicación npm ni secretos de publishing. La matriz Node 26 (decisión D1) llega en el
hito 001.4.

## Reglas para futuras contribuciones

- Preferir Node `node:fs`, `node:path`, `node:url` sobre `rm`, `cp`, `sed`, `grep`.
- Scripts npm independientes de la shell: nada de `export X=...`, `rm -rf`,
  comandos exclusivos de PowerShell, ni rutas absolutas del equipo.
- Importar con la misma capitalización que usa el archivo en disco.
- Mantener ESM y imports compatibles con Windows; probar rutas con espacios.
- Usar LF para código y scripts, vía `.gitattributes`.
- Verificar CSS, `.d.ts`, package exports y consumidores reales en los tres OS.
- No marcar ninguna fase como aprobada en macOS/Windows/Linux hasta ver
  resultados verdes en runners de GitHub Actions.

## Nota sobre publicación npm

Los paquetes siguen marcados como `private: true`. Esta actualización **no**
publica nada ni verifica disponibilidad del scope `@neshel-ui`.
