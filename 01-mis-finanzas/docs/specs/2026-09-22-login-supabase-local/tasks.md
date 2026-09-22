# Tareas — Login contra Supabase local

| | |
|---|---|
| **Requisitos** | [requirements.md](./requirements.md) |
| **Diseño** | [design.md](./design.md) |
| **Estado del plan** | Aprobado |
| **Última actualización** | 2026-09-22 |

## 1. Cómo se mantiene este documento

- **El bloque `Plan` de cada tarea es inmutable.** Se escribe una vez y no se reescribe. Si la implementación terminó haciendo algo distinto, eso va a la bitácora como desvío — no se edita el plan para que coincida.
- **La bitácora es append-only.** Entrada nueva abajo, con fecha real (`date +%F`). Las entradas anteriores no se corrigen ni se borran, aunque hayan quedado equivocadas: una bitácora reescrita no sirve como registro.
- **El trabajo nuevo entra como tarea nueva**, al final y con el siguiente número libre. No se renumeran las tareas existentes ni se cuelan pasos dentro de una tarea ya cerrada.
- **Lo único que se edita de una tarea es su estado.**
- **Antes de empezar una tarea, lee el registro de decisiones (§6).** Es la sección que evita el peor defecto de este formato: una decisión tomada en T3 que quien arranca T7 no sabe que existe, y vuelve a decidir distinto.

> Por qué tanta ceremonia: el valor de este archivo no es la lista de pendientes —eso lo da cualquier checklist— sino poder responder después *por qué esto quedó así*. Esa respuesta solo existe si el plan y lo que realmente pasó se pueden leer uno al lado del otro.

## 2. Estados

| Estado | Significado |
|---|---|
| `Pendiente` | No empezada. |
| `En curso` | Hay un test rojo escrito. |
| `Hecha` | Test verde, refactor hecho, verificación del proyecto en verde. |
| `Bloqueada` | Necesita una decisión o algo externo. El motivo va en la bitácora. |
| `Descartada` | Ya no se hace. El motivo va en la bitácora; la tarea NO se borra. |

## 3. Orden de ejecución

| # | Tarea | Depende de |
|---|---|---|
| T1 | Preparar Supabase local y la configuración del proyecto | — |
| T2 | Traducir los fallos de GoTrue a un código y a su mensaje | — |
| T3 | Emitir el intento y devolver un resultado que no transporta la sesión | T1, T2 |
| T4 | Dar modo al estado del panel | T3 |
| T5 | Envío y mensaje de servidor en el estado del panel | T2, T3, T4 |
| T8 | Guarda de re-entrada: bloquear un segundo intento mientras el primero está en vuelo | T4, T5 |
| T6 | Pintar el modo del panel en el DOM | T4, T8 |
| T9 | Conectar el envío del panel con Supabase | T3, T5, T8, T6 |
| T7 | Repuntar el recorrido E2E existente y el arranque de la suite | T9 |

**Qué obliga el orden.** T3 necesita el tipo `CodigoAuth` de T2 y el `vite-env.d.ts` de T1 — técnica. T4 necesita el tipo `ModoAuth` de `autenticar.ts` (T3), porque `design.md` §4 fija `ModoLogin = ModoAuth` — técnica. T5 necesita `mensajeDe` de T2, el tipo `ResultadoAuth` de T3 y el campo `modo` de T4 — técnica. T8 necesita `alternarModo` (T4) y los campos `enviando`/`mensaje` (T5) para poder bloquear sobre ellos — técnica —, y es quien renombra `puedeEntrar` a `puedeEnviar`; eso no ata a T6 de forma técnica: T6 no toca la línea de `login.ts` que llama a `puedeEntrar` (`entrar.disabled = !puedeEntrar(estado)`), así que su rojo — el enlace del pie sin manejador — es verificable en verde exista o no el renombre. Va antes que T6 en esta tabla, pese a numerarse después, por conveniencia: así T6 edita `login.ts` una sola vez sobre el nombre final de esa llamada, en vez de dejar pendiente un segundo toque el día que T8 corra. T6 y T9 eran una sola tarea y se partieron: son dos rojos independientes y verificables hoy en el navegador — el enlace del pie sin manejador (T6, R3.1/R3.2) frente a la navegación a `#/perfil` sin consultar al servidor (T9, R1.1/R1.3/R2.1/R4.1/R5.4). T6 solo necesita `textosDe` y `alternarModo` (T4); no usa `puedeEnviar` en absoluto, pero queda después de T8 por la misma conveniencia de arriba. T9 necesita además `autenticar` (T3) y `enviar`/`responder` (T5) — técnica —, y edita el mismo `login.ts` que T6 ya modificó, así que va después para no pisar esa edición — conveniencia, no técnica, igual que la de T6 sobre T8. T7 solo tiene sentido cuando el acceso ya es real, es decir, después de T9.

