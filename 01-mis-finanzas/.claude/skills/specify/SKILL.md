---
name: specify
description: 'Proceso de especificación Requirements-First (estilo Kiro) que produce requirements.md con notación EARS, luego design.md y finalmente tasks.md, con un gate de aprobación humana entre fases. Usa este skill SIEMPRE que se vaya a definir, especificar, diseñar o planear una feature antes de implementarla — incluso si el usuario no dice la palabra "spec": frases como "quiero agregar X", "necesito que la app haga Y", "hagamos el spec de", "escribe los requisitos de", "documenta el diseño de", "cómo deberíamos construir Z", o cuando pida implementar algo no trivial y no exista aún un spec en docs/specs/. Úsalo también para refinar o corregir un spec existente, y SIEMPRE al terminar un /brainstorming cuyo diseño quedó aprobado: este skill es el paso que convierte ese diseño en documentos. Cubre requirements.md, design.md y tasks.md — escribir el código queda fuera de alcance.'
---

# specify — Requirements-First

Convierte una idea difusa en tres documentos aprobados: **qué debe hacer el sistema** (`requirements.md`), **cómo se va a construir** (`design.md`) y **en qué orden se construye, con registro de lo que se decidió al construirlo** (`tasks.md`).

El orden importa. Requirements-First significa que primero se fija el comportamiento observable y solo después se decide la arquitectura, de modo que el diseño se adapte a la necesidad y no al revés. Si el usuario ya llega con una arquitectura impuesta o con restricciones técnicas duras, dilo: ese caso pide un flujo Design-First, que este skill no cubre; se puede seguir igual, pero con la advertencia de que los requisitos van a quedar teñidos por la solución.

## Alcance

| Sí | No |
|---|---|
| `requirements.md` en notación EARS | Escribir código o tests |
| `design.md` con arquitectura y estrategia de pruebas | Ejecutar las tareas del plan |
| `tasks.md`: plan de implementación y bitácora de decisiones | Estimaciones de tiempo, tickets, roadmap |
| Preguntas de clarificación antes de escribir | Decidir prioridades de producto |
| Refinar un spec existente | |

Cuando termines el plan de tareas y esté aprobado, **detente y dilo**. La tentación de seguir hasta el código es fuerte, y es máxima justo ahí: una lista de tareas se lee como una invitación a empezar por la primera. Pero el valor de este proceso está en el corte, y escribir el plan y ejecutarlo en el mismo turno anula el último gate — el usuario revisa el plan completo antes de que exista una sola línea que le cueste tirar.

## Proporcionalidad: el spec cubre lo que se pidió

El fallo más común de este proceso no es quedarse corto, es inflarse. Un pedido de dos capacidades se convierte en cinco requisitos con treinta criterios porque cada agregado parece razonable por separado: si hay que crear un presupuesto, seguro también hay que editarlo, borrarlo, consultarlo. El resultado es un documento que el usuario aprueba por encima sin leerlo, y un gate que deja de proteger — que es justamente lo único que este proceso tenía para ofrecer.

La regla: **el spec cubre las capacidades que el usuario pidió, más sus bordes y casos degenerados.** Nada más.

Lo que se te ocurra y no esté pedido tiene dos destinos legítimos, y ninguno de los dos es "requisito":

- **Fuera de alcance**, si estás razonablemente seguro de que no entra ahora. Nombrarlo ahí tiene valor: demuestra que lo consideraste y no que lo olvidaste.
- **Pregunta abierta**, si de verdad no sabes si el usuario lo quiere.

La diferencia no es cosmética. Un requisito es un compromiso que alguien va a implementar y testear; una pregunta abierta es una invitación a decidir. Comprometer trabajo que nadie pidió es la forma más cara de equivocarse, porque se paga en implementación.

Los **casos degenerados sí van como requisitos** aunque nadie los mencione: el borde exacto, el cero, el vacío, el duplicado, la referencia ausente. No son alcance nuevo — son la definición precisa de lo que ya se pidió, y son donde viven los bugs. Un criterio que fija si el límite es `>` o `>=` vale más que tres requisitos inventados.

