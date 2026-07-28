<!--
PLANTILLA: requirements.md  (Requirements-First)

Cómo usarla:
- Copia la estructura, borra estos comentarios y los ejemplos entre <!-- ... -->.
- Borra las secciones que realmente no apliquen, pero no por pereza: si borras
  "Reglas de negocio" en una feature con dinero, casi seguro estás dejando un
  hueco que va a aparecer en la implementación.
- Los ejemplos están tomados de una app de finanzas personales para que se vea
  el nivel de detalle esperado; reemplázalos por completo.
-->

# Requisitos — <Nombre de la feature>

| | |
|---|---|
| **Spec** | `docs/specs/<YYYY-MM-DD>-<slug>/` |
| **Estado** | Borrador \| Aprobado |
| **Última actualización** | <YYYY-MM-DD> |
| **Diseño** | [design.md](./design.md) *(pendiente hasta aprobar estos requisitos)* |

## 1. Contexto y problema

<!--
Dos o tres párrafos: qué le pasa hoy al usuario, por qué duele, y qué cambia
si esto existe. Sin solución todavía — si aquí ya aparece una tabla o un
endpoint, se corrió la fase.

CUIDADO con el tiempo verbal aquí: es la sección donde más se cuela describir
en presente funcionalidad que no existe ("hoy la app categoriza gastos"). Eso
afirma que el código está escrito, y quien implemente lo leerá como "esto ya
está, lo integro". Habla del problema del usuario, no de capacidades del
sistema; y si nombras una capacidad que aún no existe, ponla en futuro.
-->

## 2. Alcance

**Incluido**

- <capacidad concreta 1>
- <capacidad concreta 2>

**Fuera de alcance**

- <lo que alguien podría asumir que entra y no entra> — <por qué queda fuera / a qué spec futuro pertenece>

<!--
La lista de "fuera de alcance" es la más valiosa de este documento y la que
más se olvida. Es la que evita que la feature crezca a mitad de camino.
-->

## 3. Actores

| Actor | Descripción | Qué puede hacer en esta feature |
|---|---|---|
| <Usuario> | <quién es> | <acciones> |

## 4. Glosario

<!--
Define los términos del dominio que el equipo va a usar en código y en
conversación. Un término definido aquí es un nombre de tipo o de función
después; ambigüedad aquí es ambigüedad en el modelo de datos.
-->

| Término | Definición |
|---|---|
| <Presupuesto> | <Monto máximo asignado a una categoría para un período> |
| <Período> | <Mes calendario identificado como YYYY-MM> |

## 5. Requisitos funcionales

<!--
Un bloque por requisito. Numeración estable: R1, R2, … y criterios R1.1, R1.2.
El diseño y los tests citan estos números — no renumeres después.
Cada criterio es un test que todavía no existe.

Un requisito por capacidad PEDIDA. Lo que se te ocurra y no esté pedido va a
"Fuera de alcance" (sección 2) o a "Preguntas abiertas" (sección 10), nunca
aquí: un requisito es un compromiso que alguien va a implementar y testear.
La excepción son los casos degenerados y los bordes exactos, que sí van como
criterios aunque nadie los mencione — son la definición precisa de lo pedido.
-->

### R1 — <Título en una línea>

**Historia:** Como <actor> quiero <capacidad> para <beneficio>.

**Criterios de aceptación**

1. **R1.1** — WHEN <condición o evento> THE SYSTEM SHALL <comportamiento observable>
2. **R1.2** — IF <condición de error> THEN THE SYSTEM SHALL <respuesta al error>
3. **R1.3** — WHERE <feature opcional está habilitada> THE SYSTEM SHALL <comportamiento>

<!--
Ejemplo completo, para calibrar:

### R2 — Alerta de sobregiro de categoría

**Historia:** Como usuario quiero enterarme cuando un gasto me pasa del
presupuesto de su categoría para poder frenar el consumo dentro del mes.

**Criterios de aceptación**

1. **R2.1** — WHEN se registra un gasto que hace que el total gastado de la
   categoría supere su presupuesto del período THE SYSTEM SHALL registrar el
   gasto e informar el monto excedido.
2. **R2.2** — WHEN se registra un gasto que deja el total exactamente igual al
   presupuesto THE SYSTEM SHALL registrar el gasto sin informar exceso.
3. **R2.3** — IF la categoría no tiene presupuesto definido para el período
   THEN THE SYSTEM SHALL registrar el gasto sin evaluar sobregiro.

Nota cómo R2.2 fija el límite (>= vs >) y R2.3 cubre el caso degenerado.
Esos dos son los que se olvidan y los que rompen en producción.
-->

### R2 — <…>

## 6. Requisitos no funcionales

<!--
Un requisito no funcional necesita un número para ser verificable, PERO ese
número tiene que venir del usuario o de una restricción real del dominio.
Inventarlo es inventar alcance, y es de la peor clase: se propaga a un caso de
prueba obligatorio, a una fila de trazabilidad y a decisiones de arquitectura
tomadas para sostener una cifra que nadie pidió.

  ✗ "Importa 10.000 filas en menos de 2 segundos"  ← si nadie dijo 10.000 ni 2s
  ✓ Q: "¿De qué tamaño son tus extractos?"          ← va a preguntas abiertas
  ✓ "Los montos no pierden precisión decimal"       ← restricción del dominio

Si no puedes ponerle un número que no hayas inventado, va a preguntas abiertas
(sección 10) o a supuestos (sección 9), no aquí.
-->

| # | Categoría | Requisito |
|---|---|---|
| NF1 | Precisión | <Los montos no pierden precisión decimal en ninguna operación> |
| NF2 | Rendimiento | <…> |

## 7. Reglas de negocio e invariantes

<!--
Verdades que deben cumplirse siempre, independientemente del flujo que se
ejecute. Se convierten en validaciones de dominio y en tests de propiedades.
-->

- **BR1** — <Un presupuesto nunca es negativo.>
- **BR2** — <Existe a lo sumo un presupuesto por (categoría, período).>

## 8. Comportamiento que no debe cambiar

<!--
BORRA ESTA SECCIÓN COMPLETA si no leíste el código que implementa el
comportamiento que vas a proteger. En un repo sin código todavía, no hay nada
que proteger: un REG sobre comportamiento inexistente encarga un test de algo
que nadie construyó y hace que el documento describa un sistema imaginario.

Si sí existe: sé literal, porque esto se traduce en tests de regresión.
-->

- **REG1** — WHEN <condición existente> THEN THE SYSTEM SHALL CONTINUE TO <comportamiento actual>

## 9. Supuestos

<!--
Decisiones que tomaste sin confirmación del usuario. Escribirlas es lo que
permite que alguien las refute; un supuesto tácito se descubre tarde.
-->

- **S1** — <Se asume que los períodos son meses calendario en la zona horaria local del usuario.>

## 10. Preguntas abiertas

| # | Pregunta | Bloquea el diseño | Estado |
|---|---|---|---|
| Q1 | <…> | Sí / No | Abierta |

<!--
Una pregunta que bloquea el diseño debe resolverse antes del Gate 1.
Las que no bloquean pueden viajar al diseño marcadas como riesgo.
-->
