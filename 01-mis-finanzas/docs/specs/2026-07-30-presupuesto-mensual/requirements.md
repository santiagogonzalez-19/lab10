# Requisitos — Presupuesto mensual por categoría

| | |
|---|---|
| **Spec** | `docs/specs/2026-07-30-presupuesto-mensual/` |
| **Estado** | Aprobado |
| **Última actualización** | 2026-07-31 |
| **Diseño** | [design.md](./design.md) |

## 1. Contexto y problema

Quien lleva sus finanzas a mano sabe cuánto ganó y cuánto tiene en la cuenta, pero no sabe lo único que le permitiría corregir el rumbo dentro del mes: cuánto de lo que se propuso gastar en cada rubro ya se gastó. La cuenta bancaria responde "cuánto queda en total", que es una pregunta distinta y llega tarde — cuando el dinero de la comida se fue en salidas, el saldo sigue viéndose sano y el problema aparece el día 28.

El dolor concreto es **no saber si me estoy pasando**. Un límite mensual por rubro solo sirve si en cualquier momento se puede contestar cuánto se lleva gastado contra ese límite, cuánto queda, y si ya se cruzó. Hoy eso se hace de memoria o en una hoja de cálculo que hay que sumar a mano, y por eso se abandona.

Este spec define la primera versión: el usuario va a poder fijar un límite por categoría para un mes concreto, registrar sus gastos uno a uno, y ver en todo momento el consumo de cada categoría con un aviso cuando un gasto la pase del límite. La categorización existe para alimentar ese límite; no es un fin en sí misma. Nada de lo descrito aquí existe todavía en el repositorio: al momento de escribir este documento el proyecto no tiene código de aplicación.

## 2. Alcance

**Incluido**

- Fijar y ajustar los límites de gasto por categoría para un mes concreto.
- Arrancar un mes copiando los límites de otro mes.
- Registrar un gasto manualmente (monto, fecha, categoría, descripción).
- Ser avisado, al registrar, cuando el gasto hace que su categoría pase del límite.
- Consultar el consumo del mes por categoría: límite, gastado, restante, porcentaje y estado.
- Consultar los gastos de un mes y borrar uno para corregir un error de captura.

**Fuera de alcance**

- **Ingresos y balance general** — este spec responde "cuánto llevo gastado contra mi límite", no "cuánto me queda de plata". Es una feature distinta con su propio modelo.
- **Importar extractos (CSV) y categorización automática** — la entrada es manual por decisión explícita: mete parsing, formatos por banco y deduplicación antes de validar el núcleo.
- **Múltiples cuentas y múltiples monedas** — un solo flujo de gasto en COP.
- **Autenticación y multiusuario** — un único usuario local, sin sesiones ni permisos.
- **Subcategorías** — obligarían a definir cómo se agrega el consumo hacia arriba y dónde vive el límite.
- **Arrastre de saldo entre meses (rollover)** — acopla los meses: recalcular uno cambiaría todos los posteriores.
- **Gráficas y comparativos históricos** — el valor de esta versión está en el mes en curso.
- **Editar un gasto ya registrado** — se corrige borrándolo y volviéndolo a crear (ver Q2).

## 3. Actores

| Actor | Descripción | Qué puede hacer en esta feature |
|---|---|---|
| Usuario | La única persona que usa la aplicación, dueña de sus propias finanzas. No hay roles ni permisos. | Fijar y ajustar límites de un mes, copiar los límites de otro mes, registrar gastos, consultar el consumo y los gastos de un mes, borrar un gasto. |

## 4. Glosario

