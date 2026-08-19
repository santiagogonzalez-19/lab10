# Tareas — Presupuesto mensual por categoría

| | |
|---|---|
| **Requisitos** | [requirements.md](./requirements.md) |
| **Diseño** | [design.md](./design.md) |
| **Estado del plan** | Aprobado |
| **Última actualización** | 2026-08-19 |

## 1. Cómo se mantiene este documento

- **El bloque `Plan` de cada tarea es inmutable.** Se escribe una vez y no se reescribe. Si la implementación terminó haciendo algo distinto, eso va a la bitácora como desvío — no se edita el plan para que coincida.
- **La bitácora es append-only.** Entrada nueva abajo, con fecha real (`date +%F`). Las entradas anteriores no se corrigen ni se borran, aunque hayan quedado equivocadas: una bitácora reescrita no sirve como registro.
- **El trabajo nuevo entra como tarea nueva**, al final y con el siguiente número libre. No se renumeran las tareas existentes ni se cuelan pasos dentro de una tarea ya cerrada.
- **Lo único que se edita de una tarea es su estado.**
- **Antes de empezar una tarea, lee el registro de decisiones (§6).** Es la sección que evita el peor defecto de este formato: una decisión tomada en T3 que quien arranca T7 no sabe que existe, y vuelve a decidir distinto.

> Por qué tanta ceremonia: el valor de este archivo no es la lista de pendientes —eso lo da cualquier checklist— sino poder responder después *por qué esto quedó así*. Esa respuesta solo existe si el plan y lo que realmente pasó se pueden leer uno al lado del otro.

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
| T1 | Levantar el proyecto y validar meses y fechas | — |
| T2 | Normalizar nombres y validar el conjunto de categorías | T1 |
| T3 | Calcular el consumo de una categoría: estado, porcentaje y exceso | T1 |
| T4 | Calcular el consumo de un mes completo | T1, T3 |
| T5 | Fijar y reemplazar los límites de un mes | T2 |
| T6 | Impedir quitar una categoría que tiene gastos | T5 |
| T7 | Copiar los límites de un mes a otro | T1 |
| T8 | Registrar un gasto válido | T1, T2 |
| T9 | Rechazar los gastos inválidos | T8 |
| T10 | Listar los gastos de un mes en orden | T1 |
| T11 | Quitar un gasto | T10 |
| T18 | Blindar la pureza del dominio con una prueba estructural | T4, T6, T7, T9, T11 |
| T12 | Definir el contrato `Repositorio` y la implementación en memoria | T1 |
| T13 | Persistir en un archivo JSON de forma atómica y tolerante | T12 |
| T14 | Casos de uso de presupuesto: ver el mes, fijar límites, copiar | T4, T6, T7, T12 |
| T15 | Casos de uso de gastos: registrar con aviso, listar, borrar | T9, T11, T14 |
| T16 | Servidor HTTP: errores y rutas de presupuesto | T14 |
| T17 | Servidor HTTP: rutas de copiar y de gastos | T15, T16 |
| T19 | Arranque: cargar el archivo y levantar el servidor | T13, T17 |
| T20 | UI: ver el mes y arrancarlo copiando el anterior | T19 |
| T23 | UI: fijar y ajustar los límites del mes | T20 |
| T21 | UI: registrar un gasto con aviso de exceso | T20, T23 |
| T22 | UI: listar los gastos del mes y borrar uno | T20, T21 |

**Qué obliga el orden.** T1 va primero porque nada compila sin `Resultado` ni los tipos, y porque valida el formato de mes y fecha que todo lo demás asume. T3 antes de T4 porque el consumo del mes es la agregación de lo que T3 calcula para una categoría. T6 después de T5 porque quitar una categoría es un caso de la misma función que fija los límites. T12 antes de T13 porque la batería de tests del contrato se escribe contra la implementación en memoria y luego se reusa contra la de archivo (CP58). T16 antes de T17 porque T16 monta el servidor y la traducción de errores que T17 solo extiende con más rutas. T19 antes de la UI porque hasta ahí no hay nada que un navegador pueda pedir. T18 después de T4, T6, T7, T9 y T11 —las hojas del grafo del dominio, que arrastran transitivamente a T1–T11— porque su check «pasa con el dominio tal como quedó en T1–T11» no es verificable con el dominio a medias.

**Qué elegí yo.** Que el dominio vaya completo (T1–T11) antes del almacenamiento y el transporte: son las once tareas que se prueban sin infraestructura y donde vive todo lo que el spec discutió. T3 y T4 antes de T5–T7 no es una dependencia técnica —fijar límites no necesita el cálculo del consumo— sino que el cálculo es el corazón del producto y prefiero tenerlo verde temprano. T18 justo después de T11 y antes del almacenamiento no es una dependencia técnica —sus dependencias son T4, T6, T7, T9 y T11, y numéricamente podría esperar hasta después de T17— sino de conveniencia: ejecutado ahí, CP74 corre en el `npm test` de todas las tareas siguientes, y una importación indebida se detecta en la tarea que la introduce, no al final con todo el sistema encima. Es una elección, no una obligación, y el gate del plan la confirmó: T18 queda tras T11 y antes de T12. T20 antes de T21 para que la primera cosa demostrable en pantalla sea ver un mes, no registrar. T22 después de T21 no es una dependencia técnica —listar no necesita el formulario— sino de conveniencia: sin registrar desde la pantalla no hay qué listar ni qué borrar, y ambas tareas editan los mismos `vista.ts` y `main.ts`. T23 nació del diagnóstico de T21, con el plan todavía en borrador, y su única dependencia técnica sigue siendo T20, que crea el andamiaje de `web/`. El gate del plan resolvió su posición: T20 → T23 → T21 → T22. Va inmediatamente después de T20 y antes de T21 —no por numeración, la fila de §3 se movió para reflejarlo— porque es la única pantalla que permite crear el **primer** presupuesto: copiar (T20) exige un origen que sin T23 nadie pudo definir. T21 pasa a depender de T23 por conveniencia, no porque `registrarGasto` necesite la pantalla de límites para funcionar —le basta con que el mes tenga presupuesto, sin importar cómo llegó—, sino porque la affordance «Defínelo primero» del `400` de T21 (design.md, mapeo de errores) apunta a una pantalla que antes no existía: con T23 antes, esa acción tiene dónde llevar al usuario.

## 4. Tareas

### T1 — Levantar el proyecto y validar meses y fechas

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.10, R5.9, R3.7, R3.2 (parcial: derivar el mes), BR3 |
| **Casos de prueba** | CP1 mes `"2026-07"` válido · CP2 `"2026-13"`/`"2026-00"` → `MES_INVALIDO` · CP3 `"2026-7"`/`"julio"`/`""` → `MES_INVALIDO` · CP4 fecha `"2026-06-28"` → mes `"2026-06"` · CP5 `"2026-02-30"` → `FECHA_INVALIDA` · CP6 `"28/06/2026"`/`"2026-6-8"` → `FECHA_INVALIDA` |
| **Componente** | `mes`; `Resultado` y `tipos` como declaraciones de apoyo |
| **Archivos previstos** | `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore` (en la raíz del repo, un nivel arriba de este proyecto), `src/domain/resultado.ts`, `src/domain/tipos.ts`, `src/domain/mes.ts`, `src/domain/mes.test.ts` |
| **Decisiones que la condicionan** | D1 (design.md): el dominio devuelve `Resultado`, no lanza |

Incluye el andamiaje porque `npm run typecheck` y `npm test` son los comandos de verificación de todas las tareas siguientes y hoy no existen: el commit `35eaa77` los revirtió y ninguno de los commits posteriores los repuso. **No es un ciclo aparte**: el andamiaje no tiene un rojo propio, y su verificación es precisamente que el rojo de CP1–CP6 pueda correr. `Resultado` y `tipos` entran por la misma razón —son declaraciones sin comportamiento, y CP1–CP6 no compilan sin ellas—, no como dos ciclos más.

