<!--
PLANTILLA: design.md  (Requirements-First — se escribe DESPUÉS de aprobar requirements.md)

Cómo usarla:
- Copia la estructura, borra estos comentarios y los ejemplos.
- Cada sección responde "cómo se cumplen los requisitos aprobados". Si escribes
  algo aquí que no rastrea a ningún R#, o es alcance que se metió de más, o es un
  requisito que faltó declarar — resuélvelo, no lo dejes flotando.
- La sección 8 (trazabilidad) es la prueba de completitud. Llénala al final y
  úsala como checklist: fila vacía = requisito sin cubrir.
-->

# Diseño — <Nombre de la feature>

| | |
|---|---|
| **Requisitos** | [requirements.md](./requirements.md) |
| **Estado** | Borrador \| Aprobado |
| **Última actualización** | <YYYY-MM-DD> |

## 1. Resumen de la solución

<!--
Un párrafo que alguien pueda leer en 30 segundos y entender la forma de la
solución: qué piezas nuevas aparecen y cómo se conectan con lo que existe.
-->

## 2. Arquitectura

<!--
Los componentes y su responsabilidad. Un componente por fila, con una sola
responsabilidad expresable en una oración — si necesitas "y" para describirla,
probablemente son dos componentes.
Incluye un diagrama solo si aclara algo que la tabla no; para 3 piezas la tabla
basta.
-->

| Componente | Responsabilidad | Nuevo / Existente | Ubicación |
|---|---|---|---|
| <BudgetService> | <Aplica las reglas de presupuesto> | Nuevo | `src/budgets/service.ts` |

## 3. Flujo de datos

<!--
El camino de la información para los escenarios principales, paso a paso.
Un flujo por caso relevante, incluyendo al menos un camino de error.
-->

**Flujo: <nombre del escenario>** *(cubre R1.1, R1.2)*

1. <El usuario …>
2. <El componente X valida …>
3. <…>

## 4. Interfaces

<!--
Las firmas públicas: qué puede llamar el resto del sistema. Escríbelas en el
lenguaje real del proyecto. Esto es el contrato que van a consumir los tests,
así que los tipos importan más que la implementación.
-->

```ts
// src/budgets/service.ts
export function crearPresupuesto(input: NuevoPresupuesto): Resultado<Presupuesto, ErrorPresupuesto>;
```

## 5. Modelos de datos

<!--
Tipos y su persistencia. Sé explícito con las representaciones que suelen
causar bugs silenciosos:
  - dinero: unidades mínimas enteras (centavos) vs decimal — y la moneda
  - fechas y períodos: formato exacto y zona horaria
  - identidad: qué combinación de campos hace único un registro
Si la feature toca dinero y aquí no dice cómo se representa, el diseño no está
terminado.
-->

```ts
type Presupuesto = {
  categoriaId: string;
  periodo: string;        // "YYYY-MM"
  montoCentavos: number;  // entero, en centavos, moneda del usuario
};
```

**Restricciones e índices**

- <Único por (categoriaId, periodo)> — implementa **BR2**

## 6. Manejo de errores

<!--
Cada modo de falla, cómo se representa y qué ve el usuario. Los criterios
IF/THEN de los requisitos deben aparecer todos aquí.
-->

| Caso | Representación | Qué ve el usuario | Requisito |
|---|---|---|---|
| <Presupuesto duplicado> | `ErrorPresupuesto.Duplicado` | <mensaje> | R1.2 |

## 7. Estrategia de pruebas unitarias

<!--
Los casos concretos que se van a escribir, no la política. En TDD, esta lista
es literalmente la primera prueba roja: nombra el caso y el resultado esperado.
"Cubrir casos borde" no sirve; "presupuesto duplicado en el mismo mes → rechaza"
sí.
Incluye los casos degenerados (cero, vacío, límite exacto) — son los que los
requisitos R#.2 y R#.3 suelen fijar y los que más se olvidan al implementar.
-->

| Caso de prueba | Resultado esperado | Requisito |
|---|---|---|
| <Crear presupuesto en categoría y mes libres> | <Se crea y se devuelve> | R1.1 |
| <Crear presupuesto duplicado> | <Rechaza con error Duplicado> | R1.2 |
| <Gasto que iguala exactamente el presupuesto> | <No informa exceso> | R2.2 |

**Fuera del alcance de pruebas unitarias:** <lo que requiere test de integración y por qué>

## 8. Trazabilidad

<!--
Prueba de completitud del diseño. Una fila por cada criterio de aceptación de
requirements.md — R1.1, R1.2, R2.1, … y también las reglas BR# y los REG#.
Una fila sin componente o sin test es un requisito que este diseño no cubre:
vuelve a la sección correspondiente y resuélvelo antes del gate.
-->

| Requisito | Componente(s) | Caso de prueba |
|---|---|---|
| R1.1 | <BudgetService.crearPresupuesto> | <Crear presupuesto en categoría y mes libres> |
| R1.2 | <…> | <…> |
| BR2 | <Índice único (categoriaId, periodo)> | <Crear presupuesto duplicado> |

## 9. Decisiones y alternativas descartadas

<!--
Para cada decisión no obvia: qué se eligió, contra qué, y el criterio que
desempató. Esto es lo que evita que alguien (o tú en tres meses) rehaga el
mismo análisis, y es lo que el usuario necesita para poder vetar una decisión
en el gate.
Si la decisión implica una dependencia nueva, justifícala aquí explícitamente.
-->

### D1 — <Decisión>

- **Elegido:** <opción>
- **Alternativas:** <opción B> — <por qué se descartó>
- **Criterio:** <qué desempató>

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| <…> | Alto / Medio / Bajo | <…> |

## 11. Preguntas abiertas heredadas

<!--
Las Q# de requirements.md que no bloqueaban el diseño pero siguen sin
resolverse, y qué parte del diseño cambiaría según la respuesta.
-->

| # | Pregunta | Qué cambia según la respuesta |
|---|---|---|
| Q2 | <…> | <…> |