| Término | Definición |
|---|---|
| **Mes** | Mes calendario identificado como `YYYY-MM` (ej. `2026-07`). Es la unidad de presupuesto: no hay períodos de otra duración. |
| **Categoría** | Rubro de gasto con nombre y límite, definido por el usuario dentro de un mes. Una categoría existe **porque** tiene un límite en ese mes; no hay lista maestra de categorías ni categorías sin presupuesto. |
| **Nombre normalizado** | El nombre de una categoría sin espacios al inicio ni al final y comparado sin distinguir mayúsculas de minúsculas. **Se usa únicamente para comparar** (detectar duplicados y resolver a qué categoría pertenece un gasto); el nombre se almacena y se muestra tal como lo escribió el usuario. Esta es la única definición de la normalización en el spec; el resto del documento la referencia. |
| **Límite** | Monto máximo que el usuario se propone gastar en una categoría durante un mes. Entero, en pesos colombianos sin decimales. Cero es un valor válido. |
| **Presupuesto de un mes** | El conjunto de categorías con límite definidas para ese mes. Un mes sin categorías es un mes sin presupuesto, y es un estado válido. |
| **Gasto** | Un desembolso registrado por el usuario, con monto, fecha, categoría y descripción. Pertenece al mes de su fecha. |
| **Gastado** | Suma de los montos de los gastos de una categoría en un mes. |
| **Restante** | Límite menos gastado. Puede ser negativo, y eso significa exceso. |
| **Estado de una categoría** | Clasificación del consumo: `ok`, `alerta` o `excedido`. Los umbrales se fijan en R4. |
| **Umbral de alerta** | Porcentaje de consumo a partir del cual una categoría pasa de `ok` a `alerta`: 80 %. |

## 5. Requisitos funcionales

### R1 — Fijar y ajustar los límites de un mes

**Historia:** Como usuario quiero definir cuánto me propongo gastar en cada categoría durante un mes para tener contra qué comparar mis gastos.

**Criterios de aceptación**

1. **R1.1** — WHEN el usuario fija los límites de un mes que no tiene presupuesto THE SYSTEM SHALL guardar las categorías con sus límites para ese mes y devolverlas.
2. **R1.2** — WHEN el usuario fija los límites de un mes que ya tiene presupuesto THE SYSTEM SHALL reemplazar el conjunto de categorías de ese mes por el recibido, sin afectar ningún otro mes.
3. **R1.3** — WHEN el usuario fija un límite de cero para una categoría THE SYSTEM SHALL aceptarlo como límite válido.
4. **R1.4** — IF algún límite recibido es negativo THEN THE SYSTEM SHALL rechazar la operación completa e informar que los límites no pueden ser negativos.
5. **R1.5** — IF algún límite recibido no es un número entero THEN THE SYSTEM SHALL rechazar la operación completa e informar que los límites deben ser enteros sin decimales.
6. **R1.6** — IF algún nombre de categoría recibido queda vacío tras normalizarlo THEN THE SYSTEM SHALL rechazar la operación completa e informar que el nombre de la categoría es obligatorio.
7. **R1.7** — IF dos categorías recibidas tienen el mismo nombre normalizado THEN THE SYSTEM SHALL rechazar la operación completa e informar cuál es el nombre duplicado.
8. **R1.8** — IF la operación quita del mes una categoría que tiene al menos un gasto registrado en ese mes THEN THE SYSTEM SHALL rechazar la operación completa e informar el nombre de la categoría y cuántos gastos la usan.
9. **R1.9** — WHEN la operación quita del mes una categoría que no tiene ningún gasto registrado en ese mes THE SYSTEM SHALL eliminarla del presupuesto de ese mes.
10. **R1.10** — IF el mes indicado no tiene la forma `YYYY-MM` con un mes entre 01 y 12 THEN THE SYSTEM SHALL rechazar la operación e informar el formato esperado.
11. **R1.11** — WHEN el usuario fija los límites de un mes con una lista vacía de categorías y ese mes no tiene ningún gasto registrado THE SYSTEM SHALL dejar el mes sin presupuesto.

### R2 — Arrancar un mes copiando los límites de otro

**Historia:** Como usuario quiero copiar los límites del mes anterior para no volver a escribir el mismo presupuesto cada mes.

