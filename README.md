# mis-finanzas

App de finanzas personales que ayuda a crear presupuestos y a categorizar gastos.

Proyecto de ejemplo del LAB10: el foco esta tanto en el codigo como en el
**flujo de trabajo especificacion-primero** con el que se construye.

## Requisitos

- Node >= 22
- npm

## Puesta en marcha

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest run
```

Ambos comandos deben pasar en limpio antes de cualquier commit. Corren tambien
en CI (ver `.github/workflows/ci.yml`) sobre cada push y cada pull request.

## Estado

No hay features implementadas todavia. `src/index.ts` y `tests/smoke.test.ts`
son andamiaje: existen para que el toolchain sea verificable desde el primer
commit, y se reemplazan por codigo real en cuanto la primera feature pase por
el flujo de abajo.

## Estructura

```
.
├── .claude/skills/       # skills del proyecto: brainstorming, specify, skill-creator
├── docs/specs/           # un directorio por feature: requirements / design / tasks
├── src/                  # codigo de la app
├── tests/                # tests de vitest
└── CLAUDE.md             # instrucciones del proyecto para Claude Code
```

## Flujo de trabajo

```
/brainstorming → requirements.md → [gate] → design.md → [gate] → tasks.md → [gate] → Ejecucion (TDD) → Verificacion → commit
```

Cada `[gate]` es una parada real: se presenta el documento y no se avanza sin
aprobacion explicita. Los detalles completos —notacion EARS para los criterios
de aceptacion, la bitacora de decisiones de `tasks.md`, las reglas de trabajo—
estan en [CLAUDE.md](./CLAUDE.md).

Reglas cortas:

- Una feature a la vez.
- TDD: test que falla → implementar → test que pasa.
- No agregar dependencias sin necesidad.
