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
/brainstorming → requirements.md → [gate] → design.md → [gate] → tasks.md → [gate] → Ejecución (TDD) → Verificación → commit
```

Cada `[gate]` es una parada real: se presenta el documento y no se avanza sin aprobación explícita. Un requisito equivocado que pasa a diseño se multiplica en decisiones de arquitectura equivocadas, así que el gate es el punto más barato para cambiar de opinión.

| Fase | Skill | Qué produce |
|---|---|---|
| Explorar la idea | `/brainstorming` | un diseño acordado en la conversación; no escribe archivos |
| Especificar | `/specify` | `docs/specs/<YYYY-MM-DD>-<slug>/requirements.md` y `design.md` |
| Planear | `/planning-tasks` | `tasks.md` iterado al 100%, orquestando el subagente `planner` |
| Ejecutar | — | tests y código, en TDD; y la bitácora de cada tarea en `tasks.md` |

`/brainstorming` termina en un diseño aprobado y encadena con `/specify`. `/specify` cubre `requirements.md` y `design.md` con sus dos gates, y al aprobarse el diseño encadena con `/planning-tasks`. `/planning-tasks` produce `tasks.md` orquestando el subagente `planner` —un solo planner deriva el inventario inicial cuando no hay tareas; uno por tarea las dimensiona cuando ya existen— y se detiene en el gate del plan: escribir el código queda fuera del alcance de los tres.

`tasks.md` es a la vez el plan y su registro. El plan de cada tarea se escribe una vez y no se toca; la bitácora se va escribiendo **durante** la implementación, con las decisiones que se tomaron, los desvíos respecto del diseño y lo que se descubrió. Por eso no se retoca el plan para que coincida con lo que terminó pasando: la diferencia entre lo planeado y lo hecho es lo único que no se puede reconstruir leyendo el código.

Las decisiones que se toman construyendo se anotan en la bitácora de su tarea (`T3-D1`) y se indexan en el registro de decisiones de `tasks.md` §6 — una línea y un puntero, la justificación no se duplica. **Ese registro se lee antes de empezar cada tarea**: es lo que evita que una tarea posterior vuelva a decidir distinto algo que ya se decidió, que es la forma en que aparecen dos definiciones incompatibles de la misma cosa. Las decisiones de arquitectura son otra cosa y viven en `design.md` §9 (`D1`), aprobadas en su gate.

Los criterios de aceptación se escriben en notación EARS (`WHEN … THE SYSTEM SHALL …`) y numerados de forma citable (`R1.1`, `R1.2`), porque **cada criterio es el test rojo que arranca el TDD**. La tabla de trazabilidad de `design.md` los mapea a componente y caso de prueba, y funciona como la lista de pruebas a escribir.

## Reglas
- Una feature a la vez. No abrir frentes en paralelo.
- TDD: test que falla → implementar → test que pasa.
- No agregar dependencias sin necesidad.
