# Tareas — Presupuesto mensual por categoría

| | |
|---|---|
| **Requisitos** | [requirements.md](./requirements.md) |
| **Diseño** | [design.md](./design.md) |
| **Estado del plan** | Aprobado |
| **Última actualización** | 2026-07-28 |

## 1. Cómo se mantiene este documento

- **El bloque `Plan` de cada tarea es inmutable.** Se escribe una vez y no se
  reescribe. Si la implementación terminó haciendo algo distinto, eso va a la
  bitácora como desvío — no se edita el plan para que coincida.
- **La bitácora es append-only.** Entrada nueva abajo, con fecha real. Las
  entradas anteriores no se corrigen ni se borran, aunque hayan quedado
  equivocadas: una bitácora reescrita no sirve como registro.
- **El trabajo nuevo entra como tarea nueva**, al final y con el siguiente número
  libre. No se renumeran las tareas existentes.
- **Lo único que se edita de una tarea es su estado.**
- **Antes de empezar una tarea, lee el registro de decisiones (§6).**

## 2. Estados

| Estado | Significado |
|---|---|
| `Pendiente` | No empezada. |
| `En curso` | Hay un test rojo escrito. |
| `Hecha` | Test verde, refactor hecho, verificación del proyecto en verde. |
| `Bloqueada` | Necesita una decisión o algo externo. El motivo va en la bitácora. |
| `Descartada` | Ya no se hace. El motivo va en la bitácora; la tarea NO se borra. |

## 3. Orden de ejecución

| # | Tarea | Depende de |
|---|---|---|
| T1 | Registrar un presupuesto en un par libre | — |
| T2 | Rechazar el presupuesto duplicado | T1 |
| T3 | Rechazar el monto no positivo | T1 |
| T4 | Derivar el período de la fecha del gasto | — |
| T5 | Avisar del sobregiro y respetar el borde exacto | T1, T4 |
| T6 | Registrar gasto sin presupuesto definido | T4, T5 |

## 4. Tareas

### T1 — Registrar un presupuesto en un par (categoría, período) libre

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.1, BR1 |
| **Casos de prueba** | `fijar presupuesto en par libre → lo registra`, `monto en centavos, nunca flotante` |
| **Componente** | `PresupuestoService.fijar`, `MemoriaStore` |
| **Archivos previstos** | `src/presupuestos/service.ts`, `src/presupuestos/service.test.ts` |
| **Decisiones que la condicionan** | — |

*Hecho cuando:*

- [x] El test de registro falla porque `fijar` todavía no existe
- [x] El test pasa y devuelve el presupuesto con su monto en centavos
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- **2026-07-28** — Rojo: `fijar presupuesto en par libre` falla porque el módulo
  no existe todavía.
- **2026-07-28** — Decisión **T1-D1**: el store expone `buscarPresupuesto(par)` y
  devuelve `undefined` en vez de lanzar cuando no hay. Alternativa: lanzar y
  capturar en el servicio. Criterio: R2.3 necesita distinguir "sin presupuesto"
  como caso normal y no como error, así que el ausente tiene que ser un valor.
- **2026-07-28** — Verde.

### T2 — Rechazar el presupuesto duplicado del par

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.2, BR2 |
| **Casos de prueba** | `fijar presupuesto duplicado → rechaza` |
| **Componente** | `PresupuestoService.fijar` |
| **Archivos previstos** | `src/presupuestos/service.ts`, `src/presupuestos/service.test.ts` |
| **Decisiones que la condicionan** | D1 (design.md), T1-D1 |

*Hecho cuando:*

- [x] El test de duplicado falla porque hoy se guarda el segundo presupuesto
- [x] El test pasa y devuelve `ErrorPresupuesto.Duplicado`
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- **2026-07-28** — Rojo: `fijar presupuesto duplicado → rechaza` falla; el
  segundo `fijar` sobreescribe al primero en silencio.
