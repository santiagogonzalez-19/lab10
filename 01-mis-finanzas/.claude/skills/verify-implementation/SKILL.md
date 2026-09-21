---
name: verify-implementation
description: 'Cierra el ciclo de una feature ya implementada con un loop E2E autónomo: planea casos de prueba de usuario a partir del spec (`plan-test-cases`), genera los scripts de Playwright (subagente `generate-tests`), los corre y los diagnostica (subagente `healer`), y vuelve a iterar arreglando el código o regenerando los tests hasta que el reporte queda en verde o se agotan 3 rondas. Usa este skill cuando la implementación de un spec termine y haya que verificarla de punta a punta en el navegador: frases como "ya terminé las tareas del spec", "verificá la implementación", "corré el loop E2E", "probá esto en el navegador", "las tareas están en Hecha, ¿ahora qué?", o justo después de que el último task-verifier devuelva `cumple`. Cubre la verificación E2E y sus arreglos; no escribe specs ni planea tareas nuevas.'
---

# verify-implementation — el loop E2E

Este skill es el **orquestador del loop**: la ventana de contexto principal es
la suya, y todo lo caro (explorar el navegador, correr la suite, leer trazas)
vive en subagentes cuyo contexto se descarta. Lo que vuelve a esta ventana son
tres archivos cortos: el plan, los scripts y el reporte.

```
implementación terminada
  │
  └─→ ronda N (máx. 3)
        1. plan-test-cases   [skill]      → e2e-tests-plan.md   (1 happy path + 2 de error)
        2. generate-tests    [subagente]  → e2e/<slug>.spec.ts  (Playwright)
        3. healer            [subagente]  → e2e-tests-report.md (corre y diagnostica)
        4. tú lees el reporte:
             verde            → cierra el loop y presenta
             falla-de-test    → relanzas generate-tests con el diagnóstico   → ronda N+1
             falla-de-codigo  → arreglas el código en TDD y relanzas         → ronda N+1
             bloqueado        → paras y llevas el hueco del spec al usuario
```

**Tú eres el único que edita código de producción.** El healer solo diagnostica
y el generate-tests solo escribe en `e2e/`. Esa separación es lo que hace que el
diagnóstico sea creíble: quien juzga no arregla, y quien arregla no se
autoevalúa.

## Paso 0 — Resolver el spec y el estado

El loop corre sobre **un solo spec**. Necesitas su carpeta
`docs/specs/<fecha>-<slug>/`:

- Si el usuario la nombró, úsala.
- Si hay exactamente una en `docs/specs/`, úsala y dilo.
- Si hay varias, pregunta. Verificar el spec equivocado quema las tres rondas.

Antes de arrancar, dos comprobaciones baratas:

1. **¿La implementación está realmente terminada?** Mira §3 de `tasks.md`: si
   quedan tareas que no están `Hecha`, dilo y pregunta si igual se corre el loop
   sobre lo que hay. Un E2E contra una feature a medio construir produce fallas
   que no son defectos.
2. **La verificación del proyecto en verde.** `npm run typecheck` y `npm test`
   (los comandos de `CLAUDE.md`). Si el nivel unitario está rojo, **no entres al
   loop**: arregla eso primero o repórtalo. Un E2E rojo sobre un unitario rojo no
   agrega información.

Lleva la cuenta de la ronda en esta conversación (`ronda 1 de 3`). No hay estado
en disco: el `e2e-tests-report.md` se sobrescribe cada ronda y su encabezado dice
qué ronda lo escribió.

## Paso 1 — plan-test-cases

```
Skill({ skill: "plan-test-cases", args: "docs/specs/<fecha>-<slug>/" })
```

