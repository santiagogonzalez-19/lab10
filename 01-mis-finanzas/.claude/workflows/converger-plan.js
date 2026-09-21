export const meta = {
  name: 'converger-plan',
  description:
    'Genera e itera al 100% el tasks.md de cualquier spec: router por estado, fan-out de planners en diagnóstico, consolidación de colisiones y escritura en serie',
  whenToUse:
    'Cuando un spec tiene requirements.md + design.md aprobados y hay que crear, desarrollar, auditar o re-sincronizar su tasks.md. Pasa la carpeta del spec como args ({ specFolder }); si el plan no existe, el workflow corta tras el bootstrap para el Gate 1 (forma del plan) y se relanza aprobado. Emula la skill /planning-tasks respetando su regla: se diagnostica en paralelo, se escribe en serie.',
  phases: [
    { title: 'Scout', detail: 'resolver carpeta del spec, prerequisitos y estado inicial (read-only)' },
    { title: 'Bootstrap', detail: 'UN solo planner crea el documento con el inventario provisional completo' },
    { title: 'Desarrollo', detail: 'una invocación por fila de §3 sin bloque en §4, en serie y en orden de T#' },
    { title: 'Diagnóstico', detail: 'un planner por tarea en modo read-only, en paralelo' },
    { title: 'Consolidar', detail: 'resolver colisiones entre informes ciegos antes de escribir', model: 'sonnet' },
    { title: 'Escritura', detail: 'aplicar los cambios en serie, en orden de T#, verificando cobertura.py tras cada uno', model: 'sonnet' },
    { title: 'Verificación', detail: 'cobertura.py final y material para el Gate 2', model: 'sonnet' },
  ],
}

// ---------------------------------------------------------------------------
// Schemas — cada fase entrega datos tipados a la siguiente.
// ---------------------------------------------------------------------------

const SCOUT_SCHEMA = {
  type: 'object',
  required: ['specFolder', 'estado'],
  properties: {
    specFolder: { type: 'string', description: 'ruta relativa al repo de docs/specs/<fecha>-<slug>/ que existe de verdad' },
    estado: { type: 'string', enum: ['sin-plan', 'con-plan', 'bloqueado'] },
    estadoPlan: { type: 'string', description: 'campo "Estado del plan" de la cabecera de tasks.md (Borrador/Aprobado), o "" si no hay archivo' },
    tareas: {
      type: 'array',
      description: 'una entrada por fila del inventario de §3, en orden',
      items: {
        type: 'object',
        required: ['id', 'titulo', 'tieneBloque', 'estadoTarea'],
        properties: {
          id: { type: 'string' },
          titulo: { type: 'string' },
          tieneBloque: { type: 'boolean', description: 'true si tiene bloque desarrollado en §4' },
          estadoTarea: { type: 'string', description: 'Pendiente | En curso | Hecha | Bloqueada | Descartada' },
        },
      },
    },
    motivoBloqueo: { type: 'string', description: 'por qué no se puede planear (falta requirements.md, design.md, o sus tablas §7/§8)' },
    notas: { type: 'string' },
  },
}

const BOOTSTRAP_SCHEMA = {
  type: 'object',
  required: ['inventario'],
  properties: {
    inventario: {
      type: 'array',
      description: 'el inventario de §3 tal como quedó escrito: una línea por tarea',
      items: {
        type: 'object',
        required: ['id', 'titulo'],
        properties: {
          id: { type: 'string' },
          titulo: { type: 'string' },
          dependencias: { type: 'string' },
        },
      },
    },
    ordenObligado: { type: 'string', description: 'qué del orden es dependencia técnica y qué es conveniencia' },
    dudas: { type: 'array', items: { type: 'string' }, description: 'dónde el planner dudó o encontró huecos en el diseño' },
    informe: { type: 'string' },
  },
}