CP5 es el caso que obliga a validar contra el calendario real y no solo con una expresión regular. `mes.ts` no importa `node:*`: la restricción de NF4 vale desde el primer archivo del dominio, y T18 la convierte en test.

El `.gitignore` de la raíz del repo perdió `node_modules/`, `dist/`, `coverage/` y `*.tsbuildinfo` en ese mismo revert; hay que reponerlos acá, que es donde aparece el primer `npm install`. `datos/` no se ignora todavía: ese directorio lo introduce T13.

*Hecho cuando:*

- [x] `npm test` ejecuta y CP1–CP6 fallan por la razón esperada: `validarMes`, `validarFecha` y `mesDe` no existen
- [x] CP1–CP6 pasan, con `validarMes` y `validarFecha` devolviendo `Resultado` sin lanzar, y `mesDe` devolviendo `Mes` sobre una fecha ya validada
- [x] `git status` no lista `node_modules/` entre los archivos sin seguimiento
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Andamiaje repuesto: `package.json` (scripts `typecheck` y `test`), `tsconfig.json` (strict, `noEmit`), `vitest.config.ts`, y las cuatro entradas perdidas del `.gitignore` de la raíz (`node_modules/`, `dist/`, `coverage/`, `*.tsbuildinfo`). `datos/` no se agregó, como el plan indica: es de T13.
- 2026-08-19 — Rojo verificado: `npm test` corrió y CP1–CP6 fallaron porque `./mes` no existe (el andamiaje quedó demostrado por el propio rojo, sin ciclo aparte). Verde con `validarMes` y `validarFecha` devolviendo `Resultado` (D1, sin lanzar) y `mesDe` como `slice(0, 7)` sobre fecha ya validada (S2).
- 2026-08-19 — T1-D1: la validación de calendario de CP5 se hace con una tabla de días por mes y regla de bisiestos propia, sin `Date`. `Date` acepta desbordes ("2026-02-30" → 2 de marzo) salvo que se re-compare el resultado, y la tabla deja la regla legible y determinista. `mes.ts` no importa `node:*` (NF4).
- 2026-08-19 — En `resultado.ts` se agregaron los constructores `exito`/`fallo` además de los tipos del diseño §4: evitan repetir el literal `{ ok: ... }` en cada regla del dominio. No cambian el contrato.

### T2 — Normalizar nombres y validar el conjunto de categorías

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.3, R1.4, R1.5, R1.6, R1.7, R3.4 (parcial: buscar por nombre normalizado), BR1, BR2, NF1 (parcial), S1 |
| **Casos de prueba** | CP7 `" comida "` y `"Comida"` normalizan igual · CP8 conjunto con ambos → `NOMBRE_DUPLICADO` con el nombre en el detalle · CP9 límite `-1` → `LIMITE_NEGATIVO` · CP10 límite `1000.5` → `LIMITE_NO_ENTERO` · CP11 límite `0` aceptado · CP12 nombre `"   "` → `NOMBRE_VACIO` |
| **Componente** | `categorias` |
| **Archivos previstos** | `src/domain/categorias.ts`, `src/domain/categorias.test.ts` |
| **Decisiones que la condicionan** | D4 (design.md): normalizar una sola vez, en la frontera |

`normalizar` es la única definición de la normalización en el código, igual que el glosario es la única en el spec. CP11 fija que cero es un límite válido, que es lo que hace posible R4.5.

*Hecho cuando:*

- [x] CP7–CP12 fallan porque `normalizar` y `validarCategorias` no existen
- [x] CP7–CP12 pasan, y `validarCategorias` devuelve el primer error encontrado sin aplicar nada
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Rojo verificado (CP7–CP12 fallan porque `./categorias` no existe) y verde con `normalizar` = `trim().toLowerCase()` como única definición en el código, y `validarCategorias` recorriendo la lista en orden y devolviendo el primer error sin aplicar nada.
- 2026-08-19 — T2-D1: el detalle de `NOMBRE_DUPLICADO` informa el nombre **tal como se escribió primero** (S1): con `"Comida"` y `" comida "`, el detalle dice `Comida`. El primer borrador devolvía el nombre del segundo (el que dispara el choque, ya en minúsculas por el trim) y CP8 lo atrapó.
- 2026-08-19 — `buscarCategoria` entra en esta tarea porque design.md §4 la declara en `categorias.ts` y es la mitad "buscar por nombre normalizado" de R3.4. Su cobertura directa llega con CP29 en T8; acá queda tipada y compartiendo `normalizar` con la validación.

### T3 — Calcular el consumo de una categoría: estado, porcentaje y exceso

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R4.1, R4.2, R4.3, R4.4, R4.5, R5.3, R5.4, R5.5, R5.6, NF1 |
| **Casos de prueba** | CP36 límite 500 000 sin gastos → `0 / 500000 / 0 % / ok` · CP37 gastado 600 000 → `restante -100000`, `excedido 100000`, `excedido` · CP38 gastado exactamente 500 000 → `excedido 0`, `100 %`, `alerta` · CP39 gastado 400 000 (80 % exacto) → `alerta` · CP40 gastado 399 800 (79,96 %) → `ok`, `porcentaje 80` · CP41 límite 0 con gasto → `100 %`, `excedido 30000`, `excedido` · CP42 límite 0 sin gastos → `0 %`, `ok` · CP70 diez gastos de 999 999 → gastado entero exacto |
| **Componente** | `consumo.consumoDeCategoria` |
| **Archivos previstos** | `src/domain/consumo.ts`, `src/domain/consumo.test.ts` |
| **Decisiones que la condicionan** | — (el cálculo está fijado en design.md §5 y no vuelve a definirse) |

El corazón del producto. CP38 y CP39 clavan los dos bordes que el spec discutió explícitamente (`>` contra `>=`, y el 80 %), y CP40 fija que el umbral se evalúa sobre el cociente sin redondear: si se compara el `porcentaje` ya redondeado, CP40 pasa a `alerta` y el test lo detecta.

*Hecho cuando:*

- [x] CP36–CP42 y CP70 fallan porque `consumoDeCategoria` no existe
- [x] Los ocho pasan, con `UMBRAL_ALERTA` como parámetro con valor por defecto 80
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Rojo verificado (los ocho CP fallan porque `./consumo` no existe) y verde con el cálculo transcrito de design.md §5 sin reinterpretarlo: `restante = limite - gastado`, `excedido = max(0, gastado - limite)`, `porcentaje` con la convención de límite 0, y el umbral evaluado sobre el cociente sin redondear, que es lo que CP40 clava: con 399 800 el estado es `ok` aunque `porcentaje` muestre 80.
- 2026-08-19 — `umbralAlerta` es parámetro con `UMBRAL_ALERTA = 80` como default (S5/Q3). El filtrado por categoría dentro de `consumoDeCategoria` compara `gasto.categoria === categoria.nombre` a secas: los gastos guardan el nombre canónico (D4), así que normalizar acá sería duplicar la frontera.

### T4 — Calcular el consumo de un mes completo

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R5.1, R5.2, R5.7 (parcial), R5.8, BR6, BR7 (parcial) |
| **Casos de prueba** | CP34 límite 500 000 con gastos de 100 000 y 50 000 → `150000 / 350000 / 30 % / ok` · CP35 gastos de la misma categoría en junio y julio → el gastado de julio suma solo los de julio · CP43 mes sin categorías → lista vacía · CP44 categorías definidas en orden C, A, B → se devuelven C, A, B |
| **Componente** | `consumo.consumo` |
| **Archivos previstos** | `src/domain/consumo.ts`, `src/domain/consumo.test.ts` |
| **Decisiones que la condicionan** | D3 (design.md): el mes está guardado en el gasto, así que filtrar es comparar cadenas |

CP35 es el caso que protege BR7 desde el lado del cálculo: un gasto de junio no debe aparecer nunca en el total de julio.

*Hecho cuando:*

