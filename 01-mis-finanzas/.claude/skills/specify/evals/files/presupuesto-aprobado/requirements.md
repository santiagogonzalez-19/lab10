# Requisitos — Presupuesto mensual por categoría

| | |
|---|---|
| **Estado** | Aprobado |
| **Última actualización** | 2026-07-28 |

## 1. Contexto y problema

La app va a permitir registrar gastos categorizados. Todavía no existe forma de
fijar cuánto se pretende gastar en cada categoría, así que no hay contra qué
comparar el gasto acumulado y el usuario descubre los excesos leyendo la lista
de movimientos.

El repositorio no tiene todavía código de dominio: esta feature es la primera.

## 2. Alcance

**Incluido**

- Fijar un presupuesto mensual para una categoría.
- Avisar del sobregiro en el momento de registrar un gasto.

**Fuera de alcance**

- Editar o eliminar un presupuesto ya fijado — no se pidió; entra cuando exista
  la necesidad de corregir un monto mal cargado.
- Copiar los presupuestos de un mes al siguiente — es una feature propia.
- Presupuestos que no sean mensuales (semanales, anuales) — el período mensual
  está en el nombre de la feature.
- Consultar el estado de un presupuesto sin registrar un gasto — pertenece al
  spec de reportes.
- Un presupuesto global además del de cada categoría — cambia el modelo.

## 3. Actores

Un único actor: la persona dueña de las finanzas, operando localmente.

## 4. Glosario

| Término | Definición |
|---|---|
| **Período** | Un mes calendario, representado como `"YYYY-MM"`. |
| **Categoría** | Etiqueta de gasto, identificada por su nombre normalizado. |
| **Acumulado** | Suma de los gastos de una categoría dentro de un período. |
| **Sobregiro** | La condición de que el acumulado sea mayor que el presupuesto. |

## 5. Requisitos funcionales

### R1 — Fijar un presupuesto mensual por categoría

- **R1.1** — WHEN el usuario fija un presupuesto para una categoría y un período
  que todavía no tienen presupuesto THE SYSTEM SHALL registrarlo y devolver el
  presupuesto con su monto.
- **R1.2** — WHEN el usuario fija un presupuesto para una categoría y un período
  que ya tienen presupuesto THE SYSTEM SHALL rechazar la operación e informar que
  ya existe un presupuesto para ese período.
- **R1.3** — IF el monto recibido es menor o igual a cero THEN THE SYSTEM SHALL
  rechazar la operación e informar que el monto debe ser positivo.

### R2 — Avisar del sobregiro al registrar un gasto

- **R2.1** — WHEN se registra un gasto que hace que el acumulado de su categoría
  en el período supere el presupuesto de esa categoría THE SYSTEM SHALL registrar
  el gasto y devolver un aviso con el monto excedido.
- **R2.2** — WHEN se registra un gasto que hace que el acumulado iguale
  exactamente el presupuesto THE SYSTEM SHALL registrar el gasto sin devolver
  aviso de sobregiro.
- **R2.3** — WHEN se registra un gasto en una categoría que no tiene presupuesto
  definido para ese período THE SYSTEM SHALL registrar el gasto sin evaluar
  sobregiro.

## 6. Requisitos no funcionales

Ninguno con umbral. El usuario no dio cifras de volumen ni de latencia, y el
dominio no impone ninguna: fijar un umbral acá sería inventarlo.

## 7. Reglas de negocio e invariantes

- **BR1** — Todo monto se representa como un entero de centavos. Nunca se opera
  con punto flotante sobre dinero.
- **BR2** — Un par (categoría, período) tiene como máximo un presupuesto.
- **BR3** — El período de un gasto se deriva de su fecha, no se recibe aparte.

## 8. Comportamiento que no debe cambiar

No aplica: el repositorio no tiene código de dominio, así que no hay
comportamiento existente que proteger. Esta sección se llena cuando exista.

## 9. Supuestos

- **S1** — Moneda única. El modelo no lleva campo de moneda; si aparece una
  segunda, es un cambio de alcance.
- **S2** — Las categorías ya existen como texto libre normalizado; esta feature
  no las administra.

## 10. Preguntas abiertas

Ninguna bloqueante. Quedó anotado para más adelante si el aviso de sobregiro
debe repetirse en cada gasto posterior o solo la primera vez que se cruza el
límite; hoy R2.1 aplica a cada gasto que deje el acumulado por encima.