- **2026-07-28** — Decisión **T2-D1**: la categoría se compara normalizada
  (`trim` + minúsculas) antes de buscar el par, porque si no `"Comida"` y
  `"comida"` son dos presupuestos distintos y BR2 deja de sostenerse. La
  normalización vive en `normalizarCategoria` y la usan tanto `fijar` como la
  búsqueda del store.
- **2026-07-28** — Verde.

### T3 — Rechazar el monto no positivo

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.3 |
| **Casos de prueba** | `fijar presupuesto con monto 0 → rechaza`, `fijar presupuesto con monto negativo → rechaza` |
| **Componente** | `PresupuestoService.fijar` |
| **Archivos previstos** | `src/presupuestos/service.ts`, `src/presupuestos/service.test.ts` |
| **Decisiones que la condicionan** | — |

*Hecho cuando:*

- [ ] Los tests de monto 0 y monto negativo fallan
- [ ] Pasan y devuelven `ErrorPresupuesto.MontoNoPositivo`
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

### T4 — Derivar el período de la fecha del gasto

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | BR3 |
| **Casos de prueba** | `período derivado de la fecha del gasto` |
| **Componente** | `periodoDe` |
| **Archivos previstos** | `src/periodos.ts`, `src/periodos.test.ts` |
| **Decisiones que la condicionan** | — |

*Hecho cuando:*

- [ ] El test de `periodoDe("2026-07-28") === "2026-07"` falla
- [ ] Pasa
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

### T5 — Avisar del sobregiro y respetar el borde exacto

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R2.1, R2.2 |
| **Casos de prueba** | `gasto que supera el presupuesto → avisa con el excedido`, `gasto que iguala exactamente el presupuesto → no avisa` |
| **Componente** | `EvaluadorSobregiro.evaluar`, `GastoService.registrar` |
| **Archivos previstos** | `src/gastos/sobregiro.ts`, `src/gastos/sobregiro.test.ts` |
| **Decisiones que la condicionan** | D2 (design.md) |

*Hecho cuando:*

- [ ] El test del excedido falla y el del borde exacto falla
- [ ] Ambos pasan: avisa solo cuando el acumulado es mayor, no cuando iguala
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

### T6 — Registrar un gasto en categoría sin presupuesto definido

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R2.3 |
| **Casos de prueba** | `gasto en categoría sin presupuesto → no avisa` |
| **Componente** | `GastoService.registrar` |
| **Archivos previstos** | `src/gastos/service.ts`, `src/gastos/service.test.ts` |
| **Decisiones que la condicionan** | T1-D1 |

*Hecho cuando:*

- [ ] El test falla porque hoy se evalúa el sobregiro contra un presupuesto ausente
- [ ] Pasa: el gasto se registra y no hay aviso
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

## 5. Trazabilidad criterio → tarea

| Requisito | Tarea |
|---|---|
| R1.1 | T1 |
| R1.2 | T2 |
| R1.3 | T3 |
| R2.1 | T5 |
| R2.2 | T5 |
| R2.3 | T6 |
| BR1 | T1 |
| BR2 | T2 |
| BR3 | T4 |

## 6. Registro de decisiones

| # | Tarea | Decisión | Fecha |
|---|---|---|---|
| T1-D1 | T1 | El presupuesto ausente es `undefined`, no una excepción | 2026-07-28 |
| T2-D1 | T2 | La categoría se compara normalizada (`trim` + minúsculas) | 2026-07-28 |

## 7. Desvíos del diseño

| # | Tarea | Qué difiere de design.md | Resolución |
|---|---|---|---|
| DV1 | T2 | `design.md` no menciona la normalización de la categoría en §5 | Desvío local, diseño sigue válido |

## 8. Tareas descubiertas durante la implementación

| # | Tarea | Por qué apareció | ¿Cambia el alcance? |
|---|---|---|---|
| — | — | — | — |