**Qué elegí yo.** T2 no depende de nada y podría ir en cualquier lugar — lo puse antes de T3 porque lo desbloquea, y T3 es la pieza que primero deja algo demostrable (la aplicación hablando con Supabase). Y T1 va primera aunque T2 no la necesite, porque es la que resuelve el riesgo principal del diseño: sin la llave anónima, todo lo demás se prueba contra un servidor que no está.

## 4. Tareas

### T1 — Preparar Supabase local y la configuración del proyecto

**Estado:** `Hecha`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | NF1, NF3 |
| **Casos de prueba** | Ninguno unitario: es andamiaje. Se verifica contra el servicio vivo y el árbol versionado |
| **Componente** | `vite-env.d.ts`, Configuración local |
| **Archivos previstos** | `web/.env.example`, `web/.env.local` *(no versionado)*, `web/src/vite-env.d.ts`, `../.gitignore` *(raíz del repo git — `01-mis-finanzas/` no tiene uno propio)* |
| **Decisiones que la condicionan** | D5 (design.md): los tipos de `import.meta.env` se declaran a mano, no con `vite/client` |

*Hecho cuando:*

- [x] `supabase start` levanta y `GET http://127.0.0.1:54321/auth/v1/health` responde `200`; la llave anónima de esa corrida queda en `web/.env.local` — no en la raíz del proyecto, porque `vite.config.ts` fija `root: "web"` y Vite resuelve el `envDir` por defecto contra ese `root`
- [x] `web/.env.example` queda versionado con las mismas claves que `web/.env.local`, sin valores reales; `git check-ignore web/.env.local`, corrido desde la raíz del repo (un nivel arriba de `01-mis-finanzas/`), confirma que el `.gitignore` de esa raíz lo ignora
- [x] `web/src/vite-env.d.ts` declara exactamente las claves de `web/.env.example` (mismo nombre, mismo conteo) y `npm run typecheck` sigue en verde, sin dependencias nuevas en `package.json`

**Bitácora**

- **2026-09-22** — Docker estaba apagado; se levantó y `supabase start` corrió limpio. `auth/v1/health` responde `200`. GoTrue es **v2.196.0** — el dato importa porque D6 se escribió sin saber contra qué versión se iba a mapear.
- **2026-09-22** — Descubierto: esta versión del CLI imprime **dos** llaves utilizables, `ANON_KEY` (el JWT clásico) y `PUBLISHABLE_KEY` (`sb_publishable_…`). `design.md` asume una sola y la llama "llave anónima". Decisión **T1-D1**: se usa `ANON_KEY`. Alternativa: `PUBLISHABLE_KEY`, el formato nuevo. Criterio: `design.md` §4 nombra la variable `VITE_SUPABASE_ANON_KEY`, y el JWT es el que toda la documentación de GoTrue usa en el header `apikey`; cambiar al formato nuevo sería una decisión de diseño, no de implementación. Se comprobó que el JWT funciona contra los dos endpoints antes de fijarlo.
- **2026-09-22** — Desvío **DV1**: `design.md` §2 lista `.gitignore` como archivo **Nuevo**, y el Gate 1 afirmó que el repo no tenía uno. Es falso: existe en la raíz del repo git, un nivel arriba de `01-mis-finanzas/`, y ya ignora `node_modules/`, `test-results/` y los worktrees. El error vino de haberlo buscado desde `01-mis-finanzas/`. Se **agregaron** las reglas de `.env.local` al archivo existente en vez de crear uno nuevo. Registrado en §7; `design.md` no se corrige porque el componente "Configuración local" sigue siendo el mismo, solo cambia de `Nuevo` a `Ampliado`.
- **2026-09-22** — Sondeo del servidor vivo para T2, hecho acá porque el servicio recién levantado era la ocasión: se golpearon los ocho casos de error contra GoTrue y se guardaron las formas reales del cuerpo. El hallazgo que cambia T2 está anotado en su bitácora; adelantarlo evita que T2 escriba el mapeo a ciegas y lo descubra recién en el E2E.
- **2026-09-22** — Verde: `npm run typecheck` limpio en los dos proyectos y `npm test` en 176/176, los mismos que antes de empezar. `package.json` sin tocar (NF1).