- [x] CP34, CP35, CP43 y CP44 fallan porque `consumo` no existe
- [x] Los cuatro pasan, y `consumo` no reimplementa el cálculo: delega en `consumoDeCategoria`
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Rojo verificado ("consumo is not a function" en los cuatro CP) y verde con `consumo` como un `map` sobre las categorías que delega en `consumoDeCategoria`, preservando el orden de definición (CP44) sin reordenar.
- 2026-08-19 — CP35 se escribió asumiendo el contrato de design.md §4: `consumo` recibe `gastosDelMes` ya filtrados por el llamador (comparación de cadenas sobre el campo `mes`, D3). El test construye gastos de junio y julio, filtra como lo hará el caso de uso, y fija que el gastado de julio no ve los de junio. El filtrado de punta a punta lo re-verifica CP66 en T16.

### T5 — Fijar y reemplazar los límites de un mes

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.1, R1.2, R1.4 (atomicidad), R1.11, R5.8 (parcial), BR7 (parcial) |
| **Casos de prueba** | CP13 fijar 3 categorías en un mes sin presupuesto → las 3 en el orden recibido · CP14 fijar límites en un mes que ya tenía otras → el conjunto queda reemplazado · CP15 fijar los de `2026-07` teniendo `2026-06` → junio intacto · CP18 lista vacía en un mes sin gastos → el mes queda sin presupuesto · CP19 lista de 3 con la 3.ª de límite negativo → error y las 2 primeras **no** se aplican |
| **Componente** | `presupuesto.fijarLimites` |
| **Archivos previstos** | `src/domain/presupuesto.ts`, `src/domain/presupuesto.test.ts` |
| **Decisiones que la condicionan** | D1, y `validarCategorias` de T2 (no se duplica la validación) |

CP19 es la atomicidad de R1.4 vista desde `fijarLimites`: el conjunto completo se valida —delegando en `validarCategorias`, que devuelve el primer error sin aplicar nada— antes de producir resultado, así que un rechazo nunca deja un presupuesto a medio aplicar. Vive acá y no en T6 porque su rojo solo es incondicional mientras `fijarLimites` no existe: esta tarea deja implementada la delegación, y en T6 el caso llegaría verde sin ningún test que lo fuerce.

*Hecho cuando:*

- [x] CP13, CP14, CP15, CP18 y CP19 fallan porque `fijarLimites` no existe
- [x] Los cinco pasan: el orden recibido se preserva en el resultado y un rechazo no aplica ninguna categoría
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Rojo verificado (los cinco CP fallan porque `./presupuesto` no existe) y verde con `fijarLimites` delegando la validación en `validarCategorias` (sin duplicarla, como el plan exige) y devolviendo el conjunto recibido como reemplazo completo: CP14 fija que no hay merge, CP18 que la lista vacía es válida.
- 2026-08-19 — CP19 quedó verde por la delegación misma: `validarCategorias` devuelve el primer error sin aplicar nada, así que el rechazo nunca produce resultado parcial. CP15 (BR7) se escribió sobre la estructura `Datos.presupuestos` por mes: `fijarLimites` opera sobre las categorías de un solo mes (firma de design.md §4), y el test fija que reemplazar julio no toca junio.
- 2026-08-19 — Los parámetros `actuales` y `gastosDelMes` quedan declarados y sin uso en esta tarea: son la firma aprobada en design.md §4, y T6 los necesita para contar los gastos de las categorías que desaparecen. Dejarlos ya evita cambiar la firma en T6.

### T6 — Impedir quitar una categoría que tiene gastos

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.8, R1.9, BR4 (parcial) |
| **Casos de prueba** | CP16 quitar `"Ocio"` con 2 gastos → `CATEGORIA_CON_GASTOS` con `{ categoria: "Ocio", gastos: 2 }` · CP17 quitar `"Ocio"` sin gastos → se elimina |
| **Componente** | `presupuesto.fijarLimites` |
| **Archivos previstos** | `src/domain/presupuesto.ts`, `src/domain/presupuesto.test.ts` |
| **Decisiones que la condicionan** | T2 (comparación por nombre normalizado al contar los gastos de la categoría que desaparece), y T5 (misma función `fijarLimites`, que ya existe al empezar) |

CP19 (la atomicidad de R1.4) vive en T5 y no acá: su rojo solo es incondicional mientras `fijarLimites` no existe, y T5 deja la validación delegada en `validarCategorias`, con lo que en esta tarea el caso llegaría verde sin test que lo fuerce. CP17 es la contracara de CP16: fija que el bloqueo aplica solo cuando hay gastos, para que la implementación no termine prohibiendo quitar categorías en general.

*Hecho cuando:*

- [x] CP16 falla porque `fijarLimites`, tal como quedó en T5, reemplaza el conjunto sin contar los gastos de las categorías que desaparecen
- [x] CP16 y CP17 pasan: el rechazo trae el nombre y el conteo en el detalle, y quitar una categoría sin gastos sigue permitido
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Rojo exactamente como el plan lo predijo: CP16 falló contra el `fijarLimites` de T5 (reemplazaba sin contar) y CP17 ya llegaba verde — quedó como contracara que impide sobre-prohibir. Verde agregando el conteo de gastos de cada categoría que desaparece, comparando por nombre normalizado (T2), y devolviendo `CATEGORIA_CON_GASTOS` con `{ categoria, gastos }` en el detalle y el nombre tal como está en el presupuesto.
- 2026-08-19 — El conteo corre después de `validarCategorias`: un conjunto malformado se rechaza por su propio motivo antes de mirar los gastos, con lo que el orden de errores queda igual que en T5 y CP19 no cambia de significado.

### T7 — Copiar los límites de un mes a otro

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R2.1, R2.2, R2.3, R2.4, R2.5, R2.6, BR7 (parcial) |
| **Casos de prueba** | CP20 copiar 3 categorías a un mes vacío → las mismas 3 con los mismos límites · CP21 el origen tiene gastos → el destino queda sin gastos · CP22 destino con 1 categoría → `DESTINO_NO_VACIO` · CP23 origen sin categorías → `ORIGEN_SIN_PRESUPUESTO` · CP24 origen igual a destino → `MESES_IGUALES` · CP25 tras copiar, el origen queda idéntico |
| **Componente** | `presupuesto.copiarLimites` |
| **Archivos previstos** | `src/domain/presupuesto.ts`, `src/domain/presupuesto.test.ts` |
| **Decisiones que la condicionan** | D1 (design.md): los rechazos `DESTINO_NO_VACIO`, `ORIGEN_SIN_PRESUPUESTO` y `MESES_IGUALES` se devuelven como `Resultado`, no se lanzan |

CP21 es el que hace visible que se copian límites y no historia: es la diferencia entre "arrancar agosto" y "duplicar julio".

*Hecho cuando:*

- [x] CP20–CP25 fallan porque `copiarLimites` no existe
- [x] Los seis pasan, y la copia no comparte referencias mutables con el origen
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Rojo verificado (los seis CP fallan porque `copiarLimites` no existe) y verde copiando cada categoría con spread: CP25 muta la copia devuelta y comprueba que el origen no cambia, así que la ausencia de referencias compartidas está probada, no supuesta.
- 2026-08-19 — T7-D1: orden de los rechazos: `MESES_IGUALES` → `DESTINO_NO_VACIO` → `ORIGEN_SIN_PRESUPUESTO`. El diseño no lo fija, pero CP24 (origen = destino, ambos poblados) lo obliga en la práctica: copiar un mes sobre sí mismo también tiene "destino no vacío", y el error correcto es el de meses iguales, que es la causa raíz.
- 2026-08-19 — CP21 se apoya en la firma de design.md §4: `copiarLimites` solo recibe y devuelve categorías, con lo que copiar gastos es imposible por construcción; el test fija además que el valor devuelto tiene exactamente las claves `nombre`/`limite`. El recorrido con gastos reales de por medio lo cubre CP62 en T17.

