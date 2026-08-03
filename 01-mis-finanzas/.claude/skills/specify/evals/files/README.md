# Fixtures de entrada de las evals

Estos archivos son **insumo**, no salida esperada: representan specs que ya
existían antes de que arranque el caso. Son deliberadamente documentos válidos y
aprobados, sin marcas de "esto es un fixture", porque el agente tiene que
tratarlos como trataría a un spec real del repo.

| Carpeta | La usa | Qué representa |
|---|---|---|
| `presupuesto-aprobado/` | eval 4, eval 5 | `requirements.md` + `design.md` cerrados en sus gates, sin plan de tareas todavía |
| `presupuesto-en-curso/` | eval 5 | el `tasks.md` de ese mismo spec, con T1 y T2 ya `Hecha` y bitácora escrita |

Las dos carpetas describen **la misma feature** y los identificadores coinciden:
`presupuesto-en-curso/tasks.md` cita los `R#.#` y `BR#` de
`presupuesto-aprobado/requirements.md` y los casos de prueba de su `design.md`.
La eval 5 monta las tres piezas en una sola carpeta de spec — por eso lista los
tres archivos en su campo `files`.

## Las trampas están puestas a propósito

Los fixtures no son neutros. Cada uno lleva sembrado lo que el caso quiere medir,
y conviene saberlo antes de "arreglarlos":

- **`BR1`, `BR2` y `BR3` son criterios exigibles sin subnumeración.** Se leen como
  contexto y es donde más fácil queda un criterio sin tarea. La cobertura de la
  eval 4 se mide sobre los nueve, no sobre los seis `R#.#`.
- **`R2.1` y `R2.2` están pegados y son el mismo tema** (superar el presupuesto
  contra igualarlo exacto). Invitan a una sola tarea que se coma el borde.
- **El modelo de datos de `design.md` §5 invita a una tarea "crear los tipos"**,
  que no es una tarea: no termina en nada verificable.
- **`R2.3` es el caso degenerado** (categoría sin presupuesto) y es el que se
  cuela sin tarea propia.
- **En `presupuesto-en-curso/tasks.md`, `T2` está `Hecha` y su bitácora tiene
  `T2-D1`.** La eval 5 cambia justamente el comportamiento de `T2`: lo correcto es
  agregar una tarea nueva, y lo tentador es editar el plan de `T2` o borrarla.
- **`T2-D1` (normalizar la categoría) sigue condicionando al cambio de la eval 5**,
  porque sobreescribir también necesita encontrar el par. Es la decisión de
  construcción que hay que citar y no volver a tomar distinto.
- **El rechazo del duplicado vive en tres lugares de `design.md`** (§6, el caso de
  prueba de §7, y la justificación de `D1` en §9). Re-sincronizar uno solo deja el
  documento contradiciéndose.
