# Reporte E2E — Login contra Supabase local

| | |
|---|---|
| **Spec** | `docs/specs/2026-09-22-login-supabase-local/` |
| **Tests** | `e2e/login-supabase-local.spec.ts` |
| **Ronda** | 1 de 3 |
| **Corrido** | 2026-09-24 06:41 |
| **Veredicto** | verde |

## 1. Resultado

| Caso | Criterios | Resultado | Veredicto | Causa |
|---|---|---|---|---|
| E1 | R2.1, R1.4, R3.1 | pasa | verde | — |
| E2 | R1.2, R4.1, R4.6 | pasa | verde | — |
| E3 | R2.2, R4.1 | pasa | verde | — |

Verificación del proyecto: typecheck verde · unitarios verde (228 en 16 archivos)

Suite corrida **cinco veces** (cuatro del spec de login solo, una completa junto a
`e2e/onboarding.spec.ts`): 5/5 verdes, sin intermitencia, entre 1.5 s y 1.9 s. La
corrida completa da 15/15 — el recorrido de onboarding no regresó.

## 2. Diagnóstico

Ningún caso está rojo, así que el trabajo de esta ronda fue el otro: **comprobar
que cada verde puede ponerse rojo**. Un test que pasa sin poder fallar es peor
que un rojo, y los tres asertos señalados como sospechosos se verificaron contra
la aplicación viva, no leyendo el script.

### E1 — R1.4 / BR1: el aserto de almacenamiento sí puede fallar

- **Criterio:** «WHEN un intento termina con éxito THE SYSTEM SHALL descartar la
  sesión devuelta, sin escribirla en ningún almacenamiento del navegador» (R1.4).
- **El test espera:** `localStorage`, `sessionStorage` y las cookies del contexto
  vacíos, leídos con `page.evaluate` después de llegar a `#/perfil`
  (`e2e/login-supabase-local.spec.ts:58-64`).
- **La app hace:** el `POST http://127.0.0.1:54321/auth/v1/signup` responde `200`
  con un cuerpo que **sí trae `access_token`** (verificado interceptando la red
  con un guion propio). Tras esa respuesta los tres almacenamientos quedan en
  `[] [] []`. No hay una sola referencia a `localStorage`, `sessionStorage` ni
  `document.cookie` en todo `web/src/` ni `src/`.
- **Por qué es verde y no un verde vacío:** se ejecutó **la misma expresión del
  test** después de plantar a mano `sb-127-auth-token` en `localStorage`, `algo`
  en `sessionStorage` y la cookie `sb-fake`, y devolvió
  `["sb-127-auth-token"] ["algo"] ["sb-fake"]`. El aserto lee el origen correcto
  (`localhost:5173`, el mismo en el que corre la app), corre después de que la
  respuesta llegó —`toHaveURL(/#\/perfil$/)` solo se cumple cuando
  `resultado.ok` es verdadero, porque `navegar("perfil")` es la última línea de
  `intentar()`— y distingue vacío de no vacío. Si alguien cambiara el `fetch`
  plano de D1 por el SDK con `persistSession`, este caso se pondría rojo.
- **Además:** llegar a `#/perfil` es en sí la prueba de que el navegador habló
  con el servidor. Si faltara la llave anónima, `configuracion()` devolvería
  `null`, el intento sería `sin-configurar` y no habría navegación.

### E2 — R4.6: los dos espacios de error existen, así que el aserto no es vacuo

- **Criterio:** «WHEN un intento falla THE SYSTEM SHALL dejar vacíos los espacios
  de error de ambos campos» (R4.6), con BR4 detrás.
- **El test espera:** `expect(page.locator(".campo__error")).toHaveText(["", ""])`
  (`e2e/login-supabase-local.spec.ts:87`).
- **La app hace:** el acceso tiene **exactamente dos** nodos `.campo__error`
  (uno por campo, creados en `web/src/ds/componentes.ts:60`), y tras el rechazo
  ambos están vacíos.
- **Por qué es verde y no un verde vacío:** `toHaveText` con un arreglo fija
  también el **conteo**, así que un selector que no resolviera a nada daría
  `expected 2 elements, found 0` en vez de pasar en silencio. El conteo real de
  2 se confirmó contra la pantalla. El aserto solo puede pasar si la app **no**
  escribió el fallo del servidor bajo un campo, que es justo la regresión que
  BR4 prohíbe.
- **El rechazo es real:** `POST /auth/v1/token?grant_type=password` → `400` con
  `{"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"}`.
  Nótese que `code` trae el **número** del status: es exactamente la forma que
  `slugDe` de `web/src/auth/errores.ts:60` esquiva tomando solo strings (la
  corrección registrada en D6). El mapeo está ejercitado de verdad, no simulado.

### E2 y E3 — los textos afirmados son los literales del criterio

Comparados carácter a carácter contra `web/src/auth/errores.ts:19-25` y contra
`requirements.md` §5. Coinciden los tres términos: criterio, código y test.

