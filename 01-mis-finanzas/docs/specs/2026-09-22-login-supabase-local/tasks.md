# Tareas — Login contra Supabase local

| | |
|---|---|
| **Requisitos** | [requirements.md](./requirements.md) |
| **Diseño** | [design.md](./design.md) |
| **Estado del plan** | Borrador |
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
| T4 | Dar modo al estado del panel | — |
| T5 | Envío, mensaje de servidor y guarda de re-entrada en el estado | T2, T3, T4 |
| T6 | Conectar el panel con la autenticación | T3, T5 |
| T7 | Repuntar el recorrido E2E existente y el arranque de la suite | T6 |

**Qué obliga el orden.** Son dependencias técnicas reales: T3 necesita el tipo `CodigoAuth` de T2 y el `vite-env.d.ts` de T1; T5 necesita `mensajeDe` de T2, el tipo `ResultadoAuth` de T3 y el campo `modo` de T4; T6 no puede cablear lo que no existe; T7 solo tiene sentido cuando el acceso ya es real.

**Qué elegí yo.** T2 y T4 no dependen de nada y podrían ir en cualquier orden — puse T2 antes porque desbloquea T3, que es la pieza que primero deja algo demostrable (la aplicación hablando con Supabase). Y T1 va primera aunque T2 no la necesite, porque es la que resuelve el riesgo principal del diseño: sin la llave anónima, todo lo demás se prueba contra un servidor que no está.

## 4. Tareas

### T1 — Preparar Supabase local y la configuración del proyecto

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | NF1, NF3 |
| **Casos de prueba** | Ninguno unitario: es andamiaje. Se verifica contra el servicio vivo y el árbol versionado |
| **Componente** | `vite-env.d.ts`, Configuración local |
| **Archivos previstos** | `.gitignore`, `.env.example`, `.env.local` *(no versionado)*, `web/src/vite-env.d.ts` |
| **Decisiones que la condicionan** | D5 (design.md): los tipos de `import.meta.env` se declaran a mano, no con `vite/client` |

*Hecho cuando:*

- [ ] `supabase start` levanta y `GET http://127.0.0.1:54321/auth/v1/health` responde; la llave anónima quedó en `.env.local`
- [ ] `.env.example` versionado con las dos claves y sin valores reales; `.gitignore` en la raíz ignora `.env.local`, y `git status` no lo ve
- [ ] `npm run typecheck` en verde con el `vite-env.d.ts` nuevo, y `package.json` sin dependencias agregadas

**Bitácora**

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
| **Requisitos** | R1.1, R1.3, R1.4, R2.1, R4.2, R4.3, NF2, BR1 |
| **Casos de prueba** | CP11, CP12, CP13, CP14, CP15, CP16, CP17 |
| **Componente** | `autenticar`, `configuracion` |
| **Archivos previstos** | `web/src/auth/configuracion.ts`, `web/src/auth/autenticar.ts`, `web/src/auth/autenticar.test.ts` |
| **Decisiones que la condicionan** | D1 (`fetch` plano, sin SDK), D2 (una sola función con `modo` como parámetro), D3 (la variante de éxito no lleva datos), D4 (`fetch` y configuración inyectados) |

*Hecho cuando:*

- [ ] CP11–CP13 fijan endpoint, método, cabeceras y cuerpo de los dos modos, con el correo recortado y la clave intacta
- [ ] CP14 comprueba que el resultado de éxito no tiene ninguna propiedad más que `ok` — BR1 sostenida por el tipo
- [ ] CP16 y CP17 cubren el `fetch` que lanza y la configuración ausente, y ninguna prueba del archivo abre la red
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
| **Decisiones que la condicionan** | — *(revisado el registro §6: está vacío, es la primera tarea que toca este módulo)* |

*Hecho cuando:*

- [ ] CP19–CP22 fallan primero porque `alternarModo` no existe, y después alternan el modo conservando lo escrito y limpiando errores y mensaje
- [ ] CP24 fija los títulos, botones y enlaces de la tabla de `design.md` §4 para los dos modos
- [ ] CP18 deja `LOGIN_INICIAL` en modo `entrar`, sin envío en curso y sin mensaje
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

### T5 — Envío, mensaje de servidor y guarda de re-entrada en el estado

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R2.4, R4.1, R4.5, R4.6, R5.1, R5.2, R5.3, BR2, BR3, BR4, REG1, REG2, REG4, REG5 |
| **Casos de prueba** | CP23, CP25, CP26, CP27, CP28, CP29, CP30, CP31, CP32, CP33, CP34 |
| **Componente** | `login-estado` |
| **Archivos previstos** | `web/src/onboarding/login-estado.ts`, `web/src/onboarding/login-estado.test.ts` |
| **Decisiones que la condicionan** | D3 (design.md): `responder` recibe un `ResultadoAuth` cuya variante de éxito no lleva datos, así que no hay nada que guardar |

*Hecho cuando:*

