# Neshel-UI: preparar el repositorio en Windows 11 / PowerShell 7

## 0. Requisitos

- Node.js 22.13 o superior (`node --version`)
- pnpm 12.16.1 (fijado en `package.json`)
- Git (`git --version`)
- Opcional: GitHub CLI `gh`, Claude Code, Python 3.11+ y `uv` para Spec Kit.

## 1. Descomprimir sin carpeta intermedia

El ZIP **no trae una carpeta superior**. Contiene directamente `package.json`,
`pnpm-workspace.yaml`, `.claude/`, `.specify/`, `packages/`, `apps/`, etc.

```powershell
$root = 'C:\Users\Drica\projects\neshel-ui'
New-Item -ItemType Directory -Path $root -Force | Out-Null
Expand-Archive -Path "$env:USERPROFILE\Downloads\neshel-ui-starter.zip" -DestinationPath $root -Force
Set-Location $root
Get-ChildItem -Force
```

Usá el directorio real de tu máquina y la ruta donde descargaste el ZIP.

## 2. Primer commit e instalación

```powershell
node --version
pnpm --version
# Si falta pnpm: npm install --global pnpm@12.16.1

pnpm install
pnpm check:workspace
pnpm build:packages
pnpm check:exports
pnpm test
pnpm typecheck
pnpm lint
pnpm build:playground
pnpm build:storybook
```

**Importante:** `pnpm install` genera `pnpm-lock.yaml`: agregalo a Git.
Si Biome exige formateo en la primera ejecución: `pnpm format`, revisá el diff,
y repetí `pnpm lint`. Si falla alguna integración, que Claude investigue con
resultados reales en vez de ocultarla.

## 3. Inicializar Git y subir a un repositorio nuevo

```powershell
git init -b main
git add .
git commit -m "chore: bootstrap Neshel-UI monorepo"
```

Creá un repositorio **vacío** `neshel-ui` en tu cuenta de GitHub; no agregués un
README o `.gitignore` desde GitHub porque ya están aquí.

```powershell
git remote add origin https://github.com/TU-USUARIO/neshel-ui.git
git push -u origin main
```

O con GitHub CLI autenticado:

```powershell
gh repo create neshel-ui --public --source=. --remote=origin --push
```

No se hace ningún push desde el ZIP. Si querés repo privado primero, cambiá
`--public` por `--private`.

## 4. Preparar GitHub Spec Kit para Claude (opcional, recomendado)

**El ZIP ya incluye constitución y especificación, pero no las skills oficiales**.
Instalación oficial: https://github.github.io/spec-kit/installation.html

```powershell
uv tool install specify-cli
specify version
.\scripts\bootstrap-spec-kit.ps1
```

Si PowerShell bloquea la ejecución de scripts, revisá tu política y usá una
sesión que permita ejecutar el `.ps1` local. El script preserva el contenido de
nuestra constitución e invoca el `specify init` oficial con integración `claude`
y scripts para PowerShell.

Revisá `git status` y `git diff` antes de aceptar cualquier cambio generado.
No confundás `specify` (terminal) con `/speckit-*` (dentro de Claude Code).

## 5. Empezar con Claude

```powershell
claude
```

Pegá el prompt de [`docs/CLAUDE-FIRST-PROMPT.md`](CLAUDE-FIRST-PROMPT.md).
Claude primero debe **validar el bootstrap**, instalar lockfile y dejar la
base estable. Después se comienza el primer feature slice.

## 6. Arrancar aplicaciones de desarrollo

```powershell
pnpm dev:storybook
# otro terminal:
pnpm dev:playground
```

Storybook: puerto 6006. Vite: normalmente puerto 5173.

## Antes de publicar npm

Todavía **no** hay paquetes implementados, disponibles ni publicados. Revisar
scope, licencias, acceso, documentación, producción de tarballs, seguridad de
publishing y permisos GitHub antes de ejecutar cualquier `publish`.
