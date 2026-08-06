---
name: planning-tasks
description: 'Convierte un spec aprobado (requirements.md + design.md) en un tasks.md iterado al 100%, orquestando el subagente `planner`: UN solo subagente cuando todavía no hay tareas —para la estimación inicial— y UNO POR TAREA cuando ya existen, para dimensionarlas en paralelo. Usa este skill SIEMPRE que haya que escribir, completar, auditar, redimensionar, reordenar o re-sincronizar el plan de implementación de un spec, incluso si el usuario no nombra el archivo: frases como "armá el plan de tareas", "¿en qué tareas se parte esto?", "el diseño ya está aprobado, ¿qué sigue?", "revisá si las tareas están bien dimensionadas", "esta tarea es demasiado grande", "cambió el diseño y el plan quedó viejo", "faltan tareas para estos criterios", "terminá el tasks.md". Úsalo también cuando /specify llegue a su Fase 3. Cubre solo la planeación y termina en un plan aprobado en su gate: no escribe código ni ejecuta las tareas.'
---

# planning-tasks — el plan de implementación, por consenso

Toma un spec cuyo diseño ya pasó su gate y deja `tasks.md` **terminado**: cada criterio aprobado con una tarea que lo construye, cada tarea del tamaño de un ciclo TDD, y un orden que es cierto contra el repo.

El trabajo de juicio no lo haces tú: lo hace el subagente `planner`, que existe para eso y trabaja de a una tarea por invocación. Tu papel es **orquestar y consolidar** — decidir a quién invocar, con qué objetivo, en qué orden, y qué hacer cuando dos informes se contradicen. Esa contradicción es información: dos planners que miran la misma frontera desde tareas distintas y no coinciden encontraron un borde que el diseño dejó difuso.

Por qué se delega en vez de escribir el plan de una sentada: dimensionar una tarea exige leer el spec entero, la tabla de casos de prueba y **el estado real del repo**, y esa lectura se degrada tarea a tarea cuando la hace un solo contexto que ya escribió veinte. Un planner por tarea le da a la tarea 15 la misma atención que a la 1.

## Alcance

| Sí | No |
|---|---|
| Orquestar `planner` hasta cerrar `tasks.md` | Escribir el plan tú mismo |
| Consolidar informes y resolver contradicciones | Escribir código o tests |
| Verificar cobertura y consistencia mecánicamente | Ejecutar las tareas del plan |
| Presentar los gates al usuario | Editar `requirements.md` o `design.md` |
| Re-sincronizar un plan con trabajo ya hecho | Reescribir bitácoras o historia |

**No edites `tasks.md` tú.** Las reglas de qué se puede tocar según el estado de cada tarea viven en el contrato del `planner`, y saltárselas es exactamente cómo se pierde una bitácora. La única excepción es el campo **Estado del plan** de la cabecera, que pasa a `Aprobado` cuando el usuario lo aprueba en el Gate 2.

## La meta: qué significa "iterado al 100%"

No es "el archivo existe". Es esta lista, y conviene tenerla a la vista desde el principio porque es la condición de salida del bucle:

- [ ] Cada fila del inventario (§3) tiene su bloque desarrollado en §4.
- [ ] Cada criterio que `design.md` §8 se comprometió a cubrir aparece en §5 con al menos una tarea.
- [ ] Cada tarea cita al menos un criterio, o se declara andamiaje que `design.md` §2 pide.
- [ ] Cada caso de prueba citado existe **literalmente** en `design.md` §7, y ningún `CP#` quedó sin tarea que lo reclame.
- [ ] Cada tarea es un ciclo TDD: un componente, una capa, entre dos y cuatro checks verificables.
- [ ] Una ronda completa de auditoría no produce ningún cambio.

Las cinco primeras las verifica `scripts/cobertura.py` sin juicio humano. La sexta es la que exige el bucle: un plan puede estar completo y mal dimensionado.

## Fase 0 — Ubicar el spec y clasificar el estado inicial

1. **La carpeta.** `docs/specs/<fecha>-<slug>/`. Si hay más de una y el usuario no dijo cuál, pregunta antes de nada: planear sobre el spec equivocado desperdicia la ronda entera.
2. **Los prerequisitos.** `requirements.md` y `design.md` tienen que existir, y `design.md` tiene que traer sus tablas §7 (casos de prueba) y §8 (trazabilidad). **De ahí salen las tareas**, y sin ellas no hay de dónde derivarlas: si falta el diseño o está sin aprobar, este no es el paso — es `/specify`, y decirlo es más útil que planear sobre arena.
3. **El estado.** Lee `tasks.md` si existe y responde dos preguntas: ¿el inventario de §3 tiene filas?, ¿cuáles de esas filas tienen bloque desarrollado en §4?