### T8 — Registrar un gasto válido

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R3.1, R3.2, R3.4, R3.8, R3.9, BR3, S1, S7 |
| **Casos de prueba** | CP26 gasto válido con id inyectado `"g1"` → se devuelve con `id: "g1"` y todos sus campos · CP27 fecha `"2026-06-28"` con junio presupuestado → `mes: "2026-06"`, no el mes que se esté mirando · CP29 categoría `" comida "` con presupuesto `"Comida"` → se almacena con el nombre canónico `"Comida"` · CP32 sin `descripcion` → `""` · CP33 dos gastos idénticos → dos registros con ids distintos |
| **Componente** | `gastos.registrarGasto` |
| **Archivos previstos** | `src/domain/gastos.ts`, `src/domain/gastos.test.ts` |
| **Decisiones que la condicionan** | D3 (el mes se deriva y se guarda), D4 (se guarda el nombre canónico), D9 (el `id` se inyecta) |

CP27 y CP29 son los dos casos que materializan las decisiones D3 y D4: si alguna se implementa distinto, uno de los dos falla.

*Hecho cuando:*

- [x] CP26, CP27, CP29, CP32 y CP33 fallan porque `registrarGasto` no existe
- [x] Los cinco pasan, y `registrarGasto` no importa `node:crypto`: recibe el `id`
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Rojo verificado (los cinco CP fallan porque `./gastos` no existe) y verde con `registrarGasto` recibiendo el `id` como argumento (D9, sin `node:crypto`), derivando `mes` con `validarFecha` + `mesDe` (D3) y resolviendo la categoría vía `buscarCategoria` para almacenar el nombre canónico del presupuesto (D4) — CP27 y CP29 clavan las dos decisiones, como el plan pedía.
- 2026-08-19 — Camino provisional consciente: si la categoría no está en el presupuesto, esta versión registra igual con el nombre recibido. Es exactamente el estado que el rojo de T9 necesita («hoy el gasto se registraría igual», CP28); T9 lo convierte en `CATEGORIA_SIN_PRESUPUESTO` junto con las validaciones de monto.

### T9 — Rechazar los gastos inválidos

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R3.3, R3.5, R3.6, BR4 (parcial), BR5, NF1 (parcial) |
| **Casos de prueba** | CP28 gasto en `"Ocio"` cuando junio no tiene esa categoría → `CATEGORIA_SIN_PRESUPUESTO` · CP30 monto `0` y `-5000` → `MONTO_NO_POSITIVO` · CP31 monto `25000.5` → `MONTO_NO_ENTERO` |
| **Componente** | `gastos.registrarGasto` |
| **Archivos previstos** | `src/domain/gastos.ts`, `src/domain/gastos.test.ts` |
| **Decisiones que la condicionan** | T8 (misma función); D5 no aplica todavía — el reparto 400/409 se implementa en T16 |

CP28 es la integridad referencial de BR4 en el momento de escribir: es lo que garantiza que no existan gastos huérfanos, y por eso la categoría se busca en el presupuesto del **mes de la fecha**, no del mes que el usuario esté viendo.

*Hecho cuando:*

- [x] CP28, CP30 y CP31 fallan: hoy el gasto se registraría igual
- [x] Los tres pasan
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Rojo verificado tal como el plan lo predijo: los tres CP fallaron contra el `registrarGasto` de T8, que registraba igual. Verde agregando las validaciones de monto y el rechazo `CATEGORIA_SIN_PRESUPUESTO` cuando `buscarCategoria` no encuentra la categoría en el presupuesto del mes de la fecha (BR4); el camino provisional de T8 (`?? entrada.categoria`) quedó eliminado.
- 2026-08-19 — T9-D1: orden de validación dentro de `registrarGasto`: fecha → monto entero → monto positivo → categoría en el presupuesto. La fecha va primero porque el mes derivado hace falta para el mensaje de `CATEGORIA_SIN_PRESUPUESTO`; entero antes que positivo replica el orden de `validarCategorias` (T2) para que los dos validadores de dinero cuenten la misma historia. Ningún CP fija el orden; queda registrado para que T16 no lo re-decida al mapear códigos.

### T10 — Listar los gastos de un mes en orden

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R6.1, R6.2, R6.3 |
| **Casos de prueba** | CP46 gastos de dos meses cargados → solo los del mes pedido, con todos sus campos · CP47 tres gastos, dos con la misma fecha → fecha descendente y, a igual fecha, el registrado más tarde primero · CP48 mes sin gastos → lista vacía sin error |
| **Componente** | `gastos.gastosDeMes` |
| **Archivos previstos** | `src/domain/gastos.ts`, `src/domain/gastos.test.ts` |
| **Decisiones que la condicionan** | D3 (filtrar por el campo `mes`, no reparseando la fecha) |

CP47 incluye el desempate a igual fecha, que el diseño precisó y los requisitos no fijan: sin él el orden sería estable por accidente y dejaría de serlo con el primer cambio.

*Hecho cuando:*

- [x] CP46, CP47 y CP48 fallan porque `gastosDeMes` no existe
- [x] Los tres pasan, y el orden es determinista con fechas repetidas
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Rojo verificado ("gastosDeMes is not a function" en los tres CP) y verde con filtro por el campo `mes` (D3, comparación de cadenas sin reparsear la fecha) y orden por fecha descendente.
- 2026-08-19 — T10-D1: el desempate «a igual fecha, el registrado más tarde primero» se implementa invirtiendo el array filtrado (cuyo orden es el de registro) antes de un sort estable por fecha: entre fechas iguales sobrevive el orden invertido, sin necesidad de un campo de secuencia. CP47 lo clava con g1 y g3 compartiendo fecha y g3 saliendo primero.

### T11 — Quitar un gasto

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R6.5, R6.6 |
| **Casos de prueba** | CP50 quitar un id inexistente → `GASTO_NO_EXISTE` · CP51 quitar 1 de 3 → quedan los otros 2, sin tocar el presupuesto |
| **Componente** | `gastos.quitarGasto` |
| **Archivos previstos** | `src/domain/gastos.ts`, `src/domain/gastos.test.ts` |
| **Decisiones que la condicionan** | D1 (borrar algo que no existe es un error del dominio, no un `no-op` silencioso) |

*Hecho cuando:*

- [x] CP50 y CP51 fallan porque `quitarGasto` no existe
- [x] Los dos pasan, y `quitarGasto` devuelve un array nuevo sin mutar el recibido
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Rojo verificado ("quitarGasto is not a function" en ambos CP) y verde con `some` + `filter`: id inexistente → `GASTO_NO_EXISTE` (D1: error del dominio, no no-op), id existente → array nuevo sin el gasto. CP51 compara el array recibido contra un clon previo para probar que no se muta, y que el presupuesto no se toca lo garantiza la firma: `quitarGasto` ni siquiera lo recibe.

### T12 — Definir el contrato `Repositorio` y la implementación en memoria

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | NF4 (parcial) |
| **Casos de prueba** | CP58 (primera mitad) la batería compartida del contrato pasa contra `RepositorioMemoria` |
| **Componente** | `Repositorio`, `RepositorioMemoria` |
| **Archivos previstos** | `src/storage/repositorio.ts`, `src/storage/repositorio-memoria.ts`, `src/storage/contrato.test.ts` |
| **Decisiones que la condicionan** | D8 (design.md): dos métodos, `leer` y `escribir`, sobre los datos completos |

La batería de CP58 se escribe **una vez** como una función que recibe una fábrica de repositorio; T13 la reusa contra la implementación de archivo. Si se escriben dos baterías separadas, las dos implementaciones se pueden separar sin que ningún test lo note.

*Hecho cuando:*

- [x] La batería del contrato falla porque `RepositorioMemoria` no existe
- [x] Pasa contra `RepositorioMemoria`, y `Datos` declara `version: 1`
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Rojo verificado (la batería falla porque `./repositorio-memoria` no existe) y verde con `bateriaDelContrato(nombre, fábrica)` exportada desde `contrato.test.ts`, tal como el plan exige: una sola batería que T13 reusará contra `RepositorioArchivo`. Cubre lectura inicial vacía (`version: 1`), escribir-y-releer, y última-escritura-gana.
- 2026-08-19 — T12-D1: `RepositorioMemoria` clona con `structuredClone` en `leer` y `escribir`: sin el clon, el llamador y el repositorio compartirían referencias y una mutación posterior contaminaría el estado "persistido" — la implementación de archivo no tiene ese problema porque serializa, y el contrato debe comportarse igual en ambas (CP58). `datosVacios()` vive en `repositorio.ts` como única definición del estado inicial.
- 2026-08-19 — Observación del verificador atendida: la batería no clavaba el aislamiento que T12-D1 justifica (quitar el clon dejaba los tests verdes). Se agregó un cuarto caso a la batería —mutar lo devuelto por `leer` y comprobar que una relectura no lo refleja—, con lo que T12-D1 pasó de convención a garantía y correrá también contra `RepositorioArchivo` en T13. Suite en verde (55 tests).