**Cuidado al recortar: un borde no se recorta, se degrada.** Recortar alcance está bien; degradar un borde a "nota de diseño" no. Si al ajustar el tamaño del documento mueves un caso límite desde los criterios de aceptación hacia la sección de decisiones de diseño, o hacia un riesgo, lo dejaste sin proteger: la sección de decisiones no genera tests, y este proceso vende la tabla de casos de prueba como la lista de pruebas rojas del TDD. Una decisión de diseño sin caso de prueba no protege nada. Si el borde importa, va como criterio numerado **y** como fila en la estrategia de pruebas; si de verdad no importa, va a fuera de alcance nombrado, no escondido en una decisión técnica.

**Los bordes del formato del insumo son criterios, no detalles de implementación.** Cuando la feature consume algo que viene de afuera —un archivo, una exportación de otro sistema, texto pegado por el usuario— el formato trae bordes propios que rompen el caso feliz sin que nadie los mencione, y son los que más caro salen porque fallan en silencio sobre entradas perfectamente válidas. Enumérarlos explícitamente y dales criterio: finales de línea (`\n` contra `\r\n`), la última línea vacía y las líneas en blanco intermedias, marcas de codificación como el BOM, entrecomillado y escapes, el separador apareciendo dentro de un valor, y los formatos numéricos (separador de miles, decimales, signo). Un importador de CSV se rompe con esos antes que con cualquiera de las capacidades que el spec sí especifica.

**Los requisitos no funcionales son el escondite favorito del alcance inventado.** Un umbral necesita un número para ser verificable, y de ahí a inventarlo hay un paso: "importar 10.000 filas en menos de 2 segundos" suena a rigor, pero si el usuario nunca dijo cuántas filas ni cuánto tiempo tolera, ese número es alcance que te inventaste — y es peor que un requisito funcional de más, porque se propaga a un caso de prueba obligatorio y a una fila de trazabilidad, y termina condicionando decisiones de arquitectura para sostener una cifra que nadie pidió. Un umbral solo entra como requisito si el usuario lo dio o si se deduce de una restricción real del dominio. Si te parece que hace falta, es una **pregunta abierta** ("¿de qué tamaño son tus extractos?") o un **supuesto** explícito, no un requisito.

Antes de cerrar la Fase 1, recorre tus requisitos —funcionales y no funcionales— y pregúntate por cada uno: *¿esto lo pidió, o lo agregué yo?* Si lo agregaste, muévelo a fuera de alcance o a preguntas abiertas. Y si el documento terminó abarcando bastante más de lo pedido, dilo en el mensaje del gate en vez de dejar que el usuario lo descubra leyendo: en un proyecto con la regla de una feature a la vez, proponer partirlo en dos specs suele ser la respuesta correcta.

## Ubicación de los archivos

```
docs/specs/<YYYY-MM-DD>-<slug-de-la-feature>/
├── requirements.md
├── design.md
└── tasks.md
```

Obtén la fecha real con `date +%F` — no la adivines ni la deduzcas del contexto. El slug va en kebab-case y describe la feature, no la tarea (`presupuesto-mensual`, no `agregar-presupuestos`).

Si ya existe una carpeta para esa misma feature, **trabaja dentro de ella** en vez de crear una nueva con la fecha de hoy: un spec es un documento vivo, y partirlo en dos carpetas rompe la trazabilidad.

## Idioma

Prosa, títulos y secciones **en español**. Las palabras clave EARS se mantienen **en inglés** (`WHEN`, `THE SYSTEM SHALL`, `IF`, `THEN`, `WHILE`, `WHERE`) porque son notación, no texto: en mayúsculas y en inglés se leen como estructura formal y hacen visible de un golpe si un requisito es verificable o no.

## El flujo

### Fase 0 — Entender antes de escribir

Antes de tocar un archivo, revisa el `CLAUDE.md` del proyecto (stack, comandos de verificación, reglas) y, si hay código, los módulos que la feature va a tocar. Un spec que ignora las convenciones del repo genera diseño inaplicable.

**Si vienes de un brainstorming**, ese diseño acordado es tu insumo: úsalo. Recorre lo que ya quedó decidido en la conversación —alcance, enfoque elegido, componentes, casos borde discutidos— y **no vuelvas a preguntarlo**. Volver a preguntar lo que el usuario ya contestó es la forma más rápida de que abandone el proceso. Lo que sí corresponde es señalar los huecos que el brainstorming no cerró; suelen ser los bordes numéricos y los casos degenerados, porque en la conversación se habla del caso feliz.