const ESCRITURA_SCHEMA = {
  type: 'object',
  required: ['taskId', 'veredicto'],
  properties: {
    taskId: { type: 'string' },
    veredicto: {
      type: 'string',
      enum: ['creada', 'reencuadrada', 'partida', 'fusionada', 'descartada', 'sin cambios', 'bloqueado'],
    },
    resumen: { type: 'string', description: 'qué cambió en tasks.md, un renglón por edición con su sección' },
    sinCubrir: { type: 'array', items: { type: 'string' }, description: 'criterios o CP# huérfanos → tarea propuesta' },
    motivoBloqueo: { type: 'string', description: 'si bloqueado: qué falta y en qué documento se arregla' },
    coberturaOk: { type: 'boolean', description: 'true si cobertura.py salió sin errores (los "incompleto" de progreso no cuentan como error)' },
  },
}

const DIAG_SCHEMA = {
  type: 'object',
  required: ['taskId', 'veredicto', 'queCambiaria'],
  properties: {
    taskId: { type: 'string' },
    veredicto: {
      type: 'string',
      enum: ['sin cambios', 'reencuadrada', 'partida', 'fusionada', 'descartada', 'bloqueado'],
    },
    queCambiaria: { type: 'string', description: 'la edición concreta, sección por sección, aplicable por otro sin volver a decidir; "" si sin cambios' },
    porQue: { type: 'string', description: 'tamaño / cobertura / estado del repo: el juicio y la señal que lo disparó' },
    sinCubrir: { type: 'array', items: { type: 'string' }, description: 'criterios o CP# huérfanos → tarea que propones' },
    paraElUsuario: { type: 'string', description: 'lo que solo el usuario puede decidir (hueco de diseño, frontera difusa), o ""' },
  },
}

const CONSOLIDA_SCHEMA = {
  type: 'object',
  required: ['escrituras', 'nuevasTareas', 'reDiagnosticar'],
  properties: {
    escrituras: {
      type: 'array',
      description: 'cambios a aplicar, en orden de T#; objetivo puede ser doble ("T4 y T5") para fronteras en disputa',
      items: {
        type: 'object',
        required: ['objetivo', 'hipotesis'],
        properties: {
          objetivo: { type: 'string', description: 'ej. "T4", o "T4 y T5" para una colisión de absorción mutua' },
          hipotesis: { type: 'string', description: 'veredicto + una línea de por qué, tal como se le pasa al planner que escribe' },
        },
      },
    },
    nuevasTareas: {
      type: 'array',
      description: 'tareas faltantes DEDUPLICADAS (si dos informes proponen la misma, va UNA vez)',
      items: {
        type: 'object',
        required: ['titulo', 'criterios'],
        properties: {
          titulo: { type: 'string' },
          criterios: { type: 'string', description: 'los R#.#/BR#/REG#/CP# que la justifican' },
          motivo: { type: 'string' },
        },
      },
    },
    reDiagnosticar: {
      type: 'array',
      items: { type: 'string' },
      description: 'IDs para la próxima ronda dirigida: las que cambian, las que dependen de una que cambia, y las que citan un criterio que se movió',
    },
    decisionesUsuario: { type: 'array', items: { type: 'string' }, description: 'fronteras difusas y huecos que van al gate, con el documento donde se arreglan' },
    resumen: { type: 'string' },
  },
}

const VERIFICA_SCHEMA = {
  type: 'object',
  required: ['coberturaOk', 'resumen'],
  properties: {
    coberturaOk: { type: 'boolean', description: 'true solo si cobertura.py salió con código 0' },
    salidaCobertura: { type: 'string', description: 'la salida relevante de cobertura.py' },
    tareasEnUnaLinea: {
      type: 'array',
      items: { type: 'string' },
      description: 'una línea por tarea con sus criterios, ej. "T3 — Rechazar presupuesto duplicado (R1.2, BR2)"',
    },
    criteriosSinTarea: { type: 'array', items: { type: 'string' } },
    resumen: { type: 'string', description: 'material del Gate 2: ruta, qué cambió respecto de la forma del Gate 1, bloqueos' },
  },
}

// ---------------------------------------------------------------------------
// Prompts — reproducen los encargos de la skill /planning-tasks.
// El contrato completo del subagente vive en .claude/agents/planner.md.
// ---------------------------------------------------------------------------

