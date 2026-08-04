# Tareas — Presupuesto mensual por categoría

| | |
|---|---|
| **Requisitos** | [requirements.md](./requirements.md) |
| **Diseño** | [design.md](./design.md) |
| **Estado del plan** | Borrador |
| **Última actualización** | 2026-08-04 |

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
| T7 | Copiar los límites de un mes a otro | T2 |
| T8 | Registrar un gasto válido | T1, T2 |
| T9 | Rechazar los gastos inválidos | T8 |
| T10 | Listar los gastos de un mes en orden | T1 |
| T11 | Quitar un gasto | T10 |
| T12 | Definir el contrato `Repositorio` y la implementación en memoria | T1 |
| T13 | Persistir en un archivo JSON de forma atómica y tolerante | T12 |
| T14 | Casos de uso de presupuesto: ver el mes, fijar límites, copiar | T4, T6, T7, T12 |
| T15 | Casos de uso de gastos: registrar con aviso, listar, borrar | T9, T11, T14 |
| T16 | Servidor HTTP: errores y rutas de presupuesto | T14 |
| T17 | Servidor HTTP: rutas de copiar y de gastos | T15, T16 |
| T18 | Blindar la pureza del dominio con una prueba estructural | T4, T11 |
| T19 | Arranque: cargar el archivo y levantar el servidor | T13, T17 |
| T20 | UI: ver el mes y arrancarlo copiando el anterior | T19 |
| T21 | UI: registrar un gasto con aviso de exceso, listar y borrar | T20 |

**Qué obliga el orden.** T1 va primero porque nada compila sin `Resultado` ni los tipos, y porque valida el formato de mes y fecha que todo lo demás asume. T3 antes de T4 porque el consumo del mes es la agregación de lo que T3 calcula para una categoría. T6 después de T5 porque quitar una categoría es un caso de la misma función que fija los límites. T12 antes de T13 porque la batería de tests del contrato se escribe contra la implementación en memoria y luego se reusa contra la de archivo (CP58). T16 antes de T17 porque T16 monta el servidor y la traducción de errores que T17 solo extiende con más rutas. T19 antes de la UI porque hasta ahí no hay nada que un navegador pueda pedir.

**Qué elegí yo.** Que el dominio vaya completo (T1–T11) antes del almacenamiento y el transporte: son las once tareas que se prueban sin infraestructura y donde vive todo lo que el spec discutió. T3 y T4 antes de T5–T7 no es una dependencia técnica —fijar límites no necesita el cálculo del consumo— sino que el cálculo es el corazón del producto y prefiero tenerlo verde temprano. T18 podría ir en cualquier punto después de T4; la puse al cerrar el dominio para que falle si alguna de las once tareas metió una importación indebida. T20 antes de T21 para que la primera cosa demostrable en pantalla sea ver un mes, no registrar.

## 4. Tareas

### T1 — Levantar el proyecto y validar meses y fechas

**Estado:** `Pendiente`

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

- [ ] `npm test` ejecuta y CP1–CP6 fallan por la razón esperada: `validarMes`, `validarFecha` y `mesDe` no existen
- [ ] CP1–CP6 pasan, con `validarMes` y `validarFecha` devolviendo `Resultado` sin lanzar, y `mesDe` devolviendo `Mes` sobre una fecha ya validada
- [ ] `git status` no lista `node_modules/` entre los archivos sin seguimiento
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T2 — Normalizar nombres y validar el conjunto de categorías

**Estado:** `Pendiente`

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

- [ ] CP7–CP12 fallan porque `normalizar` y `validarCategorias` no existen
- [ ] CP7–CP12 pasan, y `validarCategorias` devuelve el primer error encontrado sin aplicar nada
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T3 — Calcular el consumo de una categoría: estado, porcentaje y exceso

**Estado:** `Pendiente`

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

- [ ] CP36–CP42 y CP70 fallan porque `consumoDeCategoria` no existe
- [ ] Los ocho pasan, con `UMBRAL_ALERTA` como parámetro con valor por defecto 80
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T4 — Calcular el consumo de un mes completo

**Estado:** `Pendiente`

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

- [ ] CP34, CP35, CP43 y CP44 fallan porque `consumo` no existe
- [ ] Los cuatro pasan, y `consumo` no reimplementa el cálculo: delega en `consumoDeCategoria`
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T5 — Fijar y reemplazar los límites de un mes

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.1, R1.2, R1.11, R5.8 (parcial), BR7 (parcial) |
| **Casos de prueba** | CP13 fijar 3 categorías en un mes sin presupuesto → las 3 en el orden recibido · CP14 fijar límites en un mes que ya tenía otras → el conjunto queda reemplazado · CP15 fijar los de `2026-07` teniendo `2026-06` → junio intacto · CP18 lista vacía en un mes sin gastos → el mes queda sin presupuesto |
| **Componente** | `presupuesto.fijarLimites` |
| **Archivos previstos** | `src/domain/presupuesto.ts`, `src/domain/presupuesto.test.ts` |
| **Decisiones que la condicionan** | D1, y `validarCategorias` de T2 (no se duplica la validación) |

