# Diseño — Presupuesto mensual por categoría

| | |
|---|---|
| **Requisitos** | [requirements.md](./requirements.md) |
| **Estado** | Aprobado |
| **Última actualización** | 2026-07-28 |

## 1. Resumen de la solución

Dos servicios de dominio sobre un store en memoria. `PresupuestoService` valida y
registra presupuestos; `GastoService` registra gastos y, al hacerlo, consulta el
presupuesto de la categoría y el acumulado del período para decidir si devuelve
un aviso de sobregiro. Sin dependencias nuevas: TypeScript y Vitest, que es lo
que el `CLAUDE.md` ya declara.

## 2. Arquitectura

| Componente | Responsabilidad |
|---|---|
| `MemoriaStore` | Guarda presupuestos y gastos en memoria. No valida reglas de dominio. |
| `PresupuestoService.fijar` | Valida monto y unicidad, y registra el presupuesto. |
| `GastoService.registrar` | Registra el gasto y delega la evaluación del sobregiro. |
| `EvaluadorSobregiro.evaluar` | Compara acumulado contra presupuesto y produce el aviso. |
| `periodoDe` | Deriva el período `"YYYY-MM"` de la fecha de un gasto. |

## 3. Flujo de datos

`registrar(gasto)` → `periodoDe(gasto.fecha)` → store guarda el gasto → store
devuelve el presupuesto del par (categoría, período) y el acumulado →
`evaluar(...)` → el servicio devuelve el gasto junto con el aviso, si hubo.

El gasto se guarda **antes** de evaluar: el aviso es información, no un rechazo.

## 4. Interfaces

```ts
fijar(categoria: string, periodo: string, montoCentavos: number): Presupuesto
registrar(gasto: GastoNuevo): { gasto: Gasto; aviso?: AvisoSobregiro }
evaluar(acumuladoCentavos: number, presupuesto?: Presupuesto): AvisoSobregiro | undefined
```

Los rechazos son excepciones de dominio con un código citable
(`ErrorPresupuesto.Duplicado`, `ErrorPresupuesto.MontoNoPositivo`).

## 5. Modelos de datos

```ts
type Presupuesto = { categoria: string; periodo: string; montoCentavos: number }
type Gasto = { id: string; categoria: string; fecha: string; montoCentavos: number }
type AvisoSobregiro = { excedidoCentavos: number }
```

`aviso` es **opcional** en el retorno de `registrar`: su ausencia significa que no
hubo sobregiro, y qué pasa cuando falta lo fijan R2.2 y R2.3. Todos los montos
son enteros de centavos por BR1.

## 6. Manejo de errores

| Situación | Resultado |
|---|---|
| Presupuesto duplicado del par (categoría, período) | `ErrorPresupuesto.Duplicado` |
| Monto menor o igual a cero | `ErrorPresupuesto.MontoNoPositivo` |
| Gasto en categoría sin presupuesto | No es error: se registra sin aviso |

## 7. Estrategia de pruebas unitarias

| Caso de prueba | Resultado esperado |
|---|---|
| `fijar presupuesto en par libre → lo registra` | Devuelve el presupuesto con su monto |
| `fijar presupuesto duplicado → rechaza` | `ErrorPresupuesto.Duplicado` |
| `fijar presupuesto con monto 0 → rechaza` | `ErrorPresupuesto.MontoNoPositivo` |
| `fijar presupuesto con monto negativo → rechaza` | `ErrorPresupuesto.MontoNoPositivo` |
| `gasto que supera el presupuesto → avisa con el excedido` | `aviso.excedidoCentavos` igual a la diferencia |
| `gasto que iguala exactamente el presupuesto → no avisa` | `aviso` ausente |
| `gasto en categoría sin presupuesto → no avisa` | `aviso` ausente, gasto registrado |
| `monto en centavos, nunca flotante` | Los montos guardados son enteros |
| `período derivado de la fecha del gasto` | `periodoDe("2026-07-28")` es `"2026-07"` |

## 8. Trazabilidad

| Criterio | Componente | Caso de prueba |
|---|---|---|
| R1.1 | `PresupuestoService.fijar` | `fijar presupuesto en par libre → lo registra` |
| R1.2 | `PresupuestoService.fijar` | `fijar presupuesto duplicado → rechaza` |
| R1.3 | `PresupuestoService.fijar` | `fijar presupuesto con monto 0 → rechaza`, `fijar presupuesto con monto negativo → rechaza` |
| R2.1 | `EvaluadorSobregiro.evaluar` | `gasto que supera el presupuesto → avisa con el excedido` |
| R2.2 | `EvaluadorSobregiro.evaluar` | `gasto que iguala exactamente el presupuesto → no avisa` |
| R2.3 | `GastoService.registrar` + `EvaluadorSobregiro.evaluar` | `gasto en categoría sin presupuesto → no avisa` |
| BR1 | `Presupuesto`, `Gasto` | `monto en centavos, nunca flotante` |
| BR2 | `PresupuestoService.fijar` | `fijar presupuesto duplicado → rechaza` |
| BR3 | `periodoDe` | `período derivado de la fecha del gasto` |

## 9. Decisiones y alternativas descartadas

### D1 — La unicidad del par se valida en el servicio, no solo en el store

El store no conoce reglas de dominio (ver §2). Alternativa descartada: un índice
único en el store y traducir su error. Criterio: R1.2 pide informar el motivo, y
traducir errores de infraestructura a mensajes de dominio acopla el servicio al
store.

### D2 — El gasto se registra aunque haya sobregiro

Alternativa descartada: rechazar el gasto que excede el presupuesto. Criterio:
R2.1 dice "registrar el gasto y devolver un aviso" — el presupuesto es una
referencia, no un límite duro.

## 10. Riesgos

El acumulado se recalcula sumando los gastos del período en cada registro. Con
volúmenes reales de un uso personal no es un problema, y fijar un umbral sería
inventar el requisito no funcional que §6 de los requisitos declina fijar.

## 11. Preguntas abiertas heredadas

La repetición del aviso en gastos sucesivos (§10 de los requisitos) sigue
abierta. No bloquea: R2.1 ya define el comportamiento por gasto.