| Estado inicial | Señal | Qué se lanza |
|---|---|---|
| **Sin plan** | no hay `tasks.md`, o existe con §3 vacío | **un solo** `planner`, sin tarea objetivo |
| **Con plan** | §3 tiene filas | **un `planner` por tarea** |

## Por qué uno al arrancar y muchos después

Cuando no hay nada, lo que hay que decidir es **la forma del plan**: en cuántas tareas se parte la feature y en qué orden. Eso es un juicio único y global, no la suma de juicios locales. Dos planners decidiendo la forma al mismo tiempo inventan dos formas distintas, cada una coherente consigo misma e incompatible con la otra, y no hay manera de fusionarlas después. Por eso el arranque es **uno solo**.

Cuando el inventario ya existe, lo que queda es **el tamaño y la cobertura de cada tarea**, que sí es un juicio local: se responde leyendo esa tarea contra el spec y contra el repo. Ahí uno por tarea gana de verdad, porque la pregunta 3 del planner —¿tiene el tamaño correcto?— es la que más se equivoca cuando se responde en serie sobre veinte tareas con el contexto ya gastado.

## La regla que hace posible el paralelismo: se diagnostica en paralelo, se escribe en serie

Todos los planners escriben el **mismo archivo**, y no solo su bloque: cada uno toca también el inventario (§3) y la trazabilidad (§5). Lanzados a la vez en modo escritura se pisan, y el resultado no es un plan a medias sino un plan roto de una forma que se lee bien. Así que el paralelismo va donde no hay riesgo:

- **Diagnóstico** — lectura y juicio, sin escribir. En paralelo, uno por tarea. Es donde vive casi todo el costo (leer el spec, el diseño y el repo), así que es donde el paralelismo paga.
- **Escritura** — aplicar los cambios. En serie, en orden de `T#`, un planner a la vez.

El diagnóstico se le pasa al planner que escribe como **hipótesis, no como orden**. Entre que se diagnosticó y le toca escribir, el archivo pudo cambiar: si T4 se partió en T4 y T22, el diagnóstico de T5 se escribió contra un documento que ya no existe. El planner que escribe verifica contra el archivo actual y contra el repo, y si el cambio ya no aplica, lo dice y no lo fuerza.

## Fase 1 — Arranque: un solo planner

Solo si no hay plan. Invoca **un** `planner` con este encargo:

```
Spec: docs/specs/<carpeta>/
Todavía no hay plan: tasks.md no existe (o su §3 está vacío).

Creá el documento desde cero, según tu Fase C:
- §1 y §2 copiadas de la plantilla,
- §3 con el inventario PROVISIONAL COMPLETO derivado de design.md §7 y §8
  —título y dependencias, una línea por tarea—,
- T1 desarrollada en §4,
- §5 completa,
- §6 a §8 vacías con su nota.

El inventario completo desde el principio es lo que hace que las invocaciones
siguientes sepan cuál es "la siguiente". Devolvé tu informe.
```

Cuando vuelve, el estado pasa a **Con plan** y sigues; no hace falta preguntar nada todavía.

## Gate 1 — Consenso sobre la forma del plan

Aquí sí paras, y es el gate que más ahorra: desarrollar veinte bloques sobre una forma equivocada cuesta veinte invocaciones que hay que tirar.

Presenta al usuario, sin abrir el archivo:

1. El inventario de §3 completo, una línea por tarea.
2. Qué obliga el orden (dependencias técnicas) y qué elegiste (conveniencia).
3. Dónde el planner dudó o encontró huecos en el diseño.
4. La pregunta directa: **¿esta es la forma del plan, o hay que agrupar distinto antes de desarrollar cada tarea?**

Reagrupar acá es barato. Después de la Fase 2 ya no.

## Fase 2 — Desarrollar el inventario: una invocación por fila, en serie

Cada fila de §3 sin bloque en §4 necesita que alguien la escriba, y escribir es en serie. Recórrelas en orden de `T#`, una invocación cada una:

