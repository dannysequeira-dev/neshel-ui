# Neshel-UI: soporte multiplataforma (Windows, Linux y macOS)

> Windows, Linux y macOS tienen el **mismo nivel de soporte** para contribuidores y para
> consumidores de los paquetes. **No se necesita WSL.** Decisión: [ADR 0003](decisions/0003-cross-platform-ci.md).

## Política de runtime

| Ámbito                                                                 | Política                                                                                                                |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Desarrollo                                                             | **Node 26** (línea principal; `.nvmrc` y `.node-version`)                                                               |
| Mínimo para contribuir                                                 | Node **22.13** (`engines.node` raíz); `pnpm run doctor` lo verifica                                                     |
| pnpm                                                                   | **12.16.1**, fijado en `packageManager`; CI lo lee de ahí                                                               |
| Paquetes de navegador (`config`, `layout`, `typography`, `components`) | Sin `engines`; salida ESM ES2022 sin APIs de Node. Desarrollar con Node 26 **no** sube el requisito de los consumidores |
| `@neshel-ui/cli`                                                       | `engines.node >=22.13.0`                                                                                                |
| `@types/node`                                                          | Se mantiene en la línea 22 (el mínimo) para no usar APIs más nuevas por accidente                                       |

## Primer uso (mismos comandos en los tres sistemas)

```text
git clone https://github.com/dannysequeira-dev/neshel-ui.git
cd neshel-ui
pnpm install --frozen-lockfile
pnpm check
pnpm check:consumer
```

Guía detallada para Windows: [`SETUP-WINDOWS.es.md`](SETUP-WINDOWS.es.md). En Linux y macOS
instalá Node 26 con el gestor que prefieras (`fnm`, `nvm`, `mise`, Volta) y pnpm con
`npm install --global pnpm@12.16.1` o Corepack.

| Comando                        | Qué verifica                                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run doctor`              | Versión de Node, layout del workspace, scripts portables, colisiones de mayúsculas                                               |
| `pnpm lint` / `pnpm format`    | Biome (los archivos administrados por Spec Kit están excluidos: sus hashes están en los manifiestos)                             |
| `pnpm typecheck` · `pnpm test` | Proyectos TypeScript · suites `node:test`                                                                                        |
| `pnpm build:packages`          | Build limpio de todos los paquetes (borra `dist` antes)                                                                          |
| `pnpm check:exports`           | Que los targets de `exports` existan en `dist`                                                                                   |
| `pnpm check:pack`              | Tarballs reales de `pnpm pack`: manifiesto, targets, source maps, publint, attw, import/tipos desde fuera del repo, determinismo |
| `pnpm check:consumer`          | El tarball de `@neshel-ui/config` en una app externa React 19 + Vite + Tailwind v4 (requiere red)                                |
| `pnpm check`                   | doctor → lint → typecheck → test → build → check:exports → check:pack (sin red)                                                  |

## CI — resultados reales, no promesas

`.github/workflows/ci.yml` (sin secretos, sin publicación, permisos de solo lectura):

| Runner           | Node | Motivo                       |
| ---------------- | ---- | ---------------------------- |
| `ubuntu-latest`  | 26   | Línea principal              |
| `windows-latest` | 26   | Línea principal              |
| `macos-latest`   | 26   | Línea principal              |
| `ubuntu-latest`  | 22   | Compatibilidad con el mínimo |
| `ubuntu-latest`  | 24   | Compatibilidad intermedia    |

No es un producto cartesiano completo: el comportamiento propio de cada sistema operativo se
cubre en la línea principal, y las versiones de Node en Linux. Cada job ejecuta: instalación
`--frozen-lockfile` con caché del store de pnpm (clave `pnpm-lock.yaml`), doctor, lint,
tests, typecheck, build, check:exports, check:pack, check:consumer, build del playground y de
Storybook. `fail-fast: false` evita que un fallo oculte otro. Los runs de pull requests
obsoletos se cancelan; los pushes a `main` siempre conservan su resultado completo.

Estado de cada verificación: [`specs/001-foundation/evidence.md`](../specs/001-foundation/evidence.md).
**Cambiar la matriz no prueba nada hasta que GitHub Actions la ejecuta.**

## Spec Kit + Claude sin scripts ligados a una shell

Spec Kit usa su modo oficial de scripts Python (`--script py`). Reinicializar:

```text
uv tool install specify-cli
pnpm run spec-kit:init
```

El wrapper protege `CLAUDE.md`, la constitución, los skills `neshel-*` y la configuración, e
informa cualquier archivo protegido que Spec Kit intente cambiar. Revisá `git diff` después.
Para elegir la feature activa en un clon nuevo, ver [`.specify/README.md`](../.specify/README.md).

## Reglas para contribuciones

- Operaciones de archivos con `node:fs`, `node:path` y `node:url`; nada de `rm`, `cp`, `sed`
  o `grep` en scripts npm. `pnpm run doctor` audita los scripts.
- Scripts npm independientes de la shell: sin `export X=...`, sin `rm -rf`, sin comandos
  exclusivos de PowerShell o Bash, sin rutas absolutas del equipo.
- Procesos hijos sin shell cuando sea posible. En Windows, si hace falta la shell para un
  `.cmd`, pasá un único string y poné comillas solo en los argumentos (DEP0190; un nombre de
  `.cmd` entre comillas rompe `%~dp0`). Ver `scripts/lib/pnpm.mjs`.
- Directorios temporales con espacios y Unicode, creados con `scripts/lib/temp.mjs`: se
  borran al terminar y también con Ctrl+C/SIGTERM.
- Comparar rutas con `realpath` en ambos lados (macOS `/private/var`, nombres cortos de
  Windows).
- Importar con la misma capitalización que el archivo en disco
  (`forceConsistentCasingInFileNames` está activo).
- Todo el texto en LF (`* text=auto eol=lf`); un test lo verifica en el índice.
- Builds deterministas: `check:pack` empaqueta dos veces y exige tarballs idénticos.
- Ninguna fase se marca como aprobada en un sistema operativo sin un resultado verde de
  GitHub Actions en ese sistema.

## Publicación npm

Los seis paquetes mantienen `private: true`; no hay workflow de publicación y el scope
`@neshel-ui` no está verificado. Ver [`releasing.md`](releasing.md).