### T13 — Persistir en un archivo JSON de forma atómica y tolerante

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | NF2, NF3, NF4 |
| **Casos de prueba** | CP53 archivo inexistente → datos vacíos sin error · CP54 escribir y volver a leer → datos iguales · CP55 JSON inválido → lanza informando la ruta, y el archivo queda byte a byte igual · CP56 `version` desconocida → lanza sin sobrescribir · CP57 tras guardar, el directorio solo tiene `finanzas.json` · CP58 (segunda mitad) la batería del contrato pasa contra `RepositorioArchivo` |
| **Componente** | `RepositorioArchivo` |
| **Archivos previstos** | `src/storage/repositorio-archivo.ts`, `src/storage/repositorio-archivo.test.ts`, `.gitignore` (raíz del repo: se agrega la entrada `datos/`) |
| **Decisiones que la condicionan** | D8 (temporal + `rename`), y el riesgo de escrituras concurrentes de design.md §10 |

CP55 es el caso que protege los datos del usuario: la tentación al implementar es arrancar con datos vacíos cuando el archivo no se puede leer, y eso los borra en el primer guardado. Los tests corren en un directorio temporal (`mkdtemp`). Incluye la cola que serializa las escrituras (§10 del diseño): sin ella dos guardados concurrentes se pisan. También agrega `datos/` al `.gitignore` de la raíz del repo — T1 lo dejó explícitamente para esta tarea, que es la que introduce el código que escribe `datos/finanzas.json`; sin esa entrada, el archivo con los datos del usuario quedaría versionable.

*Hecho cuando:*

- [x] CP53–CP57 fallan porque `RepositorioArchivo` no existe
- [x] CP53–CP57 pasan y la batería compartida de CP58 pasa contra las dos implementaciones
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Rojo verificado (CP53–CP57 y la segunda mitad de CP58 fallan porque `./repositorio-archivo` no existe) y verde. Los tests corren en `mkdtemp` como el plan fija. CP55 y CP56 verifican las dos mitades: lanza informando la ruta **y** el archivo queda byte a byte igual — el camino que protege los datos del usuario (NF3). La batería de CP58 se importa desde `contrato.test.ts`, no se duplica.
- 2026-08-19 — Escritura atómica con temporal en el mismo directorio + `rename` (D8, NF2); si `writeFile` o `rename` fallan, el temporal se borra, con lo que CP57 (solo `finanzas.json` tras guardar) vale también en el camino de error. La cola de promesas de §10 serializa `escribir`: se agregó un test propio (fuera de los CP numerados) que dispara 5 escrituras concurrentes y fija que queda la última — la cola además nunca queda rechazada: un fallo se propaga a su llamador sin bloquear las escrituras siguientes.
- 2026-08-19 — `datos/` agregado al `.gitignore` de la raíz, como T1 lo dejó reservado para esta tarea. ENOENT es el único error de lectura que devuelve datos vacíos (CP53); cualquier otro (permisos, corrupción, versión) lanza sin tocar el archivo.
- 2026-08-19 — Observaciones del verificador atendidas: (1) el no-cacheo respecto de design.md §10 quedó registrado como DV1 en §7; (2) la afirmación «la cola nunca queda rechazada» ahora tiene test: un `escribir` que falla (un directorio ocupando la ruta destino) se propaga a su llamador y el siguiente `escribir` funciona. Suite en verde (70 tests).

### T14 — Casos de uso de presupuesto: ver el mes, fijar límites, copiar

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R5.7, y la atomicidad de persistencia de R1.4, R1.8, R2.3 |
| **Casos de prueba** | CP52 (ramas R1.4, R1.8 y R2.3) una operación que falla en el dominio → el repositorio no recibe ninguna escritura · CP43 (vía `verMes`) mes sin presupuesto → `{ mes, categorias: [] }` sin error |
| **Componente** | `casos-uso.verMes`, `casos-uso.fijarLimites`, `casos-uso.copiarLimites` |
| **Archivos previstos** | `src/app/casos-uso.ts`, `src/app/casos-uso.test.ts` |
| **Decisiones que la condicionan** | D2 (design.md): esta capa existe para poder probar la orquestación sin HTTP |

CP52 se verifica con un `RepositorioMemoria` que cuente las escrituras: es la única forma de comprobar que un rechazo no dejó nada persistido. Se escribe como un helper parametrizado por operación, y acá se ejercitan las tres ramas cuyas operaciones nacen en esta tarea (límite negativo en `fijarLimites`, categoría con gastos en `fijarLimites`, destino no vacío en `copiarLimites`). La cuarta rama de CP52 —el rechazo R3.3 de `registrarGasto`— la completa T15 reutilizando el mismo helper, porque `casos-uso.registrarGasto` nace allí y su rojo es inescribible en esta tarea.

*Hecho cuando:*

- [x] CP52 (ramas R1.4, R1.8 y R2.3) y CP43-vía-`verMes` fallan porque los casos de uso no existen
- [x] Las tres ramas y CP43 pasan, y ninguna operación escribe cuando el dominio devuelve `ok: false`
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Rojo verificado (los cuatro CP fallan porque `./casos-uso` no existe) y verde. CP52 quedó como el plan lo pide: `RepositorioContador` (un `RepositorioMemoria` que cuenta escrituras) + helper `esperarRechazoSinEscritura(repo, operacion, codigo)`, exportados desde `casos-uso.test.ts` para que T15 los reuse en la rama R3.3. Cada operación escribe una sola vez y únicamente con `ok: true`.
- 2026-08-19 — T14-D1: el tipo `CasosUso` se declara en esta tarea solo con las tres operaciones de presupuesto y se completa en T15 con las de gastos. La alternativa (declarar las seis ya con stubs) fabricaría implementación sin test y dejaría el rojo de T15 sin razón de existir. `crearCasosUso` ya recibe `generarId` (firma de design.md §4), que T15 consumirá.
- 2026-08-19 — Dos tests extra sin CP numerado: R1.11 en persistencia (la lista vacía **borra la clave del mes** en `Datos.presupuestos` — la traducción «array vacío = sin presupuesto» que T5 dejó pendiente a esta capa) y el consumo de `verMes` calculado con los gastos del mes pedido. `copiarLimites` valida ambos meses antes de leer; el orden destino→origen no lo fija ningún CP.

### T15 — Casos de uso de gastos: registrar con aviso, listar, borrar

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R4.6, R6.4, R3.3 (solo atomicidad de persistencia), R3.9 (parcial: acá se inyecta el `generarId` real) |
| **Casos de prueba** | CP45 registrar en `"Comida"` con `"Ocio"` también excedida → la respuesta trae el consumo **solo** de `"Comida"` · CP49 borrar un gasto y volver a pedir el consumo → el gastado de su categoría baja en el monto del gasto · CP52 (rama R3.3) `registrarGasto` rechazado por el dominio → el repositorio no recibe ninguna escritura, reusando el helper y el `RepositorioMemoria` contador de escrituras de T14 |
| **Componente** | `casos-uso.registrarGasto`, `casos-uso.listarGastos`, `casos-uso.borrarGasto` |
| **Archivos previstos** | `src/app/casos-uso.ts`, `src/app/casos-uso.test.ts` |
| **Decisiones que la condicionan** | D2, D9 (acá se inyecta `crypto.randomUUID`), y T14 (no escribir si el dominio rechaza) |