### T2 — Traducir los fallos de GoTrue a un código y a su mensaje

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.2, R2.2, R2.3, R4.2, R4.3, R4.4, R4.7, BR5 |
| **Casos de prueba** | CP1, CP2, CP3, CP4, CP5, CP6, CP7, CP8, CP9, CP10 |
| **Componente** | `errores` |
| **Archivos previstos** | `web/src/auth/errores.ts`, `web/src/auth/errores.test.ts` |
| **Decisiones que la condicionan** | D6 (design.md): se leen `code`, `error_code` y `error`, con heurística de texto como último recurso antes de `desconocido` |

*Hecho cuando:*

- [ ] CP1–CP9 fallan primero porque `codigoDeRespuesta` no existe, y después devuelven el código esperado para las tres formas de cuerpo y para el cuerpo ilegible
- [ ] CP10 fija los seis mensajes exactos de `design.md` §6, carácter a carácter
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

### T3 — Emitir el intento y devolver un resultado que no transporta la sesión

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.1, R1.2, R1.3, R1.4, R2.1, R4.2, R4.3, NF2, NF3, BR1 |
| **Casos de prueba** | CP11, CP12, CP13, CP14, CP15, CP16, CP17 (ninguno exclusivo de `configuracion`: ver *Hecho cuando*) |
| **Componente** | `autenticar`, `configuracion` |
| **Archivos previstos** | `web/src/auth/configuracion.ts`, `web/src/auth/autenticar.ts`, `web/src/auth/autenticar.test.ts` |
| **Decisiones que la condicionan** | D1 (`fetch` plano, sin SDK), D2 (una sola función con `modo` como parámetro), D3 (la variante de éxito no lleva datos), D4 (`fetch` y configuración inyectados), D5 (`configuracion.ts` consume los tipos de `import.meta.env` declarados a mano en `vite-env.d.ts`, T1) |

*Hecho cuando:*

- [ ] CP11–CP17 fallan primero porque `autenticar` no existe; después CP11–CP13 fijan endpoint, método, cabeceras y cuerpo de los dos modos, con el correo recortado y la clave intacta
- [ ] CP14 comprueba que el resultado de éxito no tiene ninguna propiedad más que `ok` — BR1 sostenida por el tipo — y CP15 comprueba que una respuesta `400` con `invalid_credentials` se traduce a `{ ok: false, codigo: "invalid_credentials" }`
- [ ] CP16 y CP17 cubren el `fetch` que lanza y la configuración ausente, y ninguna prueba del archivo abre la red; `configuracion()` no tiene CP propio porque NF3 se verifica revisando el árbol versionado (`design.md` §7), no con un test unitario — CP17 la ejercita solo de forma indirecta, inyectando `config: null` en `autenticar` sin invocar `configuracion()`
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