function scoutPrompt(carpetaPedida) {
  return `Sos el SCOUT de un workflow de planeación. READ-ONLY: no modifiques ningún archivo.

${carpetaPedida ? `El caller nombró esta carpeta de spec: ${carpetaPedida}` : 'El caller no nombró carpeta de spec.'}

Hacé esto (es la Fase 0 de la skill /planning-tasks):
1. Resolvé la carpeta del spec: docs/specs/<fecha>-<slug>/. Puede vivir bajo un subproyecto (ej. 01-mis-finanzas/docs/specs/...) — devolvé la ruta que existe de verdad. Si hay varias y es ambiguo, elegí la más reciente por el prefijo de fecha y decilo en notas.
2. Prerequisitos: requirements.md y design.md tienen que existir, y design.md tiene que traer sus tablas §7 (casos de prueba CP#) y §8 (trazabilidad). Si falta algo, devolvé estado:"bloqueado" con motivoBloqueo apuntando a /specify.
3. Estado inicial: leé tasks.md si existe.
   - No existe, o su §3 (inventario) está vacío → estado:"sin-plan", tareas:[].
   - §3 tiene filas → estado:"con-plan". Devolvé UNA entrada por fila de §3 en orden: id, titulo, si tiene bloque desarrollado en §4 (tieneBloque), y su estadoTarea (Pendiente/En curso/Hecha/Bloqueada/Descartada). Devolvé también el campo "Estado del plan" de la cabecera en estadoPlan.

Devolvé el schema SCOUT.`
}

function bootstrapPrompt(specFolder) {
  return `Spec: ${specFolder}
Todavía no hay plan: tasks.md no existe (o su §3 está vacío).

Creá el documento desde cero, según tu Fase C:
- §1 y §2 copiadas de la plantilla,
- §3 con el inventario PROVISIONAL COMPLETO derivado de design.md §7 y §8
  —título y dependencias, una línea por tarea—,
- T1 desarrollada en §4,
- §5 completa,
- §6 a §8 vacías con su nota.

El inventario completo desde el principio es lo que hace que las invocaciones
siguientes sepan cuál es "la siguiente".

Además del informe, devolvé el schema BOOTSTRAP: el inventario tal como quedó en §3,
qué del orden es dependencia técnica y qué conveniencia (ordenObligado), y tus dudas
o huecos del diseño (dudas) — eso es lo que se presenta en el Gate 1.`
}

function desarrolloPrompt(specFolder, id, titulo) {
  return `Spec: ${specFolder}
Tarea objetivo: ${id} — ${titulo}

Está en el inventario de §3 y todavía no tiene bloque en §4. Escribila completa
y actualizá §3, §5 y §8 en la misma pasada, como dice tu Fase C.

Al terminar, corré la verificación mecánica y reportá su resultado en coberturaOk:
python3 01-mis-finanzas/.claude/skills/planning-tasks/scripts/cobertura.py ${specFolder}
(si el script no está en esa ruta, buscalo como .claude/skills/planning-tasks/scripts/cobertura.py
relativo a la raíz del proyecto del spec; las filas de §3 aún sin bloque son progreso normal, no error).

Devolvé el schema ESCRITURA.`
}

function diagPrompt(specFolder, id) {
  return `Modo DIAGNÓSTICO — no escribas ningún archivo en esta invocación.

Spec: ${specFolder}
Tarea objetivo: ${id}

Hacé tus Fases A y B —contexto, y las cinco preguntas sobre ${id}— y devolvé tu
informe. Saltate la Fase C: no uses Write ni Edit.

Por qué: hay un planner por tarea corriendo al mismo tiempo que vos, y todos
escribirían el mismo tasks.md. Un pase posterior, en serie, aplica los cambios.

En vez de "Qué cambió en tasks.md", llenó queCambiaria: la edición concreta
que harías, sección por sección, con el suficiente detalle como para que otro la
aplique sin volver a decidir. Si la tarea está bien como está, veredicto "sin cambios"
y queCambiaria "". No inventes objeciones para seguir iterando.

Las tareas En curso, Hecha o Bloqueada también se diagnostican: detectar que el diseño
cambió debajo de una tarea terminada se resuelve con una tarea NUEVA, nunca reescribiendo
la vieja — proponelo en sinCubrir.

Devolvé el schema DIAG.`
}