CP45 es el criterio que hace que el aviso de exceso sea utilizable: la respuesta del registro trae el estado de la categoría afectada, y solo de ella. CP49 cierra el ciclo de la corrección: borrar tiene que verse en el consumo, no solo en la lista. La rama R3.3 de CP52 vive acá y no en T14 porque su rojo exige `casos-uso.registrarGasto`, que nace en esta tarea: T14 dejó el helper parametrizado por operación y esta tarea completa la cuarta rama reutilizándolo. R3.9 entra parcial por la mitad que design.md §8 asigna a `casos-uso`: acá se inyecta el `generarId` real (D9), y el check de que el `id` no se genera en el dominio es lo que lo verifica — la unicidad en sí quedó clavada por CP33 en T8. `listarGastos` no tiene CP propio y es deliberado: el filtrado y el orden viven en `gastosDeMes` (CP46–CP48, T10), este caso de uso solo lee y delega, y el recorrido de punta a punta lo verifica CP68 en T17.

*Hecho cuando:*

- [x] CP45, CP49 y la rama R3.3 de CP52 fallan porque los casos de uso de gastos no existen
- [x] Los tres pasan, el `id` se genera acá y no en el dominio, `listarGastos` delega en `gastosDeMes` sin reordenar ni filtrar por su cuenta, y `registrarGasto` no escribe cuando el dominio devuelve `ok: false`
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Rojo verificado (los cinco tests nuevos fallan: `registrarGasto`/`listarGastos`/`borrarGasto` no existen en `CasosUso`) y verde completando el tipo que T14-D1 dejó parcial. La rama R3.3 de CP52 reusa `RepositorioContador` y `esperarRechazoSinEscritura` de T14, como el plan exige. CP45 siembra "Ocio" ya excedida y fija que la respuesta trae el consumo de "Comida" con su estado; CP49 borra `g1` y ve el gastado de "Ocio" caer de 200000 a 0 vía `verMes`.
- 2026-08-19 — Dos tests extra sin CP numerado, ambos previstos por los checks del plan: el `id` sale del `generarId` inyectado (patrón `id-N` de la fábrica de prueba — en producción T19 inyecta `crypto.randomUUID`), y `listarGastos` devuelve solo el mes pedido en el orden de `gastosDeMes` (g2 antes que g1, descendente).
- 2026-08-19 — T15-D1: para elegir el presupuesto contra el que se registra, el caso de uso toma `fecha.slice(0, 7)` **antes** de que el dominio valide la fecha. Si la fecha es basura, la clave no matchea ningún mes, pero no importa: `registrarGasto` valida la fecha primero (T9-D1) y rechaza antes de mirar categorías. La alternativa (validar la fecha dos veces, en las dos capas) duplicaría la validación que D4/D9 quieren en un solo lugar.

### T16 — Servidor HTTP: errores y rutas de presupuesto

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.1, R1.4, R1.8, R5.1, R5.9 |
| **Casos de prueba** | CP59 `PUT /api/presupuestos/2026-07` con 2 categorías → `200` con las guardadas · CP60 `PUT` con límite negativo → `400` con el motivo · CP61 `PUT` que quita una categoría con gastos → `409` con el nombre y el conteo · CP66 `GET /api/presupuestos/2026-07` → `200` con límite, gastado, restante, porcentaje y estado · CP67 `GET /api/presupuestos/2026-13` → `400` · CP72 `GET /api/inventado` → `404` · CP73 `POST /api/gastos` con cuerpo no-JSON → `400` sin caerse |
| **Componente** | `servidor`, `errores-http` |
| **Archivos previstos** | `src/server/servidor.ts`, `src/server/errores-http.ts`, `src/server/servidor.test.ts` |
| **Decisiones que la condicionan** | D5 (reparto 400/409), D7 (`node:http` sin Express), D1 (el mapeo de códigos es exhaustivo y el compilador lo obliga) |

CP60 y CP61 juntos son la prueba de D5: el mismo `PUT` devuelve `400` o `409` según si el problema está en lo que el usuario envió o en lo que ya tiene guardado. Los tests levantan el servidor real en puerto efímero (`listen(0)`) con `RepositorioMemoria`. CP73 se satisface parseando el JSON del cuerpo antes de enrutar: el `400` sale del pipeline del servidor, no de una ruta concreta (`design.md` §6 lo declara "capa HTTP"), así que esta tarea no agrega ningún stub de la ruta de gastos — esa ruta es alcance de T17.

*Hecho cuando:*

- [x] CP59, CP60, CP61, CP66, CP67, CP72 y CP73 fallan porque no hay servidor
- [x] Los siete pasan, y `errores-http` cubre los 14 códigos de `CodigoError` de forma exhaustiva
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — Rojo verificado (los siete CP fallan porque `./servidor` no existe) y verde. Los tests levantan el servidor real con `listen(0)` y `RepositorioMemoria`, como el plan fija; CP73 además vuelve a pedir una ruta sana tras el cuerpo ilegible para probar el «sin caerse». `errores-http` usa `Record<CodigoError, number>`: el compilador obliga el mapeo exhaustivo de los 14 códigos (D1); el reparto sigue la tabla de design.md §6 (409 solo para `CATEGORIA_CON_GASTOS`, `DESTINO_NO_VACIO`, `ORIGEN_SIN_PRESUPUESTO`; 404 para `GASTO_NO_EXISTE`).
- 2026-08-19 — El cuerpo se parsea antes de enrutar, como el plan exige: el 400 de CP73 sale del pipeline (`POST /api/gastos` con JSON roto responde 400 sin que exista todavía la ruta de gastos, que es alcance de T17). El enrutado es un split del pathname sin dependencias (D7). El cuerpo de error HTTP es `{ codigo, mensaje, detalle? }` — CP60 verifica el mensaje y CP61 el detalle con nombre y conteo.
- 2026-08-19 — T16-D1: el `PUT` de presupuestos recibe `{ categorias: [...] }` y responde `{ categorias: [...] }`; un cuerpo sin esa clave se trata como lista vacía, que el dominio resuelve por R1.11 (mes sin gastos queda sin presupuesto) o rechaza por R1.8 (si quita categorías con gastos). No se inventó un error HTTP nuevo para "cuerpo con forma inesperada": el catálogo de errores es el del dominio.
- 2026-08-19 — Observación del verificador registrada: `crearServidor` envuelve el handler con un catch que responde `500 "Error interno."` ante excepciones no previstas (p. ej. un repositorio que lanza). Es plomería defensiva sin CP —ningún requisito la fija— y se deja porque la alternativa es que una promesa rechazada tumbe el proceso; no tiene test porque provocar ese camino exigiría un repositorio saboteado, y el catálogo de errores del dominio nunca pasa por ahí.

### T17 — Servidor HTTP: rutas de copiar y de gastos

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R2.1, R2.3, R3.3, R4.1, R6.1, R6.2, R6.4, R6.5 |
| **Casos de prueba** | CP62 `POST /api/presupuestos/2026-08/copiar-de/2026-07` con destino vacío → `200` con las copiadas · CP63 el mismo con destino poblado → `409` · CP64 `POST /api/gastos` que excede → `201` con el gasto y `estado "excedido"` con el monto excedido · CP65 `POST /api/gastos` en categoría sin presupuesto en el mes de la fecha → `400` · CP68 `GET /api/gastos?mes=2026-07` → `200` en orden descendente · CP69 `DELETE /api/gastos/{id}` existente y luego `GET` del mes → `204` y el consumo ya no lo cuenta · CP71 `DELETE /api/gastos/no-existe` → `404` |
| **Componente** | `servidor` |
| **Archivos previstos** | `src/server/servidor.ts`, `src/server/servidor.test.ts` |
| **Decisiones que la condicionan** | T16 (mapeo de errores ya montado), D5 |

CP64 es el requisito estrella visto de punta a punta: el aviso de exceso viaja en la respuesta del `POST`, que es lo que permite que la UI avise en el momento sin una segunda petición.

*Hecho cuando:*