**Criterios de aceptación**

1. **R2.1** — WHEN el usuario copia los límites de un mes origen hacia un mes destino sin presupuesto THE SYSTEM SHALL crear en el destino las mismas categorías con los mismos límites del origen.
2. **R2.2** — WHEN el usuario copia los límites de un mes origen hacia un mes destino THE SYSTEM SHALL copiar únicamente las categorías y sus límites, sin copiar ningún gasto.
3. **R2.3** — IF el mes destino ya tiene al menos una categoría definida THEN THE SYSTEM SHALL rechazar la copia e informar que el mes destino ya tiene límites definidos.
4. **R2.4** — IF el mes origen no tiene ninguna categoría definida THEN THE SYSTEM SHALL rechazar la copia e informar que el mes origen no tiene presupuesto que copiar.
5. **R2.5** — IF el mes origen y el mes destino son el mismo THEN THE SYSTEM SHALL rechazar la copia e informar que deben ser meses distintos.
6. **R2.6** — WHEN la copia se completa THE SYSTEM SHALL dejar el presupuesto del mes origen sin cambios.

### R3 — Registrar un gasto

**Historia:** Como usuario quiero anotar cada gasto con su monto, fecha y categoría para que mi consumo refleje lo que realmente gasté.

**Criterios de aceptación**

1. **R3.1** — WHEN el usuario registra un gasto con monto, fecha, categoría y descripción válidos THE SYSTEM SHALL guardarlo con un identificador propio y devolverlo.
2. **R3.2** — WHEN el usuario registra un gasto THE SYSTEM SHALL asignarlo al mes de su fecha, independientemente del mes que el usuario esté consultando.
3. **R3.3** — IF la categoría del gasto no tiene límite definido en el mes de la fecha del gasto THEN THE SYSTEM SHALL rechazar el registro e informar que esa categoría no tiene presupuesto en ese mes.
4. **R3.4** — WHEN el usuario registra un gasto cuya categoría coincide con una categoría del mes por nombre normalizado THE SYSTEM SHALL imputarlo a esa categoría.
5. **R3.5** — IF el monto del gasto es cero o negativo THEN THE SYSTEM SHALL rechazar el registro e informar que el monto debe ser mayor que cero.
6. **R3.6** — IF el monto del gasto no es un número entero THEN THE SYSTEM SHALL rechazar el registro e informar que el monto debe ser un entero sin decimales.
7. **R3.7** — IF la fecha del gasto no tiene la forma `YYYY-MM-DD` o no corresponde a una fecha existente del calendario THEN THE SYSTEM SHALL rechazar el registro e informar el formato esperado.
8. **R3.8** — WHEN el usuario registra un gasto sin descripción THE SYSTEM SHALL guardarlo con descripción vacía.
9. **R3.9** — WHEN el usuario registra dos gastos idénticos en monto, fecha, categoría y descripción THE SYSTEM SHALL guardar ambos como gastos distintos.

### R4 — Avisar cuando un gasto pasa del límite

**Historia:** Como usuario quiero enterarme en el momento de registrar un gasto de que me pasé del límite de esa categoría, para poder frenar el consumo dentro del mes.

**Criterios de aceptación**

1. **R4.1** — WHEN se registra un gasto que hace que el gastado de su categoría supere el límite del mes THE SYSTEM SHALL guardar el gasto e informar que la categoría quedó excedida y en cuánto la excede.
2. **R4.2** — WHEN se registra un gasto que deja el gastado de su categoría exactamente igual al límite THE SYSTEM SHALL guardar el gasto e informar el estado `alerta`, sin informar exceso.
3. **R4.3** — WHEN se registra un gasto que deja el gastado de su categoría en el 80 % o más del límite, sin superarlo, THE SYSTEM SHALL guardar el gasto e informar el estado `alerta`.
4. **R4.4** — WHEN se registra un gasto que deja el gastado de su categoría por debajo del 80 % del límite THE SYSTEM SHALL guardar el gasto e informar el estado `ok`.
5. **R4.5** — WHEN se registra un gasto en una categoría cuyo límite es cero THE SYSTEM SHALL guardar el gasto e informar que la categoría quedó excedida en el monto completo del gastado.
6. **R4.6** — WHEN se registra un gasto THE SYSTEM SHALL informar el estado únicamente de la categoría del gasto, sin alterar el estado de las demás categorías del mes.

