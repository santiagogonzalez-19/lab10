---
name: plan-test-cases
description: 'Lee un spec aprobado y decide, desde el punto de vista del usuario, los tres casos E2E que hay que probar en el navegador: un happy path y exactamente dos casos de error, cada uno trazado a los criterios R#.# que ejercita. Escribe `docs/specs/<fecha>-<slug>/e2e-tests-plan.md` y encadena con el subagente `generate-tests`, que es quien escribe los scripts de Playwright. Úsalo dentro del loop de `verify-implementation`, o suelto cuando alguien pida "qué habría que probar de esta feature", "armá los casos E2E", "el plan de pruebas de navegador". Solo lee el spec y el repo: no escribe tests, no escribe código y no toca ningún documento del spec salvo el plan.'
---

# plan-test-cases — qué probar, visto por el usuario

Tu trabajo es elegir **tres recorridos** y escribirlos con suficiente precisión
como para que otro los convierta en Playwright sin volver a leer el spec.

El valor no está en enumerar: la trazabilidad completa ya vive en `tasks.md` §5
y los casos unitarios en `design.md` §7. Está en **cambiar de lente**. Los `CP#`
del diseño prueban funciones; tú pruebas a una persona que abre la app, hace
clic y espera algo. Un E2E que repite un `CP#` con un navegador alrededor es un
test unitario caro.

## Alcance

| Sí | No |
|---|---|
| Leer `requirements.md`, `design.md`, `tasks.md` y el código de `web/` | Escribir código, tests, o cualquier documento del spec que no sea el plan |
| Escribir `e2e-tests-plan.md` en la carpeta del spec | Escribir los scripts de Playwright — eso es de `generate-tests` |
| Elegir 1 happy path y **exactamente** 2 casos de error | Correr los tests o abrir el navegador |
| Nombrar selectores y textos que ya existen en `web/` | Inventar pantallas, campos o mensajes que el spec no fija |

## Paso 1 — Leer, en este orden

1. **`CLAUDE.md`**: stack, comandos, cómo se levanta la app (`npm run dev`,
   `http://localhost:5173`).
2. **`requirements.md`**: §2 Alcance primero — lo que quedó **fuera** acota qué
   puedes planear —, y después los criterios EARS. Un caso E2E que no puede
   citar un `R#.#` no es un caso: es una idea.
3. **`design.md`**: §7 (para saber qué ya está cubierto abajo y no repetirlo) y
   §9 (las decisiones `D#` que explican por qué la app se comporta así).
4. **`tasks.md`**: §3 para saber qué está `Hecha` —solo se planea contra lo
   implementado—, §6 y §7, porque una decisión de implementación o un desvío
   cambian lo que el usuario ve en pantalla.
5. **El código real de `web/`**: los textos, roles y etiquetas que existen hoy.
   Esto es lo que evita que el plan pida "el botón *Guardar límites*" cuando el
   botón dice *Aplicar*.

## Paso 2 — Elegir los tres casos

**E1 — happy path.** El recorrido que justifica que la feature exista, de punta
a punta y en un solo hilo: la persona entra, hace lo que vino a hacer, y ve el
resultado. Si el spec tiene varios flujos, elige el que más criterios atraviesa,
no el más corto. Un happy path que no llega a ver el efecto de lo que hizo está
a medias: el aserto final es **el resultado visible**, no el clic.

**E2 y E3 — dos casos de error.** Exactamente dos, y que no se pisen. Los
buenos candidatos, en orden de valor:

1. **Entrada inválida que el sistema rechaza con un aviso al usuario** — un
   criterio EARS con `WHEN … THE SYSTEM SHALL` que termina en un mensaje. Se
   prueba que el aviso aparece **y** que el efecto no ocurrió: un error que
   avisa pero igual guarda es peor que uno que no avisa.
2. **Regla de negocio que bloquea una acción legítima en apariencia** — el
   duplicado, el límite excedido, el borrado de algo que tiene dependencias.
   Aquí vive el valor real de la feature.
3. **Estado vacío o borde del calendario** — el mes sin presupuesto, la lista
   sin elementos, enero contra diciembre.

Elige dos familias **distintas**: dos variantes de "campo inválido" prueban lo
mismo dos veces.

**Lo que no se planea:** nada de `requirements.md` §2 "Fuera de alcance"; nada
que el navegador no pueda observar (que el repositorio escriba atómicamente no
es un caso E2E); y nada que dependa de una tarea que no esté `Hecha`.

