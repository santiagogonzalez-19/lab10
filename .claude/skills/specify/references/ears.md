# EARS — Easy Approach to Requirements Syntax

Referencia para redactar los criterios de aceptación de `requirements.md`.

**Contenido**

- [Por qué EARS](#por-qué-ears)
- [Los cinco patrones](#los-cinco-patrones)
- [Cómo elegir el patrón](#cómo-elegir-el-patrón)
- [Errores frecuentes](#errores-frecuentes)
- [Comportamiento protegido (regresión)](#comportamiento-protegido-regresión)

---

## Por qué EARS

EARS es una plantilla de frase, no un lenguaje formal. Su valor está en que fuerza tres cosas que la prosa libre deja escapar:

1. **El disparador explícito.** Si no puedes nombrar la condición que activa el comportamiento, no entendiste el requisito.
2. **Un solo sujeto y un solo verbo de obligación.** `THE SYSTEM SHALL` deja claro quién es responsable, y `SHALL` marca que es obligatorio (a diferencia de "debería" o "puede", que abren discusión).
3. **Verificabilidad.** La frase resultante se traduce casi mecánicamente a un test: la condición es el `arrange/act`, el comportamiento es el `assert`.

En español conviene mantener las palabras clave en inglés y en mayúsculas — funcionan como marcadores estructurales y hacen visible de un golpe si el requisito tiene forma verificable.

---

## Los cinco patrones

### 1. Ubicuo — siempre activo

Sin condición: el sistema lo cumple en todo momento.

```
THE SYSTEM SHALL <comportamiento>
```

> THE SYSTEM SHALL almacenar todos los montos como enteros en centavos.

Úsalo para invariantes y propiedades globales. Si te descubres escribiendo muchos requisitos ubicuos, probablemente pertenecen a la sección de reglas de negocio (`BR#`), no a los criterios de aceptación.

### 2. Dirigido por evento — el caso más común

```
WHEN <evento o condición> THE SYSTEM SHALL <comportamiento>
```

> WHEN el usuario confirma un nuevo gasto THE SYSTEM SHALL recalcular el total gastado de su categoría en el período.

El evento es algo que **ocurre en un instante**: una acción del usuario, la llegada de un mensaje, el cruce de un umbral.

### 3. Dirigido por estado — mientras algo se mantiene

```
WHILE <estado sostenido> THE SYSTEM SHALL <comportamiento>
```

> WHILE la categoría está marcada como archivada THE SYSTEM SHALL excluirla del selector de categorías al registrar un gasto.

La diferencia con `WHEN` no es cosmética: `WHEN` dispara una vez, `WHILE` describe una condición continua. Confundirlos produce tests que prueban lo contrario de lo que se quería.

### 4. Comportamiento no deseado — errores y casos inválidos

```
IF <condición no deseada> THEN THE SYSTEM SHALL <respuesta>
```

> IF el monto del presupuesto es negativo THEN THE SYSTEM SHALL rechazar la operación e informar que el monto debe ser mayor o igual a cero.

Reservado para lo que no debería pasar: entradas inválidas, fallas, violaciones de reglas. Separarlo de `WHEN` es útil porque hace fácil auditar si todos los caminos de error están definidos — y por eso el `design.md` los agrupa en la sección de manejo de errores.

### 5. Opcional — depende de una capacidad presente

```
WHERE <la feature o configuración está presente> THE SYSTEM SHALL <comportamiento>
```

> WHERE el usuario tiene notificaciones habilitadas THE SYSTEM SHALL enviar un aviso al superar el 90 % del presupuesto.

Para comportamiento que existe solo bajo cierta configuración, feature flag o variante de producto.

### Combinados

Los patrones se anidan cuando el comportamiento depende de estado **y** de evento:

```
WHILE <estado> WHEN <evento> THE SYSTEM SHALL <comportamiento>
```

> WHILE el mes en curso está cerrado WHEN el usuario intenta registrar un gasto con fecha de ese mes THE SYSTEM SHALL rechazar el registro e informar que el período está cerrado.

Úsalos con moderación: si necesitas tres cláusulas anidadas, casi siempre es más claro partirlo en dos criterios.

---

## Cómo elegir el patrón

| Si el comportamiento… | Patrón |
|---|---|
| vale siempre, sin disparador | Ubicuo |
| responde a algo que pasa en un instante | `WHEN` |
| vale mientras una condición se mantiene | `WHILE` |
| responde a una entrada inválida o una falla | `IF … THEN` |
| existe solo con cierta configuración activa | `WHERE` |

---

## Errores frecuentes

**Describir la implementación en vez del comportamiento.** El requisito dice lo que el usuario puede observar; la tabla, el índice y el nombre de la función son decisiones del diseño. Si el criterio nombra una tabla, ya eligió arquitectura antes de diseñarla.

```
✗ WHEN el usuario crea un presupuesto THE SYSTEM SHALL insertar una fila en budgets.
✓ WHEN el usuario crea un presupuesto para una categoría y período sin presupuesto
  THE SYSTEM SHALL registrarlo y devolverlo con su monto y período.
```

**Dos comportamientos en un criterio.** Si el "y" une dos efectos que se pueden verificar por separado, son dos criterios — de lo contrario un test que falla no dice cuál de los dos se rompió. La excepción es una acción con su respuesta al usuario ("rechazar la operación e informar el motivo"): eso es un solo resultado observable, y partirlo solo duplica documento. Criterio para decidir: *¿podrían pasar uno y fallar el otro?*

**Adverbios sin número.** "rápidamente", "adecuadamente", "de forma correcta", "de manera eficiente": no tienen test. O les pones un umbral medible y van a requisitos no funcionales, o desaparecen.

**Dejar el límite ambiguo.** "supera el presupuesto" no dice si el caso de igualdad exacta cuenta. Escribe un criterio adicional que fije el borde; es el bug clásico de `>` contra `>=`.

**Olvidar el caso degenerado.** Sin datos, con cero, con el registro duplicado, con la referencia ausente. En una app de finanzas: categoría sin presupuesto definido, mes sin movimientos, monto cero. Cada uno merece su propio criterio, normalmente en forma `IF … THEN`.

**Usar "debería" o "podría".** `SHALL` significa obligatorio y verificable. Si algo es opcional, o no es un requisito, o es un `WHERE`.

---

## Comportamiento protegido (regresión)

Cuando la feature toca algo que ya funciona, declara explícitamente qué **no** debe cambiar:

```
WHEN <condición existente> THEN THE SYSTEM SHALL CONTINUE TO <comportamiento actual>
```

> WHEN el usuario elimina una categoría THEN THE SYSTEM SHALL CONTINUE TO conservar los gastos históricos asociados a ella.

Estos criterios se convierten en tests de regresión, así que descríbelos de forma literal: son la red que evita que el spec nuevo rompa el comportamiento viejo, y solo funcionan si son lo bastante concretos para escribirlos como prueba sin volver a preguntar.