Después evalúa si tienes lo necesario. La señal de que **no** lo tienes es que puedas imaginar dos implementaciones razonables que satisfagan lo pedido y sirvan a usuarios distintos. Cuando eso pasa, pregunta — de 2 a 4 preguntas concretas, con opciones y una recomendación, no un cuestionario abierto. Las áreas que más suelen faltar:

- **Los límites**: qué queda explícitamente fuera de esta feature.
- **El caso degenerado**: qué pasa cuando no hay datos, el dato es cero, o llega duplicado.
- **La unidad de verdad**: períodos, zonas horarias, monedas, redondeo. En una app de finanzas esto no es un detalle, es el requisito.
- **El actor**: ¿quién dispara esto y desde dónde?

Si el usuario responde "decide tú", decide, y registra la decisión en la sección de supuestos. Un supuesto escrito se puede refutar; uno tácito se descubre en producción.

### Fase 1 — Escribir requirements.md

Usa `assets/requirements-template.md` como estructura. Léelo antes de escribir y respeta sus secciones: cada una existe para atrapar una clase distinta de ambigüedad.

Reglas que sostienen la calidad del documento:

**Cada criterio de aceptación es un test que aún no existe.** Escríbelo pensando en quién lo va a implementar en TDD: si no puedes imaginar el `expect(...)`, el requisito está mal escrito. Consulta `references/ears.md` para los cinco patrones EARS y cuándo usar cada uno.

**Numera todo de forma estable** (`R1`, `R2`, …, y los criterios como `R1.1`, `R1.2`). El diseño, los tests y las conversaciones futuras van a citar esos números; renumerar después rompe todas las referencias.

**Un requisito, un comportamiento.** Si un criterio une con "y" dos efectos que se pueden verificar por separado, son dos criterios: un test que falla debe decir sin ambigüedad qué se rompió. Lo que **no** cuenta como dos es una acción junto con su respuesta al usuario —"rechazar la operación e informar el motivo", "registrar el gasto y devolver el aviso"— porque ahí el mensaje es parte del mismo resultado observable y separarlos solo duplica documento. La pregunta que resuelve la duda: *¿podrían pasar uno y fallar el otro?* Si no, es un criterio.

**Habla de comportamiento observable, no de mecanismo.** El requisito describe lo que el usuario puede ver o medir; la tabla, el índice y la función son del diseño.

Comparación:

```
✗ WHEN el usuario crea un presupuesto THE SYSTEM SHALL insertar una fila
  en la tabla budgets con un UUID v4 como clave primaria.
   → habla de la implementación, y elige la tabla antes de diseñarla.

✗ El sistema debe manejar los presupuestos correctamente.
   → no es verificable: "correctamente" no tiene test.

✓ WHEN el usuario crea un presupuesto para una categoría y un mes que ya
  tienen presupuesto THE SYSTEM SHALL rechazar la operación e informar
  que ya existe un presupuesto para ese período.
   → un solo comportamiento, observable, con un test evidente.
```

**Protege lo que ya funciona — pero solo si existe.** Si la feature toca comportamiento existente, escribe explícitamente lo que no debe cambiar con `WHEN <condición> THEN THE SYSTEM SHALL CONTINUE TO <comportamiento>`. Esos son los requisitos que se convierten en tests de regresión.

La condición es literal: **solo escribe uno de estos si leíste el código que lo implementa.** Un requisito de regresión sobre comportamiento que no existe es peor que no escribirlo, porque encarga un test de algo que nadie construyó. En un proyecto sin código todavía, esta sección se borra — no hay nada que proteger, y decirlo en el gate es más útil que rellenarla.

**El presente indicativo es una afirmación de hecho, en todo el documento.** Esta regla no vive solo en la sección de regresión: aplica a cada frase del spec, y el lugar donde más se cuela es la sección de contexto, porque describir el estado actual invita a narrar. Si escribes "hoy la app categoriza gastos" o "el usuario puede ver su gasto del mes", estás afirmando que ese código existe, y quien implemente lo va a leer como "esto ya está, lo integro". Si no lo verificaste en el repo, escríbelo en futuro o condicional ("la app va a categorizar…", "una vez que exista el registro de gastos…"), o no lo escribas.

Antes de cerrar, hazte esta pregunta concreta: *¿alguna frase de este documento afirma que algo ya funciona?* Si el repo está vacío, la respuesta correcta es ninguna. Vale la pena revisarlo aparte porque es un error que sobrevive incluso cuando el resto del spec sabe la verdad: un documento puede decir en sus supuestos "el repo todavía no tiene código" y tres párrafos antes haber descrito la app en presente. Esa contradicción es invisible para quien lee de corrido.