```
Spec: docs/specs/<carpeta>/
Tarea objetivo: T<k> — <título tal como está en §3>

Está en el inventario de §3 y todavía no tiene bloque en §4. Escribila completa
y actualizá §3, §5 y §8 en la misma pasada, como dice tu Fase C.
```

Es la parte cara del proceso y no tiene atajo: la unidad del `planner` es una tarea por invocación, y agrupar tres en un encargo devuelve exactamente el juicio degradado que este skill existe para evitar. Lo que sí conviene es informar el avance cada pocas tareas, porque es un tramo largo.

Si el informe vuelve `bloqueado`, **no rellenes el hueco**: es un comportamiento que ningún criterio fija, y se arregla en `requirements.md` o en `design.md`. Anótalo, sigue con las demás, y llévalo al gate.

## Fase 3 — Auditoría: un planner por tarea, en paralelo

Con todas las filas desarrolladas, lanza el diagnóstico. Una invocación por tarea, **todas en el mismo mensaje** para que corran a la vez. Si son más de diez, van en tandas de ocho o diez: no por límite técnico, sino porque veinte informes de golpe no se consolidan bien.

```
Modo DIAGNÓSTICO — no escribas ningún archivo en esta invocación.

Spec: docs/specs/<carpeta>/
Tarea objetivo: T<k>

Hacé tus Fases A y B —contexto, y las cinco preguntas sobre T<k>— y devolvé tu
informe. Saltate la Fase C: no uses Write ni Edit.

Por qué: hay un planner por tarea corriendo al mismo tiempo que vos, y todos
escribirían el mismo tasks.md. Un pase posterior, en serie, aplica los cambios.

En vez de "Qué cambió en tasks.md", escribí "Qué cambiaría": la edición concreta
que harías, sección por sección, con el suficiente detalle como para que otro la
aplique sin volver a decidir.
```

Incluye también las tareas `En curso`, `Hecha` o `Bloqueada`. Diagnosticarlas no toca nada y es lo que detecta que el diseño cambió debajo de una tarea ya terminada — que se resuelve con una tarea nueva, nunca reescribiendo la vieja.

## Fase 4 — Consolidar: dónde se contradicen los informes

Cada planner trabajó ciego a los demás, así que las colisiones son esperables y resolverlas **antes** de escribir es el trabajo que solo tú puedes hacer:

| Colisión | Qué significa | Cómo se resuelve |
|---|---|---|
| T4 propone absorber a T5, y T5 propone absorber a T4 | los dos ven una sola unidad, ninguno ve cuál | una invocación con **las dos** como objetivo: "T4 y T5, ¿son una tarea o dos?" |
| Dos informes proponen la misma tarea faltante | el hueco es real y se vio desde dos lados | se crea **una** vez, con el siguiente número libre |
| T4 propone partirse y T6 depende de T4 | la dependencia de T6 queda ambigua | se resuelve sola: la escritura es en serie y T6 se re-deriva después de T4 |
| Dos tareas reclaman el mismo `CP#` sin que una delegue en la otra | la frontera entre dos componentes está difusa | va al usuario: suele ser un componente sin frontera clara en `design.md` |
| Un informe dice `bloqueado` | falta comportamiento que ningún criterio fija | va al usuario nombrando el documento donde se arregla |

Lo que no se resuelve por regla no se decide a ojo: se nombra en el gate. Un desacuerdo entre dos planners sobre dónde termina una tarea es casi siempre un desacuerdo del diseño consigo mismo, y lo barato es arreglarlo un documento más arriba.

## Fase 5 — Aplicar en serie

Solo las tareas cuyo veredicto no fue `sin cambios`, en orden de `T#`:

```
Modo ESCRITURA.

Spec: docs/specs/<carpeta>/
Tarea objetivo: T<k>

Un diagnóstico previo concluyó: <veredicto + una línea de por qué>.
Tomalo como hipótesis, no como orden. Desde entonces se aplicó: <qué cambió en
esta misma ronda, o "nada">. Verificá contra el archivo y el repo tal como están
ahora; si el cambio ya no aplica, decilo y no lo fuerces.
```

Después de cada escritura, corre `scripts/cobertura.py`: cuesta un segundo y atrapa la fila de §5 que quedó apuntando a una tarea que se renombró.

## El bucle: cuándo terminas

Ronda = diagnóstico en paralelo → consolidar → escribir en serie. Repite.