*Hecho cuando:*

- [ ] CP13, CP14, CP15 y CP18 fallan porque `fijarLimites` no existe
- [ ] Los cuatro pasan, y el orden recibido se preserva en el resultado
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T6 — Impedir quitar una categoría que tiene gastos

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.8, R1.9, R1.4 (atomicidad), BR4 (parcial) |
| **Casos de prueba** | CP16 quitar `"Ocio"` con 2 gastos → `CATEGORIA_CON_GASTOS` con `{ categoria: "Ocio", gastos: 2 }` · CP17 quitar `"Ocio"` sin gastos → se elimina · CP19 lista de 3 con la 3.ª de límite negativo → error y las 2 primeras **no** se aplican |
| **Componente** | `presupuesto.fijarLimites` |
| **Archivos previstos** | `src/domain/presupuesto.ts`, `src/domain/presupuesto.test.ts` |
| **Decisiones que la condicionan** | T2 (comparación por nombre normalizado al contar los gastos de la categoría que desaparece) |

CP19 es el caso de atomicidad: `fijarLimites` valida todo el conjunto antes de devolver algo, así que un rechazo nunca deja un presupuesto a medio aplicar.

*Hecho cuando:*

- [ ] CP16, CP17 y CP19 fallan: hoy la categoría se quitaría sin mirar los gastos
- [ ] Los tres pasan, y el detalle del error trae el nombre y el conteo
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T7 — Copiar los límites de un mes a otro

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R2.1, R2.2, R2.3, R2.4, R2.5, R2.6, BR7 (parcial) |
| **Casos de prueba** | CP20 copiar 3 categorías a un mes vacío → las mismas 3 con los mismos límites · CP21 el origen tiene gastos → el destino queda sin gastos · CP22 destino con 1 categoría → `DESTINO_NO_VACIO` · CP23 origen sin categorías → `ORIGEN_SIN_PRESUPUESTO` · CP24 origen igual a destino → `MESES_IGUALES` · CP25 tras copiar, el origen queda idéntico |
| **Componente** | `presupuesto.copiarLimites` |
| **Archivos previstos** | `src/domain/presupuesto.ts`, `src/domain/presupuesto.test.ts` |
| **Decisiones que la condicionan** | — |

CP21 es el que hace visible que se copian límites y no historia: es la diferencia entre "arrancar agosto" y "duplicar julio".

*Hecho cuando:*

- [ ] CP20–CP25 fallan porque `copiarLimites` no existe
- [ ] Los seis pasan, y la copia no comparte referencias mutables con el origen
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T8 — Registrar un gasto válido

**Estado:** `Pendiente`

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

- [ ] CP26, CP27, CP29, CP32 y CP33 fallan porque `registrarGasto` no existe
- [ ] Los cinco pasan, y `registrarGasto` no importa `node:crypto`: recibe el `id`
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T9 — Rechazar los gastos inválidos

**Estado:** `Pendiente`

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

- [ ] CP28, CP30 y CP31 fallan: hoy el gasto se registraría igual
- [ ] Los tres pasan
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T10 — Listar los gastos de un mes en orden

**Estado:** `Pendiente`

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

- [ ] CP46, CP47 y CP48 fallan porque `gastosDeMes` no existe
- [ ] Los tres pasan, y el orden es determinista con fechas repetidas
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T11 — Quitar un gasto

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R6.5, R6.6 |
| **Casos de prueba** | CP50 quitar un id inexistente → `GASTO_NO_EXISTE` · CP51 quitar 1 de 3 → quedan los otros 2, sin tocar el presupuesto |
| **Componente** | `gastos.quitarGasto` |
| **Archivos previstos** | `src/domain/gastos.ts`, `src/domain/gastos.test.ts` |
| **Decisiones que la condicionan** | D1 (borrar algo que no existe es un error del dominio, no un `no-op` silencioso) |

*Hecho cuando:*

- [ ] CP50 y CP51 fallan porque `quitarGasto` no existe
- [ ] Los dos pasan, y `quitarGasto` devuelve un array nuevo sin mutar el recibido
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T12 — Definir el contrato `Repositorio` y la implementación en memoria

**Estado:** `Pendiente`

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