function consolidaPrompt(specFolder, diags, ronda) {
  return `Sos el CONSOLIDADOR de la ronda ${ronda}. READ-ONLY: no escribas archivos — tu salida es la lista de escrituras que un pase en serie va a aplicar.

Spec: ${specFolder}

Cada planner trabajó ciego a los demás, así que las colisiones son esperables y
resolverlas ANTES de escribir es tu único trabajo. La tabla de resolución:

| Colisión | Cómo se resuelve |
|---|---|
| T4 propone absorber a T5, y T5 propone absorber a T4 | UNA escritura con las dos como objetivo: "T4 y T5, ¿son una tarea o dos?" |
| Dos informes proponen la misma tarea faltante | va UNA sola vez en nuevasTareas |
| T4 propone partirse y T6 depende de T4 | se resuelve solo: la escritura es en serie y T6 se re-deriva después de T4 |
| Dos tareas reclaman el mismo CP# sin que una delegue en la otra | NO se decide acá: va a decisionesUsuario (suele ser un componente sin frontera clara en design.md) |
| Un informe dice bloqueado | va a decisionesUsuario nombrando el documento donde se arregla |

Lo que no se resuelve por regla no se decide a ojo: va a decisionesUsuario.

<INFORMES_DE_DIAGNOSTICO_JSON>
${JSON.stringify(diags)}
</INFORMES_DE_DIAGNOSTICO_JSON>

Devolvé el schema CONSOLIDA:
- escrituras: SOLO las tareas cuyo veredicto no fue "sin cambios" ni "bloqueado", en orden de T#, cada una con su hipótesis (veredicto + una línea de por qué).
- nuevasTareas: las faltantes de los sinCubrir, deduplicadas semánticamente.
- reDiagnosticar: los IDs que la próxima ronda dirigida tiene que volver a mirar — las que cambian, las que dependen de una que cambia, y las que citan un criterio que se movió.
- decisionesUsuario: fronteras difusas, bloqueos y todo paraElUsuario no vacío.`
}

function escrituraPrompt(specFolder, objetivo, hipotesis, aplicadoEstaRonda) {
  return `Modo ESCRITURA.

Spec: ${specFolder}
Tarea objetivo: ${objetivo}

Un diagnóstico previo concluyó: ${hipotesis}
Tomalo como hipótesis, no como orden. Desde entonces se aplicó: ${aplicadoEstaRonda || 'nada'}. Verificá contra el archivo y el repo tal como están
ahora; si el cambio ya no aplica, decilo (veredicto "sin cambios") y no lo fuerces.

Al terminar, corré la verificación mecánica y reportá su resultado en coberturaOk:
python3 01-mis-finanzas/.claude/skills/planning-tasks/scripts/cobertura.py ${specFolder}
(si el script no está en esa ruta, buscalo relativo a la raíz del proyecto del spec).

Devolvé el schema ESCRITURA.`
}

function nuevaTareaPrompt(specFolder, nueva, aplicadoEstaRonda) {
  return `Modo ESCRITURA.

Spec: ${specFolder}
Tarea objetivo: crear la tarea "${nueva.titulo}" — no existe todavía.

La ronda de diagnóstico encontró que ${nueva.criterios} no tienen tarea que los
construya${nueva.motivo ? ` (${nueva.motivo})` : ''}. Crearla ES la tarea objetivo de esta invocación: agregá su fila a §3
con el siguiente número libre (nunca renumeres las existentes), desarrollala en §4,
y actualizá §5 y §8 en la misma pasada.

Tomá la propuesta como hipótesis, no como orden: si al verificar contra el archivo y
el repo la tarea ya existe o el criterio ya está cubierto, decilo y no dupliques.
Desde entonces se aplicó: ${aplicadoEstaRonda || 'nada'}.

Al terminar, corré cobertura.py como en tus otras invocaciones y reportá coberturaOk.

Devolvé el schema ESCRITURA.`
}