### T4 — Dar modo al estado del panel

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R3.1, R3.2, R3.3, R3.4, R3.5, REG3 |
| **Casos de prueba** | CP18, CP19, CP20, CP21, CP22, CP24 |
| **Componente** | `login-estado` |
| **Archivos previstos** | `web/src/onboarding/login-estado.ts`, `web/src/onboarding/login-estado.test.ts` |
| **Decisiones que la condicionan** | D2 (design.md): la función única `autenticar(modo, …)` es la que hace existir el tipo `ModoAuth` en `web/src/auth/autenticar.ts` (T3); el alias `ModoLogin = ModoAuth` en sí lo fija `design.md` §4 (Interfaces), no D2 *(revisado el registro §6: está vacío)* |

*Hecho cuando:*

- [ ] CP19–CP22 fallan primero porque `alternarModo` no existe, y después alternan el modo conservando lo escrito y limpiando errores y mensaje
- [ ] CP24 fija los títulos, botones y enlaces de la tabla de `design.md` §4 para los dos modos
- [ ] CP18 fija los tres campos nuevos que T4 agrega al tipo `EstadoLogin` (`modo`, `enviando`, `mensaje` — hoy `EstadoLogin` no tiene ninguno de los tres): `LOGIN_INICIAL` queda en modo `entrar`, con `enviando === false` y `mensaje === undefined`
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

### T5 — Envío y mensaje de servidor en el estado del panel

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.1, R2.1, R4.1, R4.5, R4.6, R5.1, R5.3, BR4, BR5 |
| **Casos de prueba** | CP25, CP26, CP27, CP28, CP31, CP34 |
| **Componente** | `login-estado` |
| **Archivos previstos** | `web/src/onboarding/login-estado.ts`, `web/src/onboarding/login-estado.test.ts` |
| **Decisiones que la condicionan** | D3 (design.md): `responder` recibe un `ResultadoAuth` cuya variante de éxito no lleva datos, así que no hay nada que guardar *(revisado el registro §6: está vacío)* |

*Hecho cuando:*

- [ ] CP25 falla primero porque la función `enviar` no existe — T4 ya agrega `enviando` y `mensaje` a `EstadoLogin` como datos inertes, sin ninguna función que los toque —, y después `enviar` marca `enviando === true` y deja `mensaje === undefined`
- [ ] CP26 y CP27 verifican que `responder` apaga `enviando` en los dos desenlaces, y fija `mensaje` con `mensajeDe(codigo)` en el fallo (R4.1) o lo deja `undefined` en el éxito (R1.1, R2.1) (nota de implementación: `mensajeDe` de `errores.ts` colisiona de nombre con el `mensajeDe(estado, campo)` privado que ya existe en este archivo — importar con alias)
- [ ] CP28 confirma que `escribir` retira el mensaje de formulario mientras se escribe, y CP31/CP34 confirman que ningún desenlace de `responder` toca `errores`
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

### T6 — Pintar el modo del panel en el DOM

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R3.1, R3.2 |
| **Casos de prueba** | Ninguno unitario: es DOM. R3.1 y R3.2 ya tienen su mitad de estado probada por CP19–CP22 y CP24 (T4) — la mitad que falta acá es que `login.pintar` muestre los textos del modo y que el enlace del pie dispare `alternarModo`, y eso no se puede afirmar sin DOM. Lo cubren E2E-1 y E2E-3, los dos únicos casos del loop que pasan por modo `registrar` |
| **Componente** | `login` |
| **Archivos previstos** | `web/src/onboarding/login.ts` |
| **Decisiones que la condicionan** | — *(revisado el registro §6: está vacío)* |

*Hecho cuando:*

- [ ] Hoy el enlace del pie (`Create an account`) no tiene manejador — activarlo no hace nada: ese es el rojo a cerrar. Después, `pie` usa `textosDe(estado.modo)` para su texto y su enlace, y el clic en el enlace llama a `cambiar(alternarModo(estado))`
- [ ] `pintar()` deriva del estado, vía `textosDe(estado.modo)`, el título, el subtítulo, el texto del botón y los dos textos del pie; cambiar de modo actualiza los cinco sin recrear ningún nodo del panel
- [ ] Con la app corriendo, activar el enlace dos veces a mano muestra `Welcome back` / `Sign in` / `New here?` → `Create your account` / `Create account` / `Already have an account?` → de vuelta, conservando lo escrito en los campos
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