### R5 — Consultar el consumo de un mes

**Historia:** Como usuario quiero ver en un solo lugar cuánto llevo gastado y cuánto me queda en cada categoría del mes, para saber si me estoy pasando.

**Criterios de aceptación**

1. **R5.1** — WHEN el usuario consulta un mes THE SYSTEM SHALL devolver, para cada categoría del mes, su nombre, su límite, el gastado, el restante, el porcentaje de consumo y el estado.
2. **R5.2** — WHEN el usuario consulta un mes THE SYSTEM SHALL calcular el gastado de cada categoría sumando únicamente los gastos de ese mes.
3. **R5.3** — WHEN una categoría del mes no tiene ningún gasto THE SYSTEM SHALL devolverla con gastado cero, restante igual a su límite, porcentaje cero y estado `ok`.
4. **R5.4** — WHEN el gastado de una categoría supera su límite THE SYSTEM SHALL devolver el restante como un número negativo igual a la diferencia.
5. **R5.5** — WHERE el límite de una categoría es cero y su gastado es mayor que cero THE SYSTEM SHALL devolver el porcentaje de consumo como 100 y el estado `excedido`.
6. **R5.6** — WHERE el límite de una categoría es cero y su gastado es cero THE SYSTEM SHALL devolver el porcentaje de consumo como 0 y el estado `ok`.
7. **R5.7** — WHEN el usuario consulta un mes sin presupuesto THE SYSTEM SHALL devolver una lista vacía de categorías, sin señalar un error.
8. **R5.8** — WHEN el usuario consulta un mes THE SYSTEM SHALL devolver las categorías en el mismo orden en que fueron definidas para ese mes.
9. **R5.9** — IF el mes consultado no tiene la forma `YYYY-MM` con un mes entre 01 y 12 THEN THE SYSTEM SHALL rechazar la consulta e informar el formato esperado.

### R6 — Ver y corregir los gastos de un mes

**Historia:** Como usuario quiero revisar los gastos que registré en el mes y borrar uno que anoté mal, para que mi consumo no quede desviado por un error de captura.

**Criterios de aceptación**

1. **R6.1** — WHEN el usuario consulta los gastos de un mes THE SYSTEM SHALL devolver todos los gastos de ese mes con su identificador, monto, fecha, categoría y descripción.
2. **R6.2** — WHEN el usuario consulta los gastos de un mes THE SYSTEM SHALL devolverlos ordenados por fecha, del más reciente al más antiguo.
3. **R6.3** — WHEN el usuario consulta los gastos de un mes sin gastos THE SYSTEM SHALL devolver una lista vacía, sin señalar un error.
4. **R6.4** — WHEN el usuario borra un gasto existente THE SYSTEM SHALL eliminarlo y dejar de contarlo en el gastado de su categoría.
5. **R6.5** — IF el identificador del gasto a borrar no corresponde a ningún gasto THEN THE SYSTEM SHALL rechazar la operación e informar que el gasto no existe.
6. **R6.6** — WHEN el usuario borra un gasto THE SYSTEM SHALL conservar los demás gastos y el presupuesto del mes sin cambios.

## 6. Requisitos no funcionales

