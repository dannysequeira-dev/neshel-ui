# Neshel-UI: entorno de desarrollo en Windows 11 / PowerShell 7

> Guía para contribuir desde Windows. Linux y macOS usan exactamente los mismos comandos;
> la política multiplataforma y el CI están en [`CROSS-PLATFORM.es.md`](CROSS-PLATFORM.es.md).
> No se necesita WSL.

## 0. Requisitos

| Herramienta              | Versión                                              | Comprobar                          |
| ------------------------ | ---------------------------------------------------- | ---------------------------------- |
| Node.js                  | **26** (línea principal, `.nvmrc`); 22.13+ soportado | `node --version`                   |
| pnpm                     | **12.16.1** (fijado en `packageManager`)             | `pnpm --version`                   |
| Git                      | cualquiera reciente                                  | `git --version`                    |
| Python + `uv` (opcional) | Python 3.11+, solo para el CLI de Spec Kit           | `python --version`, `uv --version` |

Instalar pnpm si falta (cualquier gestor de Node sirve: `fnm`, `nvm-windows`, Volta, etc.):

```powershell
npm install --global pnpm@12.16.1
```

Git debe respetar `.gitattributes` (todo el texto se guarda en LF); no hace falta cambiar
`core.autocrlf`.

## 1. Clonar e instalar

```powershell
git clone https://github.com/dannysequeira-dev/neshel-ui.git
Set-Location neshel-ui
pnpm install --frozen-lockfile
```

`pnpm-lock.yaml` está versionado: la instalación nunca resuelve dependencias nuevas. Si
cambiás dependencias, commiteá el lockfile actualizado en el mismo cambio.

## 2. Verificar

```powershell
pnpm check            # doctor, lint, tipos, tests, build, tests de paquetes, exports y tarballs
pnpm check:consumer   # apps externas (Tailwind, CSS plano, configurada) desde tarballs (requiere red)
pnpm check:browser    # precedencia de temas en Chrome/Edge headless
pnpm build:playground
pnpm build:storybook
```

Todos deben terminar con código 0. `pnpm run doctor` informa la versión de Node recomendada
y audita scripts y rutas; no reemplaza el CI nativo.

## 3. Desarrollo diario

```powershell
pnpm dev:playground   # Vite (normalmente puerto 5173)
pnpm dev:storybook    # Storybook en el puerto 6006
pnpm format           # aplica las correcciones de Biome antes de commitear
pnpm lint
```

## 4. Spec Kit + Claude Code (opcional)

Spec Kit ya está instalado en el repositorio (`.specify/` y `.claude/skills/speckit-*`).
Solo hace falta el CLI para reinicializar o actualizar:

```powershell
uv tool install specify-cli
specify version
```

Seleccioná la feature activa una vez por clon (el puntero `.specify/feature.json` es local y
está ignorado por Git):

```powershell
$env:SPECIFY_FEATURE_DIRECTORY = "specs/001-foundation"
python .specify/scripts/python/check_prerequisites.py --json
Remove-Item Env:SPECIFY_FEATURE_DIRECTORY
```

Detalles y equivalente Bash/Zsh: [`.specify/README.md`](../.specify/README.md). Dentro de
Claude Code se usan los skills `/speckit-*`; no confundir con el comando `specify`.

## 5. Antes de publicar en npm

No hay paquetes publicados todavía. El PR de la versión 0.1.0 retira `private: true` de los cinco
paquetes públicos; `@neshel-ui/core` sigue privado. Ver [`releasing.md`](releasing.md): ningún `publish`,
release ni push sin aprobación explícita del maintainer.