**Repasa antes de entregar.** Relee el documento buscando cinco cosas: alcance que agregaste tú y nadie pidió, contradicciones entre requisitos, ambigüedades (adverbios como "rápido", "adecuado", "correcto"), restricciones en conflicto, y huecos — sobre todo caminos de error sin definir. Es más barato encontrarlos aquí que en el diseño. Si algo queda sin resolver, va a "Preguntas abiertas", no a una suposición silenciosa.

### Gate 1 — Aprobación de requisitos

Escribe el archivo, y **detente**. No empieces el diseño en el mismo turno.

Presenta al usuario:
1. La ruta del archivo.
2. Los requisitos en una lista de una línea cada uno (`R1 — Crear presupuesto mensual por categoría`), para que pueda revisar el alcance sin abrir el documento.
3. Las decisiones que tomaste por él y los supuestos que asumiste.
4. **Qué dejaste fuera y qué agregaste.** Si algún requisito no sale directamente de lo que pidió, sepáralo y decilo: "esto lo agregué yo, ¿lo querés dentro?". Es información que el usuario no puede recuperar leyendo el documento, porque ahí todo tiene el mismo aspecto de requisito aprobado.
5. Las preguntas abiertas que quedan.
6. Una pregunta directa: ¿lo apruebo y paso al diseño, o hay algo que ajustar?

El gate no es burocracia: un requisito equivocado que pasa a diseño se multiplica en decisiones de arquitectura equivocadas. Es el punto más barato del proceso para cambiar de opinión.

### Fase 2 — Escribir design.md

Solo después de la aprobación explícita. Usa `assets/design-template.md`.

El diseño responde **cómo** se cumple cada requisito aprobado, y su prueba de completitud es la **tabla de trazabilidad**: cada criterio de aceptación debe aparecer mapeado a un componente y a un test. Llénala al final y úsala como checklist — una fila vacía significa un requisito que el diseño no cubre, y es exactamente el hueco que aparecería a mitad de la implementación.

Ancla el diseño en el stack real del proyecto (lenguaje, runner de tests, convenciones del `CLAUDE.md`). No introduzcas dependencias nuevas sin justificarlas en la sección de decisiones, y si el proyecto tiene una regla contra ello, respétala: proponer una librería es una decisión de diseño que el usuario debe poder vetar.

La sección de **estrategia de pruebas** merece cuidado especial si el equipo trabaja en TDD, porque es lo que se convierte en la primera prueba roja. Nombra los casos concretos, no la política general: `presupuesto duplicado en el mismo mes → rechaza`, no "cubrir casos borde".

**Revisa la consistencia interna antes del gate.** Un diseño largo se contradice consigo mismo sin que se note, y el lector lo descubre implementando. Tres cruces que hay que hacer a mano porque ninguna herramienta los ve:

1. **Una definición, un lugar — y el resto son referencias.** Si una función, una transformación o un caso límite aparece descrito en más de un sitio (el glosario de los requisitos y dos secciones del diseño, por ejemplo), no basta con que "digan lo mismo": reescribir una definición es garantizarse que las dos versiones se separen. Elige el lugar donde vive y desde los otros **apunta** a él. Cuando una decisión se justifica apoyándose en lo que hace otra pieza ("uso este separador porque la normalización elimina las barras"), ve a leer esa otra pieza y confirma que efectivamente lo hace.

   Esto falla de una forma concreta que vale reconocer: dos definiciones que difieren en un detalle aparentemente menor —una hace `trim` y la otra solo colapsa espacios— hacen que el destino de una entrada real dependa de cuál de las dos lea quien implemente, y ningún criterio decide. Si al revisar encuentras la misma cosa definida dos veces, eso ya es el defecto, aunque hoy coincidan.
2. **Todo campo opcional tiene un criterio.** Si el modelo de datos declara algo opcional o con valor por defecto, algún criterio de aceptación debe definir qué pasa cuando falta. Un opcional sin criterio es una decisión que alguien va a tomar improvisando.
3. **Cada etiqueta de la tabla de trazabilidad resuelve a algo real.** La columna de casos de prueba debe apuntar a casos que existan en la sección de estrategia de pruebas, no a texto plausible. Es la trampa más fácil de caer: la tabla se ve completa y no lo está.

