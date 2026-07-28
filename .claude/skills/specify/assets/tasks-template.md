<!--
PLANTILLA: tasks.md  (se escribe DESPUÉS de aprobar design.md)

Cómo usarla:
- Copia la estructura, borra estos comentarios y los ejemplos.
- Este documento tiene DOS autores y dos momentos. La Fase 3 del spec escribe el
  plan; quien implementa escribe la bitácora, tarea por tarea, mientras trabaja.
- Las tareas no se inventan: salen de la tabla de estrategia de pruebas y de la
  tabla de trazabilidad de design.md. Si una tarea no cita ningún R#.#, o sobra o
  el diseño tenía un hueco.
- La sección 5 (trazabilidad criterio → tarea) es la prueba de completitud, igual
  que la sección 8 de design.md: criterio sin tarea = requisito aprobado que nadie
  va a implementar.
-->

# Tareas — <Nombre de la feature>

| | |
|---|---|
| **Requisitos** | [requirements.md](./requirements.md) |
| **Diseño** | [design.md](./design.md) |
| **Estado del plan** | Borrador \| Aprobado |
| **Última actualización** | <YYYY-MM-DD> |

## 1. Cómo se mantiene este documento

<!--
Esta sección se queda en el documento final: son las reglas de uso y tienen que
viajar con el archivo, porque quien lo va a llenar durante la implementación
puede no ser quien escribió el spec (y en tres semanas, tampoco se acuerda).
-->

- **El bloque `Plan` de cada tarea es inmutable.** Se escribe una vez y no se
  reescribe. Si la implementación terminó haciendo algo distinto, eso va a la
  bitácora como desvío — no se edita el plan para que coincida.
- **La bitácora es append-only.** Entrada nueva abajo, con fecha real (`date +%F`).
  Las entradas anteriores no se corrigen ni se borran, aunque hayan quedado
  equivocadas: una bitácora reescrita no sirve como registro.
- **El trabajo nuevo entra como tarea nueva**, al final y con el siguiente número
  libre. No se renumeran las tareas existentes ni se cuelan pasos dentro de una
  tarea ya cerrada.
- **Lo único que se edita de una tarea es su estado.**
- **Antes de empezar una tarea, lee el registro de decisiones (§6).** Es la
  sección que evita el peor defecto de este formato: una decisión tomada en T3
  que quien arranca T7 no sabe que existe, y vuelve a decidir distinto.

> Por qué tanta ceremonia: el valor de este archivo no es la lista de pendientes
> —eso lo da cualquier checklist— sino poder responder después *por qué esto
> quedó así*. Esa respuesta solo existe si el plan y lo que realmente pasó se
> pueden leer uno al lado del otro.

## 2. Estados

| Estado | Significado |
|---|---|
| `Pendiente` | No empezada. |
| `En curso` | Hay un test rojo escrito. |
| `Hecha` | Test verde, refactor hecho, verificación del proyecto en verde. |
| `Bloqueada` | Necesita una decisión o algo externo. El motivo va en la bitácora. |
| `Descartada` | Ya no se hace. El motivo va en la bitácora; la tarea NO se borra. |

## 3. Orden de ejecución

<!--
El orden importa por dos razones distintas: dependencias técnicas reales (no
puedo testear el servicio sin el tipo) y la conveniencia de tener algo
demostrable temprano. Si dos tareas no dependen entre sí, ponlas en el orden en
que quieras poder mostrar avance.

CLAUDE.md tiene la regla de una feature a la vez: esto es una secuencia, no un
tablero para paralelizar.
-->

| # | Tarea | Depende de |
|---|---|---|
| T1 | <título corto> | — |
| T2 | <título corto> | T1 |

## 4. Tareas

<!--
Granularidad: una tarea = un ciclo rojo → verde → refactor, del tamaño de un
commit. Si el bloque "Hecho cuando" necesita más de tres o cuatro checks, o si
la tarea toca capas que se pueden verificar por separado, son dos tareas.