function verificaPrompt(specFolder, rondas, convergido, decisionesUsuario, bloqueos) {
  return `Sos el paso de VERIFICACIÓN final. No modifiques tasks.md — solo verificás y reportás.

Spec: ${specFolder}

1. Corré: python3 01-mis-finanzas/.claude/skills/planning-tasks/scripts/cobertura.py ${specFolder}
   (si no está en esa ruta, buscá cobertura.py bajo .claude/skills/planning-tasks/ relativo a la raíz del proyecto del spec).
   coberturaOk = true SOLO si salió con código 0.
2. Leé tasks.md y armá el material del Gate 2:
   - tareasEnUnaLinea: cada tarea en una línea con los criterios que cubre, ej. "T3 — Rechazar presupuesto duplicado (R1.2, BR2)".
   - criteriosSinTarea: debería ser ninguno; si hay, es lo primero a discutir.
   - resumen: la ruta del archivo, cuántas rondas corrió la convergencia (${rondas}; ${convergido ? 'convergió con una ronda completa limpia' : 'NO convergió — se cortó por tope de rondas'}), qué cambió (particiones, fusiones, tareas nuevas), y recordá que §6 y §7 quedan vacías y que eso es correcto.

${decisionesUsuario.length ? `Decisiones que van al usuario (incluilas en el resumen):\n- ${decisionesUsuario.join('\n- ')}` : 'No quedaron decisiones abiertas para el usuario.'}
${bloqueos.length ? `Bloqueos reportados por los planners:\n- ${bloqueos.join('\n- ')}` : ''}

Devolvé el schema VERIFICA.`
}

// ---------------------------------------------------------------------------
// Orquestación
// ---------------------------------------------------------------------------

// args puede ser string (carpeta), objeto {specFolder, gate1Aprobado}, o (por el
// bug conocido de args-como-string) un JSON string — normalizamos los tres.
let parsed = args
if (typeof parsed === 'string') {
  const s = parsed.trim()
  if (s.startsWith('{')) {
    try { parsed = JSON.parse(s) } catch (e) { /* queda como string */ }
  }
}
const esObjeto = parsed && typeof parsed === 'object'
const carpetaPedida = esObjeto
  ? parsed.specFolder || parsed.carpeta || parsed.spec || null
  : typeof parsed === 'string' && parsed.trim() ? parsed.trim() : null
// Si el plan no existe, por defecto se corta tras el bootstrap para el Gate 1
// (el workflow no puede pausar a mitad de corrida). gate1Aprobado:true lo salta.
const gate1Aprobado = esObjeto ? Boolean(parsed.gate1Aprobado) : false
// Reajustes que el usuario pidió en un gate (ej. reagrupar la forma del plan):
// viajan a cada planner como contexto, no como orden — ellos verifican contra el repo.
const indicaciones = esObjeto && parsed.indicaciones ? String(parsed.indicaciones) : ''
const conIndicaciones = prompt =>
  indicaciones ? `${prompt}\n\nIndicaciones del usuario para esta corrida (verificalas contra el spec y el repo antes de aplicarlas):\n${indicaciones}` : prompt

const numeroDe = id => parseInt(String(id).replace(/\D+/g, ''), 10) || 0
const decisionesUsuario = []
const bloqueos = []

phase('Scout')
const scout = await agent(scoutPrompt(carpetaPedida), {
  agentType: 'Explore',
  schema: SCOUT_SCHEMA,
  phase: 'Scout',
  label: 'scout',
})
if (!scout) return { error: 'el scout no devolvió resultado' }
if (scout.estado === 'bloqueado') {
  log(`Bloqueado: ${scout.motivoBloqueo || 'faltan requirements.md/design.md o sus tablas §7/§8'}`)
  return { bloqueado: true, motivo: scout.motivoBloqueo, specFolder: scout.specFolder }
}