| Test | Texto afirmado | `errores.ts` | `requirements.md` |
|---|---|---|---|
| `spec.ts:80` | `That email and password don't match an account.` | `invalid_credentials` | R1.2 |
| `spec.ts:117` | `That email already has an account. Sign in instead.` | `user_already_exists` | R2.2 |

`toHaveText` con un string hace comparación **exacta** (con espacios
normalizados), no substring: una versión aproximada del mensaje pondría el caso
en rojo.

### E3 — el duplicado lo rechaza el servidor, no el cliente

- **Criterio:** «IF el correo enviado en modo `registrar` ya tiene una cuenta
  THEN THE SYSTEM SHALL permanecer en el acceso y mostrar en el mensaje de
  formulario `That email already has an account. Sign in instead.`» (R2.2).
- **La app hace:** el segundo `POST /auth/v1/signup` con el mismo correo responde
  `422` con `{"code":422,"error_code":"user_already_exists","msg":"User already registered"}`
  (comprobado con una petición directa al servidor, fuera del navegador). El
  panel se queda en `#/login` y pinta el mensaje.
- **La precondición está bien construida:** la cuenta previa la crea el propio
  caso por la interfaz, con un correo único por corrida, así que E3 no depende de
  datos sembrados ni de lo que dejó una corrida anterior. El `page.reload()` de
  `spec.ts:108` es necesario y está justificado: sin él, navegar al mismo
  fragmento no remonta el panel y el modo del paso anterior sobreviviría.
- **El orden de los asertos evita una carrera:** `navegar("perfil")` ocurre de
  forma síncrona justo después de pintar el estado de respuesta, así que esperar
  primero a que la alerta sea visible y recién después comprobar la URL no puede
  dar un falso verde: si el cliente ignorara el `422`, no habría alerta que
  esperar.

## 3. Qué haría falta para el verde

Nada. Los tres casos pasan y los tres pueden fallar. No hay trabajo de código ni
de test pendiente para cerrar esta ronda.

## 4. Observaciones

Ninguna cambia el veredicto. Se listan porque son las que un rojo futuro va a
volver caras.

- **R3.1 está cubierto a dos tercios en E1.** El criterio fija tres cosas al
  pasar a modo `registrar`: el título `Create your account`, el botón
  `Create account` y el enlace `Already have an account?`. E1 afirma las dos
  primeras (`spec.ts:45-46`) y no la tercera. El plan pide exactamente eso, así
  que **el hueco es del plan, no del script**: una regresión que rompiera solo el
  texto del enlace del pie pasaría sin que nadie la vea. Es barato cerrarlo en el
  plan de la próxima ronda si se decide que vale la pena.
- **La cláusula posicional de R4.1 no la afirma nadie.** R4.1 dice «ubicado entre
  la fila de opciones y el botón de envío»; E2 y E3 afirman el rol de alerta y el
  texto, no la posición en el árbol. Lo de «un único mensaje» sí queda cubierto
  de rebote: `getByRole("alert")` en modo estricto falla si hubiera más de uno.
- **El nombre accesible del campo de clave es `Password Show`, no `Password`.**
  El botón `Show`/`Hide` vive dentro del `<label class="campo">`, así que su texto
  entra en el nombre calculado del `input` (snapshot de accesibilidad:
  `textbox "Password Show"`). `getByRole("textbox", { name: "Password" })`
  funciona **solo** porque la opción `name` de Playwright hace coincidencia por
  subcadena; con `exact: true` resuelve a 0 elementos, y el nombre cambia a
  `Password Hide` al alternar la visibilidad. Es frágil y conviene saberlo antes
  de tocar ese selector. No es un defecto: ningún criterio fija el nombre
  accesible del campo.
- **El límite de tasa puede teñir de rojo una ronda entera.** `config.toml` fija
  `sign_in_sign_ups = 30` por IP cada 5 minutos, y cada corrida del spec gasta
  **cuatro** peticiones (E1 un signup, E2 un token, E3 dos signups). A partir de
  unas siete corridas seguidas dentro de la misma ventana, el servidor responde
  `429`, el mapeo lo manda al genérico `Something went wrong. Try again.` y E2 y
  E3 se ponen rojos por sus asertos de texto exacto. Eso sería un fallo de
  entorno, no un defecto — es el supuesto S3 y la pregunta abierta Q1. En esta
  ronda no se alcanzó el límite.
- **Cada corrida deja tres usuarios nuevos en la base local de auth**, sin
  limpieza. Es consecuencia deliberada de no sembrar datos y de que el propio
  caso construya su precondición; no afecta a ningún criterio.
- **Consola y red limpias.** Ningún error ni advertencia en la consola del
  navegador más allá de los dos mensajes de conexión de Vite; ninguna petición
  fallida fuera de las dos que los casos provocan a propósito.
- **Precondiciones del entorno, en verde:** `GET /auth/v1/health` responde `200`,
  `web/.env.local` tiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, y
  `enable_confirmations = false`, así que el registro entrega la cuenta al
  instante.