- [ ] La batería del contrato falla porque `RepositorioMemoria` no existe
- [ ] Pasa contra `RepositorioMemoria`, y `Datos` declara `version: 1`
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T13 — Persistir en un archivo JSON de forma atómica y tolerante

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | NF2, NF3, NF4 |
| **Casos de prueba** | CP53 archivo inexistente → datos vacíos sin error · CP54 escribir y volver a leer → datos iguales · CP55 JSON inválido → lanza informando la ruta, y el archivo queda byte a byte igual · CP56 `version` desconocida → lanza sin sobrescribir · CP57 tras guardar, el directorio solo tiene `finanzas.json` · CP58 (segunda mitad) la batería del contrato pasa contra `RepositorioArchivo` |
| **Componente** | `RepositorioArchivo` |
| **Archivos previstos** | `src/storage/repositorio-archivo.ts`, `src/storage/repositorio-archivo.test.ts` |
| **Decisiones que la condicionan** | D8 (temporal + `rename`), y el riesgo de escrituras concurrentes de design.md §10 |

CP55 es el caso que protege los datos del usuario: la tentación al implementar es arrancar con datos vacíos cuando el archivo no se puede leer, y eso los borra en el primer guardado. Los tests corren en un directorio temporal (`mkdtemp`). Incluye la cola que serializa las escrituras (§10 del diseño): sin ella dos guardados concurrentes se pisan.

*Hecho cuando:*

- [ ] CP53–CP57 fallan porque `RepositorioArchivo` no existe
- [ ] CP53–CP57 pasan y la batería compartida de CP58 pasa contra las dos implementaciones
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T14 — Casos de uso de presupuesto: ver el mes, fijar límites, copiar

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R5.7, y la atomicidad de persistencia de R1.4, R1.8, R2.3, R3.3 |
| **Casos de prueba** | CP52 cualquier operación que falle en el dominio → el repositorio no recibe ninguna escritura · CP43 (vía `verMes`) mes sin presupuesto → `{ mes, categorias: [] }` sin error |
| **Componente** | `casos-uso.verMes`, `casos-uso.fijarLimites`, `casos-uso.copiarLimites` |
| **Archivos previstos** | `src/app/casos-uso.ts`, `src/app/casos-uso.test.ts` |
| **Decisiones que la condicionan** | D2 (design.md): esta capa existe para poder probar la orquestación sin HTTP |

CP52 se verifica con un `RepositorioMemoria` que cuente las escrituras: es la única forma de comprobar que un rechazo no dejó nada persistido, y cubre de una vez los cuatro caminos de error que llegan hasta esta capa.

*Hecho cuando:*

- [ ] CP52 y CP43-vía-`verMes` fallan porque los casos de uso no existen
- [ ] Los dos pasan, y ninguna operación escribe cuando el dominio devuelve `ok: false`
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T15 — Casos de uso de gastos: registrar con aviso, listar, borrar

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R4.6, R6.4 |
| **Casos de prueba** | CP45 registrar en `"Comida"` con `"Ocio"` también excedida → la respuesta trae el consumo **solo** de `"Comida"` · CP49 borrar un gasto y volver a pedir el consumo → el gastado de su categoría baja en el monto del gasto |
| **Componente** | `casos-uso.registrarGasto`, `casos-uso.listarGastos`, `casos-uso.borrarGasto` |
| **Archivos previstos** | `src/app/casos-uso.ts`, `src/app/casos-uso.test.ts` |
| **Decisiones que la condicionan** | D2, D9 (acá se inyecta `crypto.randomUUID`), y T14 (no escribir si el dominio rechaza) |

CP45 es el criterio que hace que el aviso de exceso sea utilizable: la respuesta del registro trae el estado de la categoría afectada, y solo de ella. CP49 cierra el ciclo de la corrección: borrar tiene que verse en el consumo, no solo en la lista.

*Hecho cuando:*

- [ ] CP45 y CP49 fallan porque los casos de uso de gastos no existen
- [ ] Los dos pasan, y el `id` se genera acá y no en el dominio
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T16 — Servidor HTTP: errores y rutas de presupuesto

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.1, R1.4, R1.8, R5.1, R5.9 |
| **Casos de prueba** | CP59 `PUT /api/presupuestos/2026-07` con 2 categorías → `200` con las guardadas · CP60 `PUT` con límite negativo → `400` con el motivo · CP61 `PUT` que quita una categoría con gastos → `409` con el nombre y el conteo · CP66 `GET /api/presupuestos/2026-07` → `200` con límite, gastado, restante, porcentaje y estado · CP67 `GET /api/presupuestos/2026-13` → `400` · CP72 `GET /api/inventado` → `404` · CP73 `POST /api/gastos` con cuerpo no-JSON → `400` sin caerse |
| **Componente** | `servidor`, `errores-http` |
| **Archivos previstos** | `src/server/servidor.ts`, `src/server/errores-http.ts`, `src/server/servidor.test.ts` |
| **Decisiones que la condicionan** | D5 (reparto 400/409), D7 (`node:http` sin Express), D1 (el mapeo de códigos es exhaustivo y el compilador lo obliga) |