const specFolder = scout.specFolder
let tareas = Array.isArray(scout.tareas) ? scout.tareas : []
log(`Spec: ${specFolder} · estado: ${scout.estado}${scout.estadoPlan ? ` · plan: ${scout.estadoPlan}` : ''}`)

// --- Router: sin plan → bootstrap con UN solo planner (la forma del plan es un
// juicio global; dos planners en paralelo inventan dos formas infusionables).
if (scout.estado === 'sin-plan') {
  phase('Bootstrap')
  const boot = await agent(conIndicaciones(bootstrapPrompt(specFolder)), {
    agentType: 'planner',
    schema: BOOTSTRAP_SCHEMA,
    phase: 'Bootstrap',
    label: 'bootstrap',
  })
  if (!boot || !Array.isArray(boot.inventario) || !boot.inventario.length)
    return { error: 'el bootstrap no devolvió inventario', specFolder }
  log(`Bootstrap: inventario de ${boot.inventario.length} tarea(s), T1 desarrollada.`)

  if (!gate1Aprobado) {
    // Gate 1 — consenso sobre la forma del plan. Reagrupar acá es barato;
    // después de desarrollar veinte bloques ya no. El caller lo presenta y relanza.
    return {
      gate: 'gate-1',
      specFolder,
      inventario: boot.inventario,
      ordenObligado: boot.ordenObligado || '',
      dudas: boot.dudas || [],
      reporte:
        'Plan creado desde cero: inventario provisional completo en §3 y T1 desarrollada. ' +
        'Presentá el Gate 1 al usuario (¿esta es la forma del plan, o hay que agrupar distinto?) ' +
        'y relanzá este workflow con { specFolder, gate1Aprobado: true } — o sin el flag: el scout ya verá "con-plan".',
    }
  }
  tareas = boot.inventario.map(t => ({ id: t.id, titulo: t.titulo, tieneBloque: t.id === 'T1', estadoTarea: 'Pendiente' }))
  if (Array.isArray(boot.dudas)) decisionesUsuario.push(...boot.dudas)
}

// --- Fase 2 de la skill: desarrollar las filas de §3 sin bloque en §4.
// En serie y en orden de T#: todos los planners escriben el MISMO archivo, y la
// unidad del planner es una tarea por invocación — agrupar degrada el juicio.
const sinBloque = tareas.filter(t => !t.tieneBloque).sort((a, b) => numeroDe(a.id) - numeroDe(b.id))
if (sinBloque.length) {
  phase('Desarrollo')
  log(`Desarrollo: ${sinBloque.length} fila(s) de §3 sin bloque en §4.`)
  let escritas = 0
  for (const t of sinBloque) {
    const r = await agent(conIndicaciones(desarrolloPrompt(specFolder, t.id, t.titulo)), {
      agentType: 'planner',
      schema: ESCRITURA_SCHEMA,
      phase: 'Desarrollo',
      label: `dev:${t.id}`,
    })
    if (!r) {
      bloqueos.push(`${t.id}: el planner de desarrollo falló (infraestructura) — la tarea quedó sin bloque`)
      continue
    }
    if (r.veredicto === 'bloqueado') {
      // No se rellena el hueco: es comportamiento que ningún criterio fija.
      bloqueos.push(`${t.id}: ${r.motivoBloqueo || 'bloqueado sin motivo declarado'}`)
    }
    if (Array.isArray(r.sinCubrir)) decisionesUsuario.push(...r.sinCubrir)
    escritas++
    if (escritas % 5 === 0) log(`Desarrollo: ${escritas}/${sinBloque.length} bloques escritos.`)
  }
  log(`Desarrollo terminado: ${escritas}/${sinBloque.length} invocaciones completadas.`)
}

// --- El bucle de la skill: diagnóstico en paralelo → consolidar → escribir en serie.
// Ronda dirigida limpia → se agenda la ronda final COMPLETA; solo esa pasada limpia
// demuestra el 100%. Tres rondas con cambios no se arreglan con una cuarta.
const MAX_RONDAS = 4
let ronda = 0
let convergido = false
let objetivos = null // null → todas las tareas (ronda completa)

