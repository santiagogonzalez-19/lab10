# Manejo de mis finanzas personales

Proyecto de ejemplo para una app de **finanzas personales** que ayuda a crear los presupuestos y categorizar los gastos.

## Stack

- TypeScript + Node
- Vitest (tests)

## Comandos de verificación

```bash
npm run typecheck # tsc --noEmit
npm test # vitest run
```

## Workflow de trabajo

```
/brainstorming → requirements.md → [gate] → design.md → [gate] → tasks.md → [gate] → Ejecución (TDD) → Verificación → loop E2E → [gate] → commit
```

Cada `[gate]` es una parada real: se presenta el documento y no se avanza sin aprobación explícita. Un requisito equivocado que pasa a diseño se multiplica en decisiones de arquitectura equivocadas, así que el gate es el punto más barato para cambiar de opinión.

| Fase | Skill | Qué produce |
|---|---|---|
| Explorar la idea | `/brainstorming` | un diseño acordado en la conversación; no escribe archivos |
| Especificar | `/specify` | `docs/specs/<YYYY-MM-DD>-<slug>/requirements.md`, `design.md` y `tasks.md` |
| Ejecutar | — | tests y código, en TDD; y la bitácora de cada tarea en `tasks.md` |
| Verificar de punta a punta | `/verify-implementation` | `e2e-tests-plan.md`, `e2e/<slug>.spec.ts` y `e2e-tests-report.md` |

`/brainstorming` termina en un diseño aprobado y encadena con `/specify`. `/specify` cubre los tres documentos y se detiene ahí: escribir el código queda fuera de su alcance.

## El loop E2E

Cuando las tareas de un spec quedan en `Hecha`, `/verify-implementation` cierra el ciclo con un loop autónomo de hasta **3 rondas**. Es el orquestador y tiene la ventana de contexto principal; lo caro —explorar el navegador, correr la suite, leer trazas— vive en subagentes cuyo contexto se descarta, y lo que vuelve son tres archivos cortos.

```
ronda N (máx. 3)
  [skill]     plan-test-cases  → docs/specs/<spec>/e2e-tests-plan.md   (1 happy path + 2 de error)
  [subagente] generate-tests   → e2e/<slug>.spec.ts                    (Playwright, selectores contra la app viva)
  [subagente] healer           → docs/specs/<spec>/e2e-tests-report.md (corre, diagnostica, NO arregla)
  verify-implementation lee el veredicto:
    verde → cierra   ·   falla-de-test → regenera   ·   falla-de-codigo → arregla en TDD y reitera
    bloqueado o 3 rondas agotadas → para y lo lleva al usuario
```

La separación de permisos es el punto: **`verify-implementation` es el único que edita código de producción**, `generate-tests` solo escribe en `e2e/`, y el `healer` solo escribe su reporte. Un diagnosticador que arregla lo que diagnostica deja de ser evidencia: la ronda siguiente ya no puede saber si el verde vino de que la app mejoró o de que el test se relajó.

Tres casos por spec, ni dos ni cuatro. El tope no es pereza: el loop es un muestreo de usuario por encima de los unitarios de `design.md` §7, no un reemplazo de la trazabilidad de `tasks.md` §5. Y un E2E solo puede fallar contra algo que `requirements.md` fija — un comportamiento que ningún criterio cubre es alcance nuevo y vuelve a `/specify`, no al arreglo.

`tasks.md` es a la vez el plan y su registro. El plan de cada tarea se escribe una vez y no se toca; la bitácora se va escribiendo **durante** la implementación, con las decisiones que se tomaron, los desvíos respecto del diseño y lo que se descubrió. Por eso no se retoca el plan para que coincida con lo que terminó pasando: la diferencia entre lo planeado y lo hecho es lo único que no se puede reconstruir leyendo el código.

Las decisiones que se toman construyendo se anotan en la bitácora de su tarea (`T3-D1`) y se indexan en el registro de decisiones de `tasks.md` §6 — una línea y un puntero, la justificación no se duplica. **Ese registro se lee antes de empezar cada tarea**: es lo que evita que una tarea posterior vuelva a decidir distinto algo que ya se decidió, que es la forma en que aparecen dos definiciones incompatibles de la misma cosa. Las decisiones de arquitectura son otra cosa y viven en `design.md` §9 (`D1`), aprobadas en su gate.

Los criterios de aceptación se escriben en notación EARS (`WHEN … THE SYSTEM SHALL …`) y numerados de forma citable (`R1.1`, `R1.2`), porque **cada criterio es el test rojo que arranca el TDD**. La tabla de trazabilidad de `design.md` los mapea a componente y caso de prueba, y funciona como la lista de pruebas a escribir.

## Reglas
- Una feature a la vez. No abrir frentes en paralelo.
- TDD: test que falla → implementar → test que pasa.
- No agregar dependencias sin necesidad.

## Navegador

Para todo lo que sea abrir la app, navegar, hacer clic, llenar formularios, tomar capturas o leer la consola del browser se usa **el MCP de Playwright** (`playwright`, configurado en `.mcp.json`). Es la única herramienta de navegador de este repo: **no se usa la extensión de Chrome (claude-in-chrome)**, ni siquiera si está conectada.

```bash
npm run dev # levanta la app en http://localhost:5173
```

El MCP arranca Chromium en modo headed (se ve lo que hace) sobre un perfil persistente, así que la sesión sobrevive entre llamadas. Trabajar contra el snapshot de accesibilidad (`browser_snapshot`) antes que contra capturas: es texto, es determinista y es lo que hace clicables los elementos.