- [ ] CP62, CP63, CP64, CP65, CP68, CP69 y CP71 fallan porque las rutas no existen
- [ ] Los siete pasan, y las seis rutas del diseño responden
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T18 — Blindar la pureza del dominio con una prueba estructural

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | NF4 |
| **Casos de prueba** | CP74 leer los archivos de `src/domain/` → ninguno importa `node:*`, `src/storage/`, `src/app/` ni `src/server/` |
| **Componente** | `src/domain/` completo |
| **Archivos previstos** | `src/domain/pureza.test.ts` |
| **Decisiones que la condicionan** | D9 (el `id` se inyecta precisamente para no importar `node:crypto`) |

Va al cerrar el dominio, antes del almacenamiento (§3): ejecutado ahí, CP74 corre en el `npm test` de todas las tareas siguientes y una importación indebida se detecta en la tarea que la introduce. Es el test que convierte NF4 de intención en garantía: sin él, la primera vez que alguien necesite un `Date.now()` o un `randomUUID` dentro del dominio nadie se va a enterar.

El escaneo excluye `*.test.ts`, y no es un detalle: `pureza.test.ts` vive en `src/domain/` e importa `node:fs` para leer los archivos, así que el escaneo literal de CP74 se marcaría a sí mismo. La exclusión es fiel a NF4, que protege las **reglas** del dominio —lo que se ejecuta sin servidor ni disco—, no a sus tests, que corren en Vitest y pueden tocar lo que necesiten.

*Hecho cuando:*

- [x] El test falla si se agrega a propósito un `import "node:fs"` en un archivo de producción del dominio (p. ej. `consumo.ts`)
- [x] Pasa con el dominio tal como quedó en T1–T11, sin marcar ningún `*.test.ts` — empezando por el propio `pureza.test.ts`
- [x] `npm run typecheck` y `npm test` en verde

**Bitácora**

- 2026-08-19 — `pureza.test.ts` lee los `.ts` de producción de `src/domain/` (excluye `*.test.ts`, como el plan fija: él mismo importa `node:fs`) y falla ante `node:*`, `storage/`, `app/` o `server/`. Asevera además que la lista escaneada no está vacía, para que un glob roto no dé un verde hueco.
- 2026-08-19 — El check del rojo forzado atrapó un hueco real: la primera versión solo detectaba `from "node:..."`, y el `import "node:fs"` por efecto —exactamente el que el plan pide plantar— pasaba de largo. Se ampliaron los patrones (import por efecto, `import()` dinámico, `require`, y cualquier cadena con `/storage/`, `/app/`, `/server/`). Rojo forzado verificado dos veces: `node:fs` en `consumo.ts` y un import de `../storage/` en `mes.ts`; ambos restaurados y la suite quedó en verde (51 tests).

### T19 — Arranque: cargar el archivo y levantar el servidor

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | — (andamiaje de composición que design.md §2 pide: `src/main.ts`) |
| **Casos de prueba** | Ninguno nuevo. NF3 quedó cubierto por CP55 y CP56 en T13; esta tarea solo compone las piezas ya probadas |
| **Componente** | `main` (bin) |
| **Archivos previstos** | `src/main.ts`, `package.json` (script `start`) |
| **Decisiones que la condicionan** | D8, y el flujo D de design.md §3: si el archivo es ilegible, el proceso no arranca y **no** sobrescribe |

Única tarea sin test propio, y es deliberado: no agrega comportamiento, cablea `RepositorioArchivo` + `crearCasosUso` + `crearServidor`. Verificación a mano, con dos comprobaciones concretas porque el camino de error es el que protege los datos.

*Hecho cuando:*

- [ ] `npm start` levanta el servidor y `GET /api/presupuestos/<mes actual>` responde `200`
- [ ] Con un `datos/finanzas.json` deliberadamente corrupto, el proceso termina con código distinto de cero, informa la ruta, y el archivo queda intacto
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T20 — UI: ver el mes y arrancarlo copiando el anterior

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R5.1, R5.4, R5.7, R5.8, R2.1, R2.3 (en pantalla) |
| **Casos de prueba** | Ninguno automatizado — D6 dejó `web/` sin pruebas. Los cálculos que muestra están cubiertos por CP34–CP44 |
| **Componente** | `api` (web), `vista` (web), `main` (web) |
| **Archivos previstos** | `web/index.html`, `web/src/api.ts`, `web/src/vista.ts`, `web/src/main.ts`, `vite.config.ts`, `package.json` (script `dev`) |
| **Decisiones que la condicionan** | D6 (sin tests de UI), y el riesgo de §10: `web/` **no calcula** estados ni porcentajes, los recibe |

Si al implementar aparece la necesidad de calcular algo en la vista, es señal de que falta un campo en `ConsumoCategoria` — se agrega en el dominio con su caso de prueba, no en la UI.

*Hecho cuando:*

- [ ] El selector de mes carga las categorías con su barra de consumo y el color de su estado, en el orden en que la API las devuelve — la vista no reordena
- [ ] Un mes sin presupuesto muestra el estado vacío y ofrece copiar el mes anterior; al copiar, las categorías del origen aparecen con sus límites; si el destino ya tiene límites, se muestra el mensaje del `409`
- [ ] Una categoría excedida se distingue a simple vista y muestra el monto sobrepasado
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T21 — UI: registrar un gasto con aviso de exceso

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R3.1, R3.3, R3.5, R3.6, R4.1 (en pantalla) |
| **Casos de prueba** | Ninguno automatizado — D6. El aviso que muestra viene de la respuesta verificada en CP64, y el mensaje de rechazo, de la verificada en CP65 |
| **Componente** | `api` (web), `vista` (web), `main` (web) |
| **Archivos previstos** | `web/src/api.ts`, `web/src/vista.ts`, `web/src/main.ts` |
| **Decisiones que la condicionan** | D6, T17 (el estado de la categoría llega en la respuesta del `POST`, sin segunda petición), y T23 (el gate del plan la ubicó antes en el orden de ejecución de §3: construye la pantalla de límites a la que el aviso del `400` de R3.3 enlaza) |

Extiende `web/src/api.ts` —que T20 crea solo con las rutas de presupuesto— con la llamada `POST /api/gastos`. La lista de gastos y el borrado quedan en T22: son la familia R6 y se demuestran por separado en pantalla. La acción de definir el límite que el mensaje del `400` sugiere («Defínelo primero», design.md §6) exige la pantalla del `PUT /api/presupuestos`: la construye T23, que el orden de ejecución de §3 deja antes de esta tarea, así que el enlace del aviso ya tiene dónde llevar al usuario cuando esta tarea se ejecute.

*Hecho cuando:*

- [ ] El formulario registra un gasto y las barras de consumo del mes se actualizan
- [ ] Un gasto que excede muestra el aviso con el monto sobrepasado, tomado de la respuesta del `POST`
- [ ] Un gasto en una categoría sin presupuesto en el mes de su fecha muestra el mensaje del `400` con un enlace a la pantalla de límites de T23; un monto inválido (cero, negativo o con decimales) muestra su propio mensaje del `400`
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T22 — UI: listar los gastos del mes y borrar uno

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R6.1, R6.2, R6.3, R6.4 (en pantalla) |
| **Casos de prueba** | Ninguno automatizado — D6. El orden lo garantiza la API (CP68) y el efecto del borrado sobre el consumo, CP69 |
| **Componente** | `api` (web), `vista` (web), `main` (web) |
| **Archivos previstos** | `web/src/api.ts`, `web/src/vista.ts`, `web/src/main.ts` |
| **Decisiones que la condicionan** | D6, y el riesgo de design.md §10: tras borrar, el consumo actualizado se vuelve a pedir a la API, no se recalcula en la vista |

Nace de partir la T21 original: registrar (R3/R4) y listar-y-borrar (R6) son dos familias que se demuestran por separado en pantalla. Extiende `web/src/api.ts` con `GET /api/gastos?mes=` y `DELETE /api/gastos/{id}`. La lista llega ya ordenada de la API (CP68): la vista no reordena.

*Hecho cuando:*