while (ronda < MAX_RONDAS) {
  ronda++
  const todas = tareas.map(t => t.id)
  const rondaCompleta = !(objetivos && objetivos.length)
  const ids = rondaCompleta ? todas : objetivos.filter(id => todas.includes(id))
  if (!ids.length) { objetivos = null; continue }

  phase('Diagnóstico')
  log(`Ronda ${ronda} (${rondaCompleta ? 'completa' : 'dirigida'}): diagnóstico de ${ids.length} tarea(s) en paralelo.`)
  // Barrera necesaria: la consolidación cruza TODOS los informes para detectar colisiones.
  const diags = (
    await parallel(
      ids.map(id => () =>
        agent(conIndicaciones(diagPrompt(specFolder, id)), {
          agentType: 'planner',
          schema: DIAG_SCHEMA,
          phase: 'Diagnóstico',
          label: `R${ronda}:${id}`,
        }),
      ),
    )
  ).filter(Boolean)

  if (!diags.length) {
    log(`Ronda ${ronda}: ningún planner devolvió informe; se corta el bucle.`)
    break
  }
  // Un planner caído es un fallo de infraestructura, no un veredicto: su tarea
  // no puede contar como "sin cambios".
  const evaluadas = new Set(diags.map(d => d.taskId))
  const caidas = ids.filter(id => !evaluadas.has(id))
  if (caidas.length) log(`Ronda ${ronda}: ${caidas.length} planner(s) caídos (${caidas.join(', ')}) — sus tareas se re-diagnostican.`)

  const conCambios = diags.filter(d => d.veredicto !== 'sin cambios' && d.veredicto !== 'bloqueado')
  const bloqueados = diags.filter(d => d.veredicto === 'bloqueado')
  for (const b of bloqueados) bloqueos.push(`${b.taskId}: ${b.paraElUsuario || b.porQue || 'bloqueado'}`)
  const faltantes = diags.flatMap(d => (Array.isArray(d.sinCubrir) ? d.sinCubrir : []))
  log(`Ronda ${ronda}: ${diags.length - conCambios.length}/${diags.length} sin cambios · ${conCambios.length} con cambios · ${bloqueados.length} bloqueadas · ${faltantes.length} hueco(s) de cobertura.`)

  if (!conCambios.length && !faltantes.length && !caidas.length) {
    for (const d of diags) if (d.paraElUsuario) decisionesUsuario.push(`${d.taskId}: ${d.paraElUsuario}`)
    if (rondaCompleta) {
      convergido = true
      log(`Ronda ${ronda} completa y limpia: el plan está iterado al 100%.`)
      break
    }
    log(`Ronda ${ronda} dirigida limpia — se agenda la ronda final completa.`)
    objetivos = null
    continue
  }

  phase('Consolidar')
  const cons = await agent(conIndicaciones(consolidaPrompt(specFolder, diags, ronda)), {
    agentType: 'planner',
    model: 'sonnet',
    schema: CONSOLIDA_SCHEMA,
    phase: 'Consolidar',
    label: `R${ronda}:consolidar`,
  })
  if (!cons) {
    log(`Ronda ${ronda}: la consolidación falló; se corta el bucle sin aplicar escrituras.`)
    break
  }
  if (Array.isArray(cons.decisionesUsuario)) decisionesUsuario.push(...cons.decisionesUsuario)
  log(`Ronda ${ronda}: ${cons.resumen || `${cons.escrituras.length} escritura(s), ${cons.nuevasTareas.length} tarea(s) nueva(s)`}`)

  phase('Escritura')
  // En serie, en orden de T#. El diagnóstico viaja como hipótesis, no como orden:
  // entre que se diagnosticó y le toca escribir, el archivo pudo cambiar.
  const escrituras = [...cons.escrituras].sort((a, b) => numeroDe(a.objetivo) - numeroDe(b.objetivo))
  const aplicado = []
  for (const e of escrituras) {
    const r = await agent(escrituraPrompt(specFolder, e.objetivo, e.hipotesis, aplicado.join('; ')), {
      agentType: 'planner',
      model: 'sonnet',
      schema: ESCRITURA_SCHEMA,
      phase: 'Escritura',
      label: `R${ronda}:esc:${e.objetivo}`,
    })
    if (!r) {
      bloqueos.push(`${e.objetivo}: el planner de escritura falló (infraestructura) — el cambio no se aplicó`)
      continue
    }
    if (r.veredicto === 'bloqueado') bloqueos.push(`${r.taskId}: ${r.motivoBloqueo || 'bloqueado en escritura'}`)
    else if (r.veredicto !== 'sin cambios') aplicado.push(`${r.taskId} ${r.veredicto}${r.resumen ? ` (${r.resumen.split('\n')[0]})` : ''}`)
    if (r.coberturaOk === false) log(`⚠ cobertura.py reportó errores tras escribir ${r.taskId}.`)
  }
  for (const n of cons.nuevasTareas) {
    const r = await agent(nuevaTareaPrompt(specFolder, n, aplicado.join('; ')), {
      agentType: 'planner',
      model: 'sonnet',
      schema: ESCRITURA_SCHEMA,
      phase: 'Escritura',
      label: `R${ronda}:nueva:${n.titulo.slice(0, 24)}`,
    })
    if (!r) {
      bloqueos.push(`tarea nueva "${n.titulo}": el planner falló — no se creó`)
      continue
    }
    if (r.veredicto === 'creada') {
      aplicado.push(`${r.taskId} creada (${n.titulo})`)
      tareas.push({ id: r.taskId, titulo: n.titulo, tieneBloque: true, estadoTarea: 'Pendiente' })
    }
  }
  if (aplicado.length) log(`Ronda ${ronda}: aplicado — ${aplicado.join('; ')}`)

  // Próxima ronda dirigida: lo que la consolidación pide re-mirar, más las caídas
  // y las tareas recién creadas. El inventario pudo cambiar (splits): si la
  // consolidación no dirige, la próxima ronda es completa.
  const nuevasIds = cons.nuevasTareas.length ? tareas.slice(-cons.nuevasTareas.length).map(t => t.id) : []
  const dirigidos = [
    ...new Set([...(Array.isArray(cons.reDiagnosticar) ? cons.reDiagnosticar : []), ...caidas, ...nuevasIds]),
  ]
  objetivos = dirigidos.length ? dirigidos : null
}