### Gate 2 — Aprobación de diseño

Presenta la ruta, un resumen de las decisiones de arquitectura con su alternativa descartada, la tabla de trazabilidad, y los riesgos. Luego cierra: el diseño está aprobado, y pregunta si pasas a escribir el plan de tareas.

### Fase 3 — Escribir tasks.md

Solo después de aprobar el diseño. Usa `assets/tasks-template.md`.

**Las tareas no se inventan: se derivan.** El insumo es la tabla de estrategia de pruebas del diseño (§7) junto con la de trazabilidad (§8), que ya son la lista de pruebas rojas del TDD. Escribir la lista de tareas es agruparlas en unidades ejecutables y ponerlas en orden — no es una ronda nueva de pensar qué hace la feature. Si al escribir una tarea necesitas inventar comportamiento que ningún criterio fija, no encontraste una tarea: encontraste un hueco en el diseño, y se resuelve volviendo atrás, no rellenándolo acá. Y una tarea que no cita ningún `R#.#` sobra, salvo las de andamiaje que el propio diseño pide.

**Una tarea es un ciclo rojo → verde → refactor**, del tamaño de un commit. La granularidad falla en las dos direcciones y conviene reconocer las dos:

- *Demasiado grande*: si el "Hecho cuando" necesita más de tres o cuatro checks, o si toca capas verificables por separado, son dos tareas.
- *Demasiado chica*: una tarea que no termina en algo verificable —"crear los tipos", "agregar el archivo"— deja su verificación para otra tarea y con eso rompe el ciclo. Si el paso no da para test propio, es parte de la tarea que sí lo tiene.

Tampoco es una tarea por archivo, ni una tarea "escribir los tests" separada de la que implementa: en TDD el test y el código del mismo comportamiento son el mismo ciclo, y partirlos convierte el plan en una invitación a escribir el test después.

**El orden lo mandan las dependencias reales**, y entre tareas independientes, la que deje algo demostrable antes. Sin estimaciones de tiempo: este documento dice qué falta y en qué orden, no cuánto tarda.

**Cobertura, en los dos sentidos.** Cada criterio de aceptación —los `R#.#`, las `BR#` y los `REG#` si existen— tiene que aparecer en al menos una tarea, y eso se verifica con la tabla de trazabilidad criterio → tarea. Es el mismo tipo de chequeo que cierra la Fase 2, pero atrapa un error distinto: el diseño puede cubrir un criterio en una sección y aun así nadie encargarse de construirlo.

**El documento tiene dos autores y dos momentos, y de eso depende que sirva.** La Fase 3 escribe el plan; quien implementa escribe la bitácora, tarea por tarea. Por eso el bloque `Plan` de cada tarea es inmutable y la bitácora es append-only: si al terminar se edita el plan para que describa lo que realmente se hizo, el documento queda perfectamente coherente y pierde lo único que no se puede reconstruir del código —que el plan decía A y la implementación hizo B, y por qué—. Un plan retocado es indistinguible de un plan que salió bien.

Deja esas reglas escritas **dentro** del archivo (§1 de la plantilla), no solo en el mensaje del gate. Quien va a llenar la bitácora puede no ser quien leyó este skill.

**Las decisiones de construcción necesitan un índice, no solo una bitácora.** Una decisión anotada dentro de la tarea que la tomó está en el lugar correcto para entenderla y en el peor lugar para encontrarla: quien más la necesita es quien arranca una tarea posterior, y no sabe que existe, así que no la busca. Ese es el camino por el que una feature termina con dos definiciones incompatibles de la misma cosa —el defecto que la Fase 2 revisa a mano en el diseño— pero introducido durante la implementación, cuando ya no hay gate que lo atrape. Por eso la plantilla tiene un registro de decisiones (§6) que es un índice de punteros, y por eso cada tarea declara en su plan las decisiones previas que la condicionan.

Esa fila de "decisiones que la condicionan" es la única excepción a la inmutabilidad del plan, y es deliberada: en la Fase 3 no puedes saber qué va a decidir la tarea de más adelante. Anotar un ID no reescribe el plan.

Las tres tablas del documento no se solapan, y conviene tenerlo claro al escribirlo: la trazabilidad (§5) dice **qué falta cubrir**, el registro de decisiones (§6) dice **por qué algo quedó así**, y los desvíos (§7) dicen **dónde el diseño dejó de describir la realidad**.