### T7 — Repuntar el recorrido E2E existente y el arranque de la suite

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | REG6, REG7 |
| **Casos de prueba** | REG7 — los nueve recorridos existentes de `e2e/onboarding.spec.ts` que dejan de atravesar el acceso (trabajo real: repuntarlos). REG6 — la prueba de ruteo (línea 176), sin cambios de código; ya la cubre `rutas.test.ts` (`design.md` §7), acá solo se re-corre como verificación |
| **Componente** | Recorrido E2E, Arranque de la suite |
| **Archivos previstos** | `e2e/onboarding.spec.ts`, `playwright.config.ts` |
| **Decisiones que la condicionan** | D7 (la suite levanta Supabase como segundo `webServer`), D8 (`ingresar()` pasa a `page.goto`, en vez de autenticar de verdad) |

*Hecho cuando:*

- [ ] Tras T9, `ingresar()` deja de navegar: postea `CREDENCIALES` contra Supabase local, que no tiene esa cuenta, y `autenticar` devuelve `invalid_credentials`, así que 9 de los 11 recorridos de `e2e/onboarding.spec.ts` quedan rojos — los que llaman a `ingresar()` desde las líneas 54, 101, 157 y 183 (8 tests dentro de los `describe` "Perfil", "Conoceme", "Plan" y "Ruteo"), más la prueba de la línea 34 que hace el clic en línea y afirma la misma navegación. Ese es el fallo que T7 cierra (REG7): `ingresar()` pasa a `page.goto("/#/perfil")` (D8), y la prueba de la línea 34 conserva la validación de campos pero suelta la aserción de navegación
- [ ] `playwright.config.ts` agrega el arranque de Supabase (D7): hoy `webServer` es un único objeto (`command: "npm run dev"`); pasa a un arreglo de dos entradas — la existente más `command: "supabase start"` con la `url` del health de auth y `reuseExistingServer` — y la suite falla diciendo qué falta cuando Docker está apagado
- [ ] `npm run test:e2e` en verde de punta a punta

**Bitácora**

### T8 — Guarda de re-entrada: bloquear un segundo intento mientras el primero está en vuelo

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R2.4, R5.1, R5.2, BR2, BR3, REG1, REG2, REG3, REG4, REG5 |
| **Casos de prueba** | CP23, CP29, CP30, CP32, CP33 |
| **Componente** | `login-estado` |
| **Archivos previstos** | `web/src/onboarding/login-estado.ts`, `web/src/onboarding/login-estado.test.ts` |
| **Decisiones que la condicionan** | — *(revisado el registro §6: está vacío)* |

*Hecho cuando:*

- [ ] CP23 falla primero porque `alternarModo` todavía cambia de modo aunque `enviando === true` — la guarda no existe —, y después `alternarModo` devuelve el estado sin cambio alguno mientras hay un intento en vuelo
- [ ] `puedeEntrar` se renombra a `puedeEnviar`: CP29 fija que devuelve `false` con `enviando === true` aunque los campos sean válidos, y CP30 que devuelve `true` con una clave de tres caracteres — la longitud la juzga el servidor, no el cliente
- [ ] CP32 y CP33 confirman que `abandonar`/`escribir` y `alternarClaveVisible`/`alternarRecordarme` siguen comportándose igual que hoy una vez que `EstadoLogin` tiene los campos `modo`, `enviando` y `mensaje`
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

### T9 — Conectar el envío del panel con Supabase

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.1, R1.3, R2.1, R4.1, R5.4 |
| **Casos de prueba** | Ninguno unitario: el manejador de envío y el nodo de alerta exigen DOM, y `vitest` corre en Node — no hay `jsdom` ni `happy-dom` en el proyecto, y NF1 prohíbe sumar una dependencia solo para esto. `design.md` §7 manda R4.1 y R5.4 al E2E por esa misma razón. Lo cubren E2E-1, E2E-2 y E2E-3 del loop |
| **Componente** | `login` (manejador de envío), `mensajeFormulario` |
| **Archivos previstos** | `web/src/onboarding/login.ts`, `web/src/ds/componentes.ts`, `web/src/ds/componentes.css` *(los estilos del panel de acceso — `.formulario`, `.opciones`, `.pie`, `.enlace` — viven ahí; `pantallas.css` es de las pantallas "Know Me" y "Plan", no del acceso)* |
| **Decisiones que la condicionan** | D9 (el nodo de alerta vive siempre y se oculta con `hidden`), D2 (el manejador llama a `autenticar(estado.modo, …)`, sin ramificar) |