Corre en esta misma ventana —es un skill, no un subagente— y escribe
`docs/specs/<fecha>-<slug>/e2e-tests-plan.md` con exactamente tres casos: **E1**
happy path y **E2**/**E3** de error, cada uno trazado a los criterios `R#.#` que
ejercita.

**En la ronda 1 el plan se escribe. En las rondas 2 y 3 no se reescribe**, salvo
que el healer haya devuelto `bloqueado` por un caso mal planteado (un E2 que
prueba algo que el spec dejó fuera de alcance, por ejemplo). El plan es el
contrato del loop: si cambia cada ronda, el loop no converge, se pasea.

## Paso 2 — generate-tests

El propio `plan-test-cases` encadena con el subagente `generate-tests`; si por
lo que sea no lo hizo, lánzalo tú:

```
Agent({ subagent_type: "generate-tests",
        description: "Generar los E2E del spec",
        prompt: "Spec: docs/specs/<fecha>-<slug>/. Plan: su e2e-tests-plan.md.
                 Escribe los tres casos en e2e/<slug>.spec.ts." })
```

En las rondas 2 y 3, **pásale el diagnóstico del healer textualmente** — qué
caso falló, qué selector no resolvió, qué esperaba y qué encontró. Sin eso
regenera el mismo test equivocado.

Vuelve con la ruta del archivo y los selectores que usó. No lo abras entero: lo
que importa es que exista y que el healer lo corra.

## Paso 3 — healer

```
Agent({ subagent_type: "healer",
        description: "Correr y diagnosticar los E2E",
        prompt: "Spec: docs/specs/<fecha>-<slug>/. Tests: e2e/<slug>.spec.ts.
                 Ronda N de 3." })
```

Escribe `docs/specs/<fecha>-<slug>/e2e-tests-report.md` y devuelve el veredicto.
No toca ni los tests ni el código: si pudiera, el reporte dejaría de ser
evidencia y pasaría a ser una opinión sobre su propio trabajo.

## Paso 4 — Decidir la ronda siguiente

Lee el `Veredicto:` del encabezado del reporte y actúa. Uno por caso, y el
veredicto global es el peor de los tres.

| Veredicto | Qué haces |
|---|---|
| `verde` | Cierras el loop. Ve a **Cierre**. |
| `falla-de-test` | El script está mal (selector frágil, aserción que no corresponde al criterio, falta un paso previo). **No toques el código.** Relanza `generate-tests` con el diagnóstico. |
| `falla-de-codigo` | La app contradice un criterio `R#.#`. **Lo arreglas tú**, ver abajo. |
| `bloqueado` | El reporte no puede decidir: el criterio admite dos lecturas, el entorno no levanta, o el caso planeado cae fuera del alcance de `requirements.md` §2. **Paras y llevas el hueco al usuario nombrando el documento donde se arregla.** |

### Arreglar el código (`falla-de-codigo`)

Sigue la regla del proyecto: **TDD, no parche**.

1. Escribe primero el test **unitario** rojo que reproduce el defecto, en el
   nivel donde vive la lógica (`src/domain/`, `src/casos-uso/`, `web/src/`).
   Si el defecto es puramente de presentación y no hay nivel unitario donde
   caiga, dilo en la bitácora y deja que el E2E sea la prueba.
2. Implementa el arreglo mínimo. El criterio `R#.#` que el healer citó es la
   frontera: arreglar más que eso es alcance sin gate.
3. `npm run typecheck && npm test` en verde antes de volver al E2E.
4. **Escribe la bitácora.** El arreglo va a la bitácora de su tarea en
   `tasks.md`, y si tomaste una decisión, indéxala en §6 (`T#-D#`). Si lo que
   encontraste difiere de `design.md`, es un desvío y va a §7. Esto no es
   opcional: la diferencia entre lo planeado y lo arreglado es justo lo que no
   se reconstruye leyendo el código.

Después vuelve al **Paso 2** con la ronda incrementada.

### El tope de 3 rondas

Agotadas las 3 sin verde, **para y presenta**. No arranques una cuarta. Una
falla que sobrevive tres rondas casi nunca es un bug: es un criterio ambiguo en
`requirements.md` o un componente sin frontera en `design.md`, y eso se arregla
en el documento, con su gate, no acá. Di en qué ronda se estancó y qué cambió
entre ellas.

## Cierre

Con el reporte en verde, presenta en esta conversación —sin volcar los
archivos— y **detente**:

1. La ruta del plan, la de los scripts y la del reporte.
2. Los tres casos con su resultado y los criterios `R#.#` que cubren.
3. Cuántas rondas hizo falta y **qué se arregló en cada una**: esto es lo único
   del loop que no queda escrito en ningún lado si no lo dices.
4. Lo que el loop **no** cubre: los tres casos son un muestreo de usuario, no la
   trazabilidad completa de `tasks.md` §5.
5. La pregunta directa: **¿commiteo?** El commit es del usuario, igual que los
   gates del resto del proceso.

## Guardarraíles

- **Una feature a la vez.** El loop corre sobre un spec; si al arreglar
  descubres un defecto de otro, lo reportas y no lo tocas.
- **No inventes criterios.** Un E2E solo puede fallar contra algo que
  `requirements.md` fija. Si el healer señala un comportamiento que ningún
  criterio cubre, es alcance nuevo: va a `/specify`, no a tu arreglo.
- **No relajes el test para que pase.** Bajar una aserción hasta que el rojo se
  vaya convierte el loop en un generador de verde. Si un test hay que
  suavizarlo, el veredicto era `falla-de-test` y lo justifica el healer, no tú.
- **D6 de este spec dice que la UI no lleva pruebas automatizadas.** Este loop
  agrega una capa E2E por encima de esa decisión, no la deroga: el nivel
  unitario sigue viviendo fuera de `web/`. Si el arreglo te empuja a mover
  lógica a la UI, es señal de lo contrario.
- El loop **verifica**; no planea tareas ni escribe specs. Los huecos de
  requisitos o de diseño se reportan y pertenecen a `/specify`.