- [ ] CP25–CP29 cubren el ciclo completo de un intento: `enviar` bloquea el botón, `responder` lo libera y fija el mensaje del código
- [ ] CP23 deja el cambio de modo sin efecto mientras hay un intento en vuelo, y CP30 mantiene el botón habilitado con una clave de tres caracteres
- [ ] CP31 y CP34 comprueban que ningún camino de `responder` escribe en `errores`, y CP32–CP33 fijan el comportamiento que ya existe antes de tocarlo
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

### T6 — Conectar el panel con la autenticación

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | R1.1, R1.3, R2.1, R4.1, R5.4 |
| **Casos de prueba** | Ninguno unitario: es DOM. Lo cubren E2E-1, E2E-2 y E2E-3 del loop |
| **Componente** | `login`, `mensajeFormulario` |
| **Archivos previstos** | `web/src/onboarding/login.ts`, `web/src/ds/componentes.ts`, `web/src/onboarding/pantallas.css` |
| **Decisiones que la condicionan** | D9 (el nodo de alerta vive siempre y se oculta con `hidden`), D2 (el manejador llama a `autenticar(estado.modo, …)`, sin ramificar) |

*Hecho cuando:*

- [ ] El manejador del botón comprueba `puedeEnviar` antes de emitir, recorta el correo, espera la respuesta y solo navega a `#/perfil` si el resultado es `ok`
- [ ] `pintar()` deriva del estado los textos del modo y el nodo de alerta, que queda oculto cuando no hay mensaje; nada que dependa del estado se actualiza fuera de esa función
- [ ] Con Supabase levantado, los tres flujos se ven a mano en el navegador: registro nuevo, credenciales incorrectas y correo ya existente
- [ ] `npm run typecheck` y `npm test` en verde

**Bitácora**

### T7 — Repuntar el recorrido E2E existente y el arranque de la suite

**Estado:** `Pendiente`

**Plan** *(inmutable)*

| | |
|---|---|
| **Requisitos** | REG6, REG7 |
| **Casos de prueba** | Los nueve recorridos existentes de `e2e/onboarding.spec.ts`, más la prueba de ruteo |
| **Componente** | Recorrido E2E, Arranque de la suite |
| **Archivos previstos** | `e2e/onboarding.spec.ts`, `playwright.config.ts` |
| **Decisiones que la condicionan** | D7 (la suite levanta Supabase como segundo `webServer`), D8 (`ingresar()` pasa a `page.goto`, en vez de autenticar de verdad) |

*Hecho cuando:*

- [ ] `ingresar()` navega directo a `#/perfil`, y la prueba de la línea 34 conserva la validación de campos sin afirmar la navegación
- [ ] `playwright.config.ts` levanta Supabase y la suite falla diciendo qué falta cuando Docker está apagado
- [ ] `npm run test:e2e` en verde de punta a punta

**Bitácora**

## 5. Trazabilidad criterio → tarea

| Requisito | Tarea |
|---|---|
| R1.1 | T3, T6 |
| R1.2 | T2 |
| R1.3 | T3, T6 |
| R1.4 | T3 |
| R2.1 | T3, T6 |
| R2.2 | T2 |
| R2.3 | T2 |
| R2.4 | T5 |
| R3.1 | T4 |
| R3.2 | T4 |
| R3.3 | T4 |
| R3.4 | T4 |
| R3.5 | T4 |
| R4.1 | T5, T6 |
| R4.2 | T2, T3 |
| R4.3 | T2, T3 |
| R4.4 | T2 |
| R4.5 | T5 |
| R4.6 | T5 |
| R4.7 | T2 |
| R5.1 | T5 |
| R5.2 | T5 |
| R5.3 | T5 |
| R5.4 | T6 |
| NF1 | T1 |
| NF2 | T3 |
| NF3 | T1 |
| BR1 | T3 |
| BR2 | T5 |
| BR3 | T5 |
| BR4 | T5 |
| BR5 | T2 |
| REG1 | T5 |
| REG2 | T5 |
| REG3 | T4 |
| REG4 | T5 |
| REG5 | T5 |
| REG6 | T7 |
| REG7 | T7 |

REG6 está cubierto por `web/src/rutas.test.ts` y por la prueba de ruteo del E2E, que no cambian. Queda asignado a T7 como verificación, no como trabajo: es la tarea que corre esa suite y responde si se rompió.

## 6. Registro de decisiones

*(Vacío: solo lo llena la implementación. Una decisión anotada acá antes de tomarse es una conjetura con aspecto de registro.)*

| # | Tarea | Decisión | Fecha |
|---|---|---|---|

## 7. Desvíos del diseño

*(Vacío hasta que la implementación se aparte de `design.md`.)*

| # | Tarea | Qué difiere de design.md | Resolución |
|---|---|---|---|

## 8. Tareas descubiertas durante la implementación

*(Vacío. Si para escribir una tarea nueva hace falta un criterio de aceptación nuevo, eso es alcance y vuelve a `requirements.md`.)*

| # | Tarea | Por qué apareció | ¿Cambia el alcance? |
|---|---|---|---|
