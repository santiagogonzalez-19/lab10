---
name: planning-tasks
description: 'Convierte un spec aprobado (requirements.md + design.md) en un tasks.md iterado al 100%, lanzando el workflow dinámico `converger-plan`: un scout clasifica el estado, un solo planner hace el bootstrap, y luego un planner por tarea diagnostica en paralelo mientras la escritura va en serie. Usa este skill SIEMPRE que haya que escribir, completar, auditar, redimensionar, reordenar o re-sincronizar el plan de implementación de un spec, incluso si el usuario no nombra el archivo: frases como "armá el plan de tareas", "¿en qué tareas se parte esto?", "el diseño ya está aprobado, ¿qué sigue?", "revisá si las tareas están bien dimensionadas", "esta tarea es demasiado grande", "cambió el diseño y el plan quedó viejo", "faltan tareas para estos criterios", "terminá el tasks.md". Úsalo también cuando /specify llegue a su Fase 3. Cubre solo la planeación y termina en un plan aprobado en su gate: no escribe código ni ejecuta las tareas.'
---

# planning-tasks — lanzar el workflow de planeación

La planeación completa la hace el **workflow dinámico `converger-plan`**
(`.claude/workflows/converger-plan.js`), no este skill. Tus únicos trabajos son:

1. **Asegurar el input** que el workflow necesita.
2. **Lanzarlo** sobre ese spec.
3. **Presentar los gates** y relayar su reporte — los gates son humanos y viven
   en esta conversación, nunca dentro del workflow.

**No evalúes, redactes ni edites `tasks.md` tú.** Los planners del workflow son
los únicos autores del archivo. Tu única excepción es el campo **Estado del
plan** de la cabecera, que pasa a `Aprobado` cuando el usuario aprueba el Gate 2.

## Qué hace el workflow (para que puedas explicarlo y relayarlo)

```
Scout (router) ─→ sin-plan  → Bootstrap: UN planner escribe §3 completo + T1
              │               → corta y devuelve gate-1 (la forma del plan)
              ├→ con-plan   → Desarrollo: filas de §3 sin bloque, EN SERIE
              │               Bucle (máx. 4 rondas):
              │                 Diagnóstico  — un planner por tarea, EN PARALELO, read-only
              │                 Consolidar   — resuelve colisiones entre informes ciegos
              │                 Escritura    — aplica EN SERIE, hipótesis no orden,
              │                                cobertura.py tras cada write
              │               → converge con una ronda COMPLETA limpia
              │               → Verificación: cobertura.py + material del gate-2
              └→ bloqueado  → falta requirements.md/design.md (o sus §7/§8) → /specify
```

Las reglas del proceso (uno al arrancar y muchos después; se diagnostica en
paralelo y se escribe en serie; bloqueos no se rellenan; tope de rondas por
oscilación) viven codificadas en el script y en `.claude/agents/planner.md` —
no hace falta repetirlas acá, hace falta no estorbarlas.

## Paso 1 — Asegurar el input

El workflow necesita una carpeta `docs/specs/<fecha>-<slug>/` con
`requirements.md` y `design.md` aprobados (y `design.md` con sus tablas §7 y §8,
que es de donde se derivan las tareas):

- Si el usuario nombró la feature o la carpeta, úsala.
- Si hay exactamente una en `docs/specs/`, úsala y dilo.
- Si hay varias y la conversación no lo hace obvio, **pregunta antes de
  lanzar**: planear sobre el spec equivocado desperdicia la corrida entera.
- Si falta `requirements.md` o `design.md`, **para** y manda al usuario a
  `/specify`. No lances el workflow: su scout también lo detectaría, pero
  decírselo tú es más barato que una corrida bloqueada.

No hace falta inspeccionar `tasks.md`: el scout del workflow clasifica solo si
arranca de cero o itera lo que hay.

## Paso 2 — Lanzar converger-plan

```
Workflow({ scriptPath: "01-mis-finanzas/.claude/workflows/converger-plan.js",
           args: { specFolder: "01-mis-finanzas/docs/specs/<fecha>-<slug>/" } })
```

(Si la sesión corre desde `01-mis-finanzas/`, también resuelve por nombre:
`Workflow({ name: "converger-plan", args: {...} })`. Ajusta las rutas al cwd
real.)

Lanzarlo desde este skill es el opt-in explícito. Corre en background sobre
muchos subagentes y su salida **no** la ve el usuario: todo lo que devuelve lo
relayas tú.

## Paso 3 — Los gates

El workflow no puede pausar a mitad de corrida, así que corta donde hay una
decisión humana. Su retorno trae un campo `gate` que te dice dónde estás:

**`gate: "gate-1"`** (había que crear el plan desde cero) — presenta, sin abrir
el archivo: el `inventario` completo una línea por tarea, `ordenObligado` (qué
del orden es dependencia técnica y qué conveniencia), las `dudas` del planner, y
la pregunta directa: **¿esta es la forma del plan, o hay que agrupar distinto
antes de desarrollar cada tarea?** Reagrupar acá es barato; después ya no. Con
la forma aprobada, **relanza** el workflow sobre el mismo spec (el scout ya verá
`con-plan` y seguirá con desarrollo + convergencia). Si el usuario pide
reagrupar, transmite el reajuste al relanzar en `args` como contexto y deja que
los planners lo apliquen.

**`gate: "gate-2"`** (la corrida completa terminó) — presenta:

1. La ruta del archivo y si `convergido` (ronda completa limpia) y
   `coberturaOk` están en verde.
2. `tareas`: una línea por tarea con sus criterios.
3. `criteriosSinTarea`: debería ser ninguno; si hay, es lo primero a discutir.
4. `decisionesUsuario` y `bloqueos`: el workflow no puede preguntar a mitad de
   corrida, así que estas son las decisiones que solo el usuario puede tomar —
   preséntalas con tu recomendación y el documento donde se arreglan
   (`requirements.md` o `design.md`). Si el usuario las resuelve, relanza el
   workflow para que los planners las apliquen.
5. La pregunta directa: **¿apruebo el plan?**

Di también que §6 (decisiones) y §7 (desvíos) quedan **vacías** y que eso es
correcto: solo la implementación puede llenarlas.

Aprobado el plan, pon `Aprobado` en **Estado del plan** de la cabecera y
**detente**: la implementación es un paso aparte, y arrancar la primera tarea en
el mismo turno anula el gate que acabas de presentar.

**`bloqueado: true`** — relaya el motivo (casi siempre falta un
`requirements.md`/`design.md` aprobado o sus tablas §7/§8) y manda a `/specify`.

## Guardarraíles

- Este skill **planea**; ni él ni el workflow implementan tareas. La ejecución
  es la etapa siguiente, después de que el usuario aprueba `tasks.md`.
- Nunca edites `tasks.md`, `requirements.md` ni `design.md` (salvo la excepción
  del Estado del plan). Los huecos de requisitos o diseño se reportan y
  pertenecen a `/specify`.
- Si el workflow devuelve `convergido: false` (tope de rondas), no lo relances a
  ciegas: una tarea que oscila es casi siempre un criterio ambiguo en
  `requirements.md` o un componente sin frontera en `design.md` — llévalo al
  usuario nombrando el documento.
- La verificación mecánica sigue disponible a mano:
  `python3 .claude/skills/planning-tasks/scripts/cobertura.py docs/specs/<carpeta>/`.