CP60 y CP61 juntos son la prueba de D5: el mismo `PUT` devuelve `400` o `409` según si el problema está en lo que el usuario envió o en lo que ya tiene guardado. Los tests levantan el servidor real en puerto efímero (`listen(0)`) con `RepositorioMemoria`.

*Hecho cuando:*

- [ ] CP59, CP60, CP61, CP66, CP67, CP72 y CP73 fallan porque no hay servidor
- [ ] Los siete pasan, y `errores-http` cubre los 14 códigos de `CodigoError` de forma exhaustiva
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

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

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | NF4 |
| **Casos de prueba** | CP74 leer los archivos de `src/domain/` → ninguno importa `node:*`, `src/storage/`, `src/app/` ni `src/server/` |
| **Componente** | `src/domain/` completo |
| **Archivos previstos** | `src/domain/pureza.test.ts` |
| **Decisiones que la condicionan** | D9 (el `id` se inyecta precisamente para no importar `node:crypto`) |

Va al cerrar el dominio para que falle si alguna de T1–T11 metió una importación indebida. Es el test que convierte NF4 de intención en garantía: sin él, la primera vez que alguien necesite un `Date.now()` o un `randomUUID` dentro del dominio nadie se va a enterar.

*Hecho cuando:*

- [ ] El test falla si se agrega a propósito un `import "node:fs"` en un archivo del dominio
- [ ] Pasa con el dominio tal como quedó en T1–T11
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

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

- [ ] El selector de mes carga las categorías con su barra de consumo y el color de su estado
- [ ] Un mes sin presupuesto muestra el estado vacío y ofrece copiar el mes anterior; si el destino ya tiene límites, se muestra el mensaje del `409`
- [ ] Una categoría excedida se distingue a simple vista y muestra el monto sobrepasado
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

### T21 — UI: registrar un gasto con aviso de exceso, listar y borrar

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R3.1, R3.3, R3.5, R4.1, R6.1, R6.2, R6.4 (en pantalla) |
| **Casos de prueba** | Ninguno automatizado — D6. El aviso que muestra viene de la respuesta verificada en CP64 |
| **Componente** | `vista` (web), `main` (web) |
| **Archivos previstos** | `web/src/vista.ts`, `web/src/main.ts` |
| **Decisiones que la condicionan** | D6, y T17 (el estado de la categoría llega en la respuesta del `POST`, sin segunda petición) |

*Hecho cuando:*

- [ ] El formulario registra un gasto y la lista y las barras se actualizan
- [ ] Un gasto que excede muestra el aviso con el monto sobrepasado, tomado de la respuesta del `POST`
- [ ] Un gasto en una categoría sin presupuesto en el mes de su fecha muestra el mensaje del `400` y ofrece definir ese límite
- [ ] Borrar un gasto lo quita de la lista y baja el consumo de su categoría
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

*(la llena la implementación)*

## 5. Trazabilidad criterio → tarea

| Requisito | Tarea |
|---|---|
| R1.1 | T5, T16 |
| R1.2 | T5 |
| R1.3 | T2 |
| R1.4 | T2, T6, T14, T16 |
| R1.5 | T2 |
| R1.6 | T2 |
| R1.7 | T2 |
| R1.8 | T6, T14, T16 |
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
| R3.3 | T9, T14, T17, T21 |
| R3.4 | T2, T8 |
| R3.5 | T9, T21 |
| R3.6 | T9 |
| R3.7 | T1 |
| R3.8 | T8 |
| R3.9 | T8 |
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
| R6.1 | T10, T17, T21 |
| R6.2 | T10, T17, T21 |
| R6.3 | T10 |
| R6.4 | T15, T17, T21 |
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

## 7. Desvíos del diseño

*Vacío hasta que la implementación encuentre el primero.*

| # | Tarea | Qué difiere de design.md | Resolución |
|---|---|---|---|

## 8. Tareas descubiertas durante la implementación

*Vacío: las 21 tareas del plan salen de las tablas §7 y §8 de `design.md`. Lo que aparezca de más se agrega acá con su número, y si para escribirlo hace falta un criterio de aceptación nuevo, vuelve a `requirements.md` con su gate.*

| # | Tarea | Por qué apareció | ¿Cambia el alcance? |
|---|---|---|---|