## Paso 3 — Escribir el plan

En `docs/specs/<fecha>-<slug>/e2e-tests-plan.md`. Es el **único** archivo que
escribes, y se sobrescribe entero cada vez que se replanea.

```markdown
# Plan de pruebas E2E — <título del spec>

| | |
|---|---|
| **Spec** | `docs/specs/<fecha>-<slug>/` |
| **App** | `npm run dev` → http://localhost:5173 |
| **Runner** | `npm run test:e2e` (Playwright, `e2e/<slug>.spec.ts`) |
| **Escrito** | <YYYY-MM-DD> |

## 1. Qué se prueba acá y qué no

<Dos o tres frases: qué capa cubre este plan y qué queda para los unitarios de
design.md §7. Nombra lo que deliberadamente NO se prueba en navegador.>

## 2. Precondiciones

<El estado del que parte cada caso: datos previos, mes en pantalla, ruta de
arranque. Si un caso necesita datos sembrados, dilo acá, no dentro del caso.>

## 3. Casos

### E1 — <título en voz de usuario> · happy path

- **Criterios:** R#.#, R#.#
- **Como usuario quiero:** <una frase, lo que la persona vino a lograr>
- **Pasos:**
  1. <acción observable: "abrir http://localhost:5173/#/...">
  2. <acción: "escribir 120000 en el campo Límite de Comida">
  3. <acción: "hacer clic en Aplicar">
- **Resultado esperado:**
  - <aserto concreto y visible: texto, estado, número en pantalla>
  - <el efecto persistente, si el criterio lo fija: "al recargar, el límite sigue">
- **Cómo falla:** <qué se vería si el criterio no se cumple — esto es lo que
  hace que el test pueda fallar de verdad>

### E2 — <título> · error

<mismo formato>

### E3 — <título> · error

<mismo formato>

## 4. Trazabilidad

| Caso | Criterios | Tarea(s) | ¿Cubierto abajo? |
|---|---|---|---|
| E1 | R#.# | T# | CP# (unitario) / — |

## 5. Selectores conocidos

| Qué | Cómo se ubica hoy | Archivo |
|---|---|---|
| <"botón Aplicar"> | `getByRole("button", { name: "Aplicar" })` | `web/src/...` |

<Lo que verificaste leyendo `web/`. Si un elemento del plan no existe todavía en
el código, escríbelo igual y márcalo **sin verificar**: generate-tests lo
resuelve contra la app viva, pero tiene que saber cuáles dudar.>
```

Dos reglas al redactar los pasos: **acciones, no llamadas de Playwright** (el
script lo escribe otro), y **valores concretos, no placeholders** — "un monto
inválido" no es un caso; `-1` sí lo es. Los valores del borde son el caso;
cambiarlos por otros más cómodos es la forma silenciosa de no probar nada.

## Paso 4 — Encadenar con generate-tests

Escrito el plan, lanza el subagente:

```
Agent({ subagent_type: "generate-tests",
        description: "Generar los E2E del spec",
        prompt: "Spec: docs/specs/<fecha>-<slug>/.
                 Plan: docs/specs/<fecha>-<slug>/e2e-tests-plan.md.
                 Escribe los tres casos en e2e/<slug>.spec.ts." })
```

No resumas el plan en el prompt: el subagente lo lee del archivo, y un resumen
tuyo es una tercera versión del caso que se va a desviar de las otras dos.

Cuando vuelva, **relaya** qué archivo escribió y qué selectores tuvo que
cambiar respecto de tu §5 — un selector que el plan predijo mal y el subagente
corrigió es información sobre la app, no ruido.

## Guardarraíles

- **Tres casos, ni dos ni cuatro.** El tope no es pereza: tres casos que se
  mantienen valen más que ocho que se abandonan en la primera regresión.
- **Ningún caso sin `R#.#`.** Si te parece importante y no hay criterio que lo
  respalde, dilo en §1 como hueco del spec y mándalo a `/specify`. No lo
  planees.
- **No escribes `requirements.md`, `design.md` ni `tasks.md`.** Lo que
  descubras se reporta en la conversación.
- Si el spec no tiene UI implementada (todas las tareas de pantalla sin
  `Hecha`), **para**: dilo y no escribas el plan. Un plan E2E contra una API sin
  pantalla es un plan de pruebas de `curl` disfrazado.