### Gate 3 — Aprobación del plan

Escribe el archivo y **detente**. No empieces la primera tarea en el mismo turno, aunque la tarea sea trivial y el test evidente.

Presenta al usuario:

1. La ruta del archivo.
2. Las tareas en una línea cada una, con los criterios que cubre (`T3 — Rechazar presupuesto duplicado (R1.2, BR2)`), para que pueda revisar el plan sin abrir el documento.
3. El orden y qué lo obliga: cuáles son dependencias técnicas y cuáles elegiste tú.
4. Los criterios que quedaron sin tarea. Debería ser ninguno; si hay alguno, eso es lo primero que hay que discutir.
5. Lo que decidiste **no** convertir en tarea aunque estuviera cerca, y por qué.
6. Una pregunta directa: ¿arranco por la primera tarea, o hay algo que reordenar?

Las bitácoras, el registro de decisiones (§6) y los desvíos (§7) quedan **vacíos** en este punto, y eso es correcto, no un documento a medio hacer: son las tres secciones que solo puede llenar la implementación. Dilo al presentar, porque un archivo con tres tablas vacías se lee como trabajo pendiente y alguien va a querer rellenarlas con conjeturas — y una decisión conjeturada antes de tomarla es peor que ninguna, porque parece un registro.

Cierra diciendo qué pasa después: la implementación es un paso aparte, y la bitácora de cada tarea se llena mientras se ejecuta, no al final. Una bitácora escrita al cierre es una reconstrucción, y las reconstrucciones se acuerdan de las decisiones que salieron bien.

## Refinar un spec existente

Si el usuario cambia los requisitos de un spec ya escrito, edita `requirements.md` y después **re-sincroniza `design.md` y `tasks.md`** en la misma sesión — un diseño que ya no corresponde a sus requisitos es peor que no tener diseño, porque parece confiable, y un plan desactualizado es peor todavía, porque alguien lo va a ejecutar. Revisa las dos tablas de trazabilidad para encontrar qué filas quedaron huérfanas o sin cubrir.

**`tasks.md` se re-sincroniza distinto que los otros dos**, porque puede tener trabajo ya hecho y bitácora escrita, y eso es historia: no se reescribe. Las reglas al ajustarlo son las mismas que rigen el documento —agregar, nunca reescribir—:

- Criterio nuevo → tarea nueva al final, con el siguiente número libre.
- Tarea `Pendiente` que ya no aplica → pasa a `Descartada` con el motivo en su bitácora. No se borra: una tarea borrada se lleva consigo la explicación de por qué existía.
- Tarea `Hecha` cuyo comportamiento cambió → tarea nueva que hace el cambio, citando la anterior. La original queda `Hecha`, porque lo estuvo.

Si al terminar hay que corregir una entrada de bitácora para que el documento cuadre, algo se hizo mal: la bitácora describe lo que pasó, y lo que pasó no cambia porque cambien los requisitos.

Si el cambio es al revés (el diseño resultó inviable y hay que aflojar un requisito), dilo explícitamente y pide confirmación antes de reescribir el requisito: eso es un cambio de alcance, no un detalle técnico.

## Modo rápido

Si el usuario pide explícitamente ir sin pausas ("hazlo de corrido", "sin gates", "quick spec"), escribe los tres archivos y preséntalos juntos al final. Sigue vigente el resto: EARS, plantillas, las dos trazabilidades. Vale para features bien entendidas; si detectas ambigüedad de fondo, pregunta de todos modos — el usuario pidió velocidad, no adivinanza.

Lo que el modo rápido no cambia es el corte del final: el spec termina en el plan de tareas aprobado. "Sin gates" significa sin las paradas intermedias, no que la implementación entre en el mismo turno.

## Recursos

- `assets/requirements-template.md` — estructura de `requirements.md`. Léelo antes de la Fase 1.
- `assets/design-template.md` — estructura de `design.md`. Léelo antes de la Fase 2.
- `assets/tasks-template.md` — estructura de `tasks.md`, incluidas las reglas de la bitácora que quedan dentro del documento. Léelo antes de la Fase 3.
- `references/ears.md` — los cinco patrones EARS, cuándo usar cada uno y errores frecuentes. Consúltalo al redactar criterios de aceptación, sobre todo si un comportamiento no encaja limpio en `WHEN … SHALL`.