if (!convergido && ronda >= MAX_RONDAS) {
  log(`Tope de ${MAX_RONDAS} rondas sin ronda completa limpia — una tarea que no se deja dimensionar suele ser un criterio ambiguo en requirements.md o un componente sin frontera en design.md.`)
}

// Dedupe en JS puro (cero tokens).
const decisionesUnicas = [...new Set(decisionesUsuario.filter(Boolean))]
const bloqueosUnicos = [...new Set(bloqueos.filter(Boolean))]

phase('Verificación')
const verif = await agent(verificaPrompt(specFolder, ronda, convergido, decisionesUnicas, bloqueosUnicos), {
  model: 'sonnet',
  schema: VERIFICA_SCHEMA,
  phase: 'Verificación',
  label: 'cobertura+gate2',
})

return {
  gate: 'gate-2',
  specFolder,
  estadoInicial: scout.estado,
  rondas: ronda,
  convergido,
  coberturaOk: verif ? verif.coberturaOk : null,
  tareas: verif && Array.isArray(verif.tareasEnUnaLinea) ? verif.tareasEnUnaLinea : tareas.map(t => `${t.id} — ${t.titulo}`),
  criteriosSinTarea: verif ? verif.criteriosSinTarea : [],
  decisionesUsuario: decisionesUnicas,
  bloqueos: bloqueosUnicos,
  reporte: verif
    ? verif.resumen
    : 'La verificación final no devolvió resultado — corré cobertura.py a mano antes de presentar el Gate 2.',
}