- **Rondas intermedias dirigidas.** Después de la primera, no hace falta diagnosticar las veintiuna: alcanza con las que cambiaron, las que dependen de una que cambió, y las que citan un criterio que se movió.
- **La ronda final es completa.** Todas las tareas, diagnóstico en paralelo, y el resultado tiene que ser `sin cambios` en todas. Esa pasada limpia **es** la prueba de que el plan está iterado al 100%; sin ella solo sabes que lo que tocaste quedó bien.
- **Tres rondas sin converger no se arreglan con una cuarta.** Si una tarea oscila —se parte, se fusiona, se vuelve a partir— para y repórtalo. Una tarea que no se deja dimensionar suele ser un criterio ambiguo en `requirements.md` o un componente sin frontera en `design.md`, y ninguna cantidad de rondas lo va a resolver desde acá.

## Verificación mecánica

```bash
python3 .claude/skills/planning-tasks/scripts/cobertura.py docs/specs/<carpeta>/
```

Cruza `requirements.md`, `design.md` §7/§8 y `tasks.md` §3/§4/§5, y reporta lo que ningún ojo humano ve de forma confiable: criterios sin tarea, tareas sin criterio, `CP#` citados que no existen en el diseño, `CP#` del diseño que ninguna tarea reclama, §4 y §5 desalineadas, dependencias que apuntan a una tarea inexistente o posterior, y bloques a los que les falta una parte del plan.

Distingue **incompleto** de **roto**, y es la distinción que lo hace usable: una fila de §3 sin bloque en §4 no es un defecto, es el estado normal entre el arranque y el final del bucle, así que sale como una línea de progreso (`3/21 tareas desarrolladas`) y no como veinte errores que tapan los de verdad. Los chequeos que solo tienen sentido con el plan entero —los `CP#` huérfanos— esperan a que no falte ninguna tarea. Sale con código 0 solo cuando el plan está **completo y sin errores**, que es la definición operativa de la meta.

Es un complemento del juicio del planner, no un reemplazo: verifica que las referencias cierren, no que la tarea tenga el tamaño correcto. Un plan puede pasarlo entero y estar mal dimensionado — para eso está la ronda de auditoría.

## Gate 2 — Consenso sobre el plan completo

Con la ronda limpia y `cobertura.py` en verde, presenta:

1. La ruta del archivo.
2. Las tareas en una línea cada una con los criterios que cubren (`T3 — Rechazar presupuesto duplicado (R1.2, BR2)`).
3. Qué cambió respecto de la forma aprobada en el Gate 1, y por qué: las particiones, las fusiones y las tareas que aparecieron.
4. Los criterios sin tarea. Debería ser ninguno; si hay alguno, es lo primero que hay que discutir.
5. Lo que quedó `bloqueado` o sin consenso entre planners, con el documento donde se arregla.
6. La pregunta directa: **¿apruebo el plan?**

Di también que §6 (decisiones) y §7 (desvíos) quedan **vacías**, y que eso es correcto: son las secciones que solo puede llenar la implementación. Un archivo con tablas vacías se lee como trabajo pendiente y alguien va a querer rellenarlas con conjeturas — y una decisión conjeturada antes de tomarla es peor que ninguna, porque parece un registro.

Aprobado el plan, pon `Aprobado` en el campo **Estado del plan** de la cabecera y **detente**. La implementación es un paso aparte, y arrancar la primera tarea en el mismo turno anula el gate que acabas de presentar.

## Cuando ya hay trabajo hecho

Un plan con tareas `En curso` o `Hecha` no se replanifica, se re-sincroniza, y el `planner` ya trae las reglas. Lo tuyo es no pedirle que las rompa:

- Nunca pidas reescribir el plan de una tarea que no está `Pendiente`, ni el de una `Pendiente` con el plan ya `Aprobado` — salvo que el usuario lo pida explícitamente y lo sepa.
- Criterio nuevo → tarea nueva al final. Tarea que ya no aplica → `Descartada` con el motivo, nunca borrada. Tarea `Hecha` cuyo comportamiento cambió → tarea nueva que cita a la anterior.
- Si para que el documento cuadre hace falta corregir una entrada de bitácora, no cuadra: repórtalo como contradicción en vez de resolverlo.

## Recursos

- `scripts/cobertura.py` — el cruce mecánico entre spec y plan. Córrelo después de cada escritura y antes del Gate 2.
- El contrato del subagente vive en `.claude/agents/planner.md`. No hace falta leerlo para orquestar, pero si un informe llega con un formato que no reconoces, ahí está la plantilla.