Al revés también falla: una tarea que no termina en algo verificable ("crear los
tipos") deja la verificación para otra tarea y con eso pierde el ciclo TDD. Si
el paso es demasiado chico para tener test propio, es parte de la tarea que sí
lo tiene.
-->

### T1 — <Título en una línea, en imperativo>

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | <R1.1, BR1> |
| **Casos de prueba** | <los nombres exactos de la tabla §7 de design.md> |
| **Componente** | <de la tabla §2 de design.md> |
| **Archivos previstos** | `<src/...>`, `<src/....test.ts>` |
| **Decisiones que la condicionan** | <D2 (design.md), T3-D1> \| — |

<!--
"Decisiones que la condicionan" es la única fila que se puede completar después
de escribir el plan, y es la excepción deliberada a la inmutabilidad: una
decisión tomada en T3 puede condicionar a T7 sin que nadie lo supiera en la
Fase 3. Agregar el ID no reescribe el plan, lo anota.

Ponerla vacía cuando la tarea no depende de nada previo también informa: dice
que se revisó el registro, no que se olvidó.
-->



*Hecho cuando:*

- [ ] <check verificable — el test rojo existe y falla por la razón esperada>
- [ ] <check verificable — el test pasa>
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

<!--
Una entrada por sesión de trabajo, no una por línea de código. Lo que vale la
pena registrar es lo que no se deduce del diff:

  - por qué se eligió algo cuando había más de una opción razonable
  - qué se descubrió que el diseño no había previsto
  - en qué difiere lo implementado de lo diseñado, y qué se hizo con esa diferencia

Las decisiones se numeran dentro de la tarea (T1-D1, T1-D2) para poder citarlas
desde otra tarea o desde un PR sin chocar con las D# de design.md.

Cada decisión que escribas acá va TAMBIÉN como una fila del registro (§6), en el
mismo momento y no al cerrar la tarea: un índice que se llena al final se llena
con lo que uno se acuerda, que son las decisiones que salieron bien. La fila es
un puntero de una línea — la justificación se queda acá y no se copia, así que
no hay dos versiones que se puedan separar.

Lo que NO va acá: narrar el diff ("agregué la función X"), ni copiar el mensaje
del commit. Si la entrada se puede reconstruir mirando el código, sobra.
-->

- **<YYYY-MM-DD>** — <qué pasó>

<!--
Ejemplo completo, para calibrar el nivel de detalle:

### T3 — Rechazar presupuesto duplicado para (categoría, período)

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.2, BR2 |
| **Casos de prueba** | Crear presupuesto duplicado → rechaza con error Duplicado |
| **Componente** | BudgetService.crearPresupuesto |
| **Archivos previstos** | `src/budgets/service.ts`, `src/budgets/service.test.ts` |
| **Decisiones que la condicionan** | D2 (design.md): el store no valida reglas de dominio |

*Hecho cuando:*

- [x] El test de duplicado falla porque hoy se crea el segundo presupuesto
- [x] El test pasa y devuelve `ErrorPresupuesto.Duplicado`
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- **2026-07-28** — Rojo: `rechaza presupuesto duplicado` falla creando dos
  presupuestos; el segundo se guarda sin error.
- **2026-07-28** — Decisión **T3-D1**: la unicidad se valida en el servicio y
  no solo con el índice único del store. Alternativa: dejar que el store lance
  y traducir el error. Criterio: R1.2 pide informar el motivo, y traducir
  errores de infraestructura a mensajes de dominio acopla el servicio al store.
  El índice queda igual como red de seguridad de BR2.
- **2026-07-28** — Desvío de `design.md` §5: el período llegaba como `Date` y el
  modelo lo declara `"YYYY-MM"`. Normalizo en el borde del servicio. Registrado
  como desvío **DV1** en §7; `design.md` no cambia porque el modelo persistido sigue
  siendo el del diseño.
- **2026-07-28** — Verde. Descubierto: falta definir qué pasa con un presupuesto
  de monto 0 (¿duplicado válido?). No lo cubre ningún criterio → abierto como
  T7 en vez de decidirlo acá.

Nota qué hace útil esta bitácora: T3-D1 explica una decisión que el código no
cuenta, el desvío deja rastro de una diferencia con el diseño y qué se resolvió,
y el hallazgo del monto 0 se convierte en tarea en lugar de improvisarse.
-->

### T2 — <…>

## 5. Trazabilidad criterio → tarea

<!--
Una fila por cada criterio de aceptación de requirements.md (R#.#), más las
BR# y los REG#. Es la misma lista que la sección 8 de design.md, pero mirando
hacia la implementación.

Fila sin tarea = criterio aprobado que nadie va a implementar. Se revisa ANTES
del gate y otra vez al cerrar la última tarea: si al final quedó un criterio
cuya tarea no está `Hecha`, la feature no está terminada.

Esta tabla NO repite el estado de las tareas. El estado vive en la tarea (§4) y
en ningún otro lado: dos copias de un dato que se edita a mano se separan, y
entonces ninguna de las dos es confiable.
-->

| Requisito | Tarea |
|---|---|
| R1.1 | T2 |
| R1.2 | T3 |
| BR2 | T3 |

## 6. Registro de decisiones

<!--
Índice de las decisiones tomadas mientras se implementa. Una fila por decisión,
escrita en el mismo momento que la entrada de bitácora que la explica.

Es un índice, no un archivo: la fila lleva el puntero y una línea, y la
justificación completa —alternativas, criterio que desempató— se queda en la
bitácora de su tarea. Copiar el razonamiento acá crearía dos versiones de la
misma cosa, y ya sabemos cómo termina eso.

Qué NO entra: las decisiones de arquitectura de `design.md` §9 (D1, D2, …). Esas
ya tienen su lugar y pasaron por el Gate 2. Este registro es de las decisiones
que se toman construyendo, que son precisamente las que no pasaron por ningún
gate y las únicas que no están escritas en ningún otro documento. Cítalas si una
tarea depende de ellas, pero no las repitas acá.

Append-only, igual que la bitácora. Si una decisión posterior reemplaza a otra,
la fila nueva lo dice ("reemplaza T3-D1") y la vieja se queda donde está: saber
que algo se decidió y después se revirtió vale más que la versión final sola.

Para qué sirve, concretamente: se lee ANTES de empezar una tarea. Si de acá sale
que T3 ya definió cómo se normaliza una descripción, T7 no lo vuelve a definir
distinto. Sin esta sección esa colisión aparece igual, pero la descubre quien lee
el código meses después.
-->

| # | Tarea | Decisión | Fecha |
|---|---|---|---|
| T3-D1 | T3 | <La unicidad se valida en el servicio, no solo en el índice del store> | <YYYY-MM-DD> |

## 7. Desvíos del diseño

<!--
Índice de los momentos en que la implementación no coincidió con design.md.
Cada uno tiene que terminar en una de dos cosas: o se actualizó el diseño, o se
decidió que el diseño sigue válido y el desvío es local. Un desvío sin resolver
es un diseño que dice algo falso, y el próximo que lo lea le va a creer.

Si esta sección se llena de filas, la señal no es que la implementación fue
desprolija: es que el diseño se aprobó con huecos, y vale decirlo.

Los desvíos se numeran DV1, DV2 — no D1, que es la numeración de las decisiones
de arquitectura de design.md §9. Un desvío y una decisión de diseño son cosas
opuestas (uno se aparta del diseño, el otro lo constituye) y se citan juntos en
la misma bitácora: si comparten letra, se confunden.
-->

| # | Tarea | Qué difiere de design.md | Resolución |
|---|---|---|---|
| DV1 | T3 | <…> | `design.md` actualizado \| Desvío local, diseño sigue válido |

## 8. Tareas descubiertas durante la implementación

<!--
Las tareas que no estaban en el plan original. Van también en la sección 4 con
su número, pero listarlas acá aparte responde una pregunta que el plan no puede:
cuánto de este trabajo no se había previsto.

Si aparece una tarea que cambia el ALCANCE en vez de completarlo, no se agrega
sin más: eso vuelve a requirements.md y necesita aprobación. La regla práctica:
si para escribirla necesitas un criterio de aceptación nuevo, es alcance.
-->

| # | Tarea | Por qué apareció | ¿Cambia el alcance? |
|---|---|---|---|
| T7 | <…> | <hallazgo en T3> | No — precisa un borde ya pedido |