- [ ] La lista muestra los gastos del mes con su fecha, categoría, monto y descripción, en el orden en que la API los devuelve
- [ ] Un mes sin gastos muestra la lista vacía, sin error
- [ ] Borrar un gasto lo quita de la lista y baja el consumo de su categoría
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T23 — UI: fijar y ajustar los límites del mes

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.1, R1.2, R1.4, R1.8 (en pantalla) |
| **Casos de prueba** | Ninguno automatizado — D6 dejó `web/` sin pruebas. El `PUT` que esta pantalla dispara está verificado en la API: CP59 (éxito), CP60 (`400` por límite negativo), CP61 (`409` con el nombre y el conteo); el reemplazo del conjunto, en CP14 y CP15 |
| **Componente** | `api` (web), `vista` (web), `main` (web) |
| **Archivos previstos** | `web/src/api.ts`, `web/src/vista.ts`, `web/src/main.ts` |
| **Decisiones que la condicionan** | D5 (el código HTTP dice qué acción ofrecer: `400` → corregir el formulario, `409` → revisar los gastos), D6, y el riesgo de design.md §10: la vista no valida límites por su cuenta, muestra lo que la API responde |

Nace del diagnóstico de T21: ninguna tarea construía R1 en pantalla (T20 cubre R5 y R2, T21 R3 y R4, T22 R6), y sin esta pantalla la app no puede crear su **primer** presupuesto desde la UI — copiar (T20) exige un origen que nadie pudo definir. Es el flujo B de design.md §3 visto desde la pantalla, y es donde vive la affordance «definir ese límite» que T21 delegó («Defínelo primero», design.md §6). Extiende `web/src/api.ts` con `PUT /api/presupuestos/{mes}`. El mismo editor sirve para fijar (mes sin presupuesto) y ajustar (mes con límites): agregar, quitar y cambiar filas de categoría-límite y guardar el conjunto completo, que es exactamente como el dominio trata la operación (R1.2 reemplaza, no parchea).

*Hecho cuando:*

- [ ] Un mes sin presupuesto permite crear el primero desde la pantalla: se agregan categorías con su límite, se guarda y las barras de consumo aparecen
- [ ] Editar los límites de un mes que ya los tiene los reemplaza y la vista refleja el conjunto nuevo
- [ ] Un límite negativo muestra el mensaje del `400` sobre el formulario; quitar una categoría con gastos muestra el `409` con el nombre y el conteo, ofreciendo revisar los gastos en lugar de corregir el formulario
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

## 5. Trazabilidad criterio → tarea

| Requisito | Tarea |
|---|---|
| R1.1 | T5, T16, T23 |
| R1.2 | T5, T23 |
| R1.3 | T2 |
| R1.4 | T2, T5, T14, T16, T23 |
| R1.5 | T2 |
| R1.6 | T2 |
| R1.7 | T2 |
| R1.8 | T6, T14, T16, T23 |
| R1.9 | T6 |
| R1.10 | T1 |
| R1.11 | T5 |
| R2.1 | T7, T17, T20 |
| R2.2 | T7 |
| R2.3 | T7, T14, T17, T20 |
| R2.4 | T7 |
| R2.5 | T7 |
| R2.6 | T7 |
| R3.1 | T8, T21 |
| R3.2 | T1, T8 |
| R3.3 | T9, T15, T17, T21 |
| R3.4 | T2, T8 |
| R3.5 | T9, T21 |
| R3.6 | T9, T21 |
| R3.7 | T1 |
| R3.8 | T8 |
| R3.9 | T8, T15 |
| R4.1 | T3, T17, T21 |
| R4.2 | T3 |
| R4.3 | T3 |
| R4.4 | T3 |
| R4.5 | T3 |
| R4.6 | T15 |
| R5.1 | T4, T16, T20 |
| R5.2 | T4 |
| R5.3 | T3 |
| R5.4 | T3, T20 |
| R5.5 | T3 |
| R5.6 | T3 |
| R5.7 | T4, T14, T20 |
| R5.8 | T4, T5, T20 |
| R5.9 | T1, T16 |
| R6.1 | T10, T17, T22 |
| R6.2 | T10, T17, T22 |
| R6.3 | T10, T22 |
| R6.4 | T15, T17, T22 |
| R6.5 | T11, T17 |
| R6.6 | T11 |
| NF1 | T2, T3, T9 |
| NF2 | T13 |
| NF3 | T13 |
| NF4 | T12, T13, T18 |
| BR1 | T2 |
| BR2 | T2 |
| BR3 | T1, T8 |
| BR4 | T6, T9 |
| BR5 | T9 |
| BR6 | T4 |
| BR7 | T4, T5, T7 |

Ningún criterio queda sin tarea. Cuando una tarea aparece varias veces es porque el criterio se cubre en capas: el cálculo en el dominio y otra vez de punta a punta en la API o en la pantalla.

## 6. Registro de decisiones

*Vacío: esta sección solo la puede llenar la implementación. Una decisión escrita antes de tomarla es una conjetura con aspecto de registro.*

| # | Tarea | Decisión | Fecha |
|---|---|---|---|
| T1-D1 | T1 | Validación de calendario con tabla de días y bisiestos propia, sin `Date` (ver bitácora T1) | 2026-08-19 |
| T2-D1 | T2 | `NOMBRE_DUPLICADO` informa el nombre tal como se escribió primero, no el del choque (ver bitácora T2) | 2026-08-19 |
| T7-D1 | T7 | Orden de rechazos al copiar: `MESES_IGUALES` → `DESTINO_NO_VACIO` → `ORIGEN_SIN_PRESUPUESTO` (ver bitácora T7) | 2026-08-19 |
| T9-D1 | T9 | Orden de validación al registrar: fecha → monto entero → monto positivo → categoría (ver bitácora T9) | 2026-08-19 |
| T10-D1 | T10 | Desempate a igual fecha por inversión + sort estable, sin campo de secuencia (ver bitácora T10) | 2026-08-19 |
| T12-D1 | T12 | `RepositorioMemoria` clona en `leer`/`escribir` para igualar la semántica del repositorio de archivo (ver bitácora T12) | 2026-08-19 |
| T14-D1 | T14 | El tipo `CasosUso` se declara parcial en T14 y se completa en T15, sin stubs (ver bitácora T14) | 2026-08-19 |
| T15-D1 | T15 | El caso de uso elige el presupuesto con `fecha.slice(0, 7)` sin pre-validar: el dominio valida la fecha primero (ver bitácora T15) | 2026-08-19 |
| T16-D1 | T16 | El `PUT` de presupuestos usa `{ categorias }` en ambos sentidos; cuerpo sin esa clave = lista vacía, sin error HTTP nuevo (ver bitácora T16) | 2026-08-19 |

## 7. Desvíos del diseño

*Vacío hasta que la implementación encuentre el primero.*

| # | Tarea | Qué difiere de design.md | Resolución |
|---|---|---|---|
| DV1 | T13 | §10 dice que `RepositorioArchivo` «mantiene los datos en memoria tras la carga inicial»; la implementación no cachea: `leer` va al disco siempre | Se acepta el desvío: la parte esencial de la mitigación (serializar escrituras) está implementada y con test; releer del disco es inocuo con `rename` atómico y evita un caché que puede desincronizarse. Señalado por el task-verifier de T13 |

## 8. Tareas descubiertas durante la implementación

*Las 22 tareas originales salen de las tablas §7 y §8 de `design.md` (T22 nació al partir la T21 original durante el dimensionado, con el plan todavía en borrador — no es un descubrimiento de implementación, y por eso no se lista abajo). T23 apareció después del plan original, también con el plan en borrador. Lo que aparezca durante la implementación se agrega acá con su número, y si para escribirlo hace falta un criterio de aceptación nuevo, vuelve a `requirements.md` con su gate.*

| # | Tarea | Por qué apareció | ¿Cambia el alcance? |
|---|---|---|---|
| T23 | UI: fijar y ajustar los límites del mes | Diagnóstico de T21: ninguna tarea construía R1 en pantalla, y la affordance «definir ese límite» que su `400` sugiere no tenía dónde vivir | No — «fijar y ajustar los límites» es el primer punto del alcance aprobado (requirements.md §2); solo faltaba su pantalla |