| # | Categoría | Requisito |
|---|---|---|
| NF1 | Precisión | Ningún monto pierde precisión: los límites, los montos y las sumas se manejan como enteros y ninguna operación introduce decimales. El porcentaje de consumo es el único valor derivado que puede no ser entero, y no se usa para calcular dinero. |
| NF2 | Durabilidad | Una interrupción durante el guardado no deja los datos en un estado inutilizable: o queda la versión anterior completa, o la nueva completa, nunca una mezcla. |
| NF3 | Integridad | Si los datos almacenados no se pueden interpretar, el sistema informa la falla y no los sobrescribe. Perder los datos por intentar arrancar sobre ellos es peor que no arrancar. |
| NF4 | Cero dependencias en el núcleo | Las reglas de presupuesto, consumo y estado se pueden ejecutar y probar sin servidor, sin navegador y sin acceso a disco. |

## 7. Reglas de negocio e invariantes

- **BR1** — Un límite es un entero mayor o igual a cero.
- **BR2** — Existe a lo sumo una categoría por cada par (mes, nombre normalizado).
- **BR3** — Todo gasto pertenece a exactamente un mes, y ese mes es el de su fecha.
- **BR4** — Todo gasto almacenado referencia una categoría que tiene límite definido en el mes del gasto. No existen gastos huérfanos.
- **BR5** — El monto de un gasto es un entero mayor que cero.
- **BR6** — El gastado de una categoría en un mes es exactamente la suma de los montos de los gastos de ese mes imputados a esa categoría.
- **BR7** — Los meses son independientes entre sí: ninguna operación sobre un mes cambia los límites, los gastos o el consumo de otro mes.

## 8. Supuestos

- **S1** — La comparación de nombres de categoría se hace por **nombre normalizado** (ver glosario): `Comida` y ` comida ` son la misma categoría. Se conserva el nombre tal como se escribió por primera vez.
- **S2** — Las fechas se manejan como `YYYY-MM-DD`, sin hora ni zona horaria, y el mes de un gasto son los primeros siete caracteres de su fecha. Esto evita que un gasto cambie de mes según el huso horario de quien lo mira.
- **S3** — Los montos están en pesos colombianos y se expresan como enteros sin decimales, tal como se usan en la práctica.
- **S4** — No hay restricción sobre la fecha de un gasto: se puede registrar con fecha pasada o futura. Lo único que decide si se acepta es que su categoría tenga límite en el mes de esa fecha (R3.3).
- **S5** — El umbral de alerta es 80 %, fijo en esta versión. Salió de la conversación de diseño, no de una restricción del dominio; se implementa como parámetro para poder cambiarlo sin tocar la lógica (ver Q3).
- **S6** — El sistema lo usa una sola persona en su propio equipo, sin accesos concurrentes. No se especifica comportamiento ante dos operaciones simultáneas.
- **S7** — La descripción de un gasto es opcional; su ausencia se representa como cadena vacía (R3.8).

## 9. Preguntas abiertas

| # | Pregunta | Bloquea el diseño | Estado |
|---|---|---|---|
| Q1 | ¿Cuántos gastos por mes esperas registrar, en orden de magnitud (decenas, cientos)? No se fija ningún umbral de rendimiento sin ese dato; se prefiere no inventarlo. | No | Abierta |
| Q2 | ¿Alcanza con borrar y volver a crear un gasto mal anotado, o hace falta editarlo? Por ahora queda fuera de alcance. | No | Abierta |
| Q3 | ¿El umbral de alerta (80 %) debería poder configurarlo el usuario, o alcanza fijo? | No | Abierta |
| Q4 | ¿Hace falta poder renombrar una categoría conservando sus gastos? Hoy renombrar equivale a quitar una y crear otra, y R1.8 lo impide si tiene gastos. | No | Abierta |

<!--
Sección "Comportamiento que no debe cambiar" (regresión): omitida deliberadamente.
El repositorio no tiene código de aplicación todavía, así que no hay comportamiento
existente que proteger. Escribir un REG aquí encargaría un test de regresión sobre
algo que nadie construyó.
-->