*Hecho cuando:*

- [ ] Hoy el clic en el botón de envío navega directo a `#/perfil` con cualquier correo y clave, porque el manejador llama a `navegar("perfil")` sin consultar el servidor — ese es el rojo a cerrar: después, el manejador comprueba `puedeEnviar(estado)`, llama a `enviar` para marcar el intento en vuelo, invoca `autenticar(estado.modo, { correo: estado.correo.trim(), clave: estado.clave })` y llama a `responder` con el resultado, navegando a `#/perfil` solo si es `ok`
- [ ] El nodo de alerta (`mensajeFormulario`) se crea una sola vez entre `opciones` y el botón de envío, vive siempre en el DOM, y `pintar()` le escribe `estado.mensaje` alternando `hidden` según haya texto o no
- [ ] Con Supabase levantado, se prueban a mano los tres flujos del loop: registro con correo nuevo, credenciales incorrectas y registro sobre un correo existente
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

## 5. Trazabilidad criterio → tarea

| Requisito | Tarea |
|---|---|
| R1.1 | T3, T5, T9 |
| R1.2 | T2, T3 |
| R1.3 | T3, T9 |
| R1.4 | T3 |
| R2.1 | T3, T5, T9 |
| R2.2 | T2 |
| R2.3 | T2 |
| R2.4 | T8 |
| R3.1 | T4, T6 |
| R3.2 | T4, T6 |
| R3.3 | T4 |
| R3.4 | T4 |
| R3.5 | T4 |
| R4.1 | T5, T9 |
| R4.2 | T2, T3 |
| R4.3 | T2, T3 |
| R4.4 | T2 |
| R4.5 | T5 |
| R4.6 | T5 |
| R4.7 | T2 |
| R5.1 | T5, T8 |
| R5.2 | T8 |
| R5.3 | T5, T8 |
| R5.4 | T9 |
| NF1 | T1 |
| NF2 | T3 |
| NF3 | T1, T3 |
| BR1 | T3 |
| BR2 | T8 |
| BR3 | T8 |
| BR4 | T5 |
| BR5 | T2, T5 |
| REG1 | T8 |
| REG2 | T8 |
| REG3 | T4, T8 |
| REG4 | T8 |
| REG5 | T8 |
| REG6 | T7 |
| REG7 | T7 |

REG6 está cubierto por `web/src/rutas.test.ts` y por la prueba de ruteo del E2E, que no cambian. Queda asignado a T7 como verificación, no como trabajo: es la tarea que corre esa suite y responde si se rompió.

## 6. Registro de decisiones

| # | Tarea | Decisión | Fecha |
|---|---|---|---|
| T1-D1 | T1 | Se usa `ANON_KEY` (el JWT) y no `PUBLISHABLE_KEY` para el header `apikey`, aunque el CLI imprima las dos | 2026-09-22 |

## 7. Desvíos del diseño

| # | Tarea | Qué difiere de design.md | Resolución |
|---|---|---|---|
| DV1 | T1 | §2 lista `.gitignore` como archivo **Nuevo**; ya existe en la raíz del repo git, un nivel arriba de `01-mis-finanzas/` | Desvío local, diseño sigue válido: se agregaron las reglas al archivo existente. El componente "Configuración local" pasa de `Nuevo` a `Ampliado` y nada más cambia |

## 8. Tareas descubiertas durante la implementación

*(Vacío. Si para escribir una tarea nueva hace falta un criterio de aceptación nuevo, eso es alcance y vuelve a `requirements.md`.)*

| # | Tarea | Por qué apareció | ¿Cambia el alcance? |
|---|---|---|---|
