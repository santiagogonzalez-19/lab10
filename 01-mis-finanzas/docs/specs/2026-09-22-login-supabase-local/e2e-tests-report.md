# Reporte E2E — Login contra Supabase local

| | |
|---|---|
| **Spec** | `docs/specs/2026-09-22-login-supabase-local/` |
| **Tests** | `e2e/login-supabase-local.spec.ts` |
| **Ronda** | 2 de 3 |
| **Corrido** | 2026-09-24 07:01 |
| **Veredicto** | verde |

## 1. Resultado

| Caso | Criterios | Resultado | Veredicto | Causa |
|---|---|---|---|---|
| E1 | R2.1, **R1.1**, R1.4, R3.1 | pasa | verde | — |
| E2 | R1.2, R4.1, R4.6 | pasa | verde | — |
| E3 | R2.2, R4.1 | pasa | verde | — |

Verificación del proyecto: typecheck verde · unitarios verde (228 en 16 archivos)

Suite corrida **cuatro veces** en esta ronda: una completa (`npx playwright test`,
15/15 en 3.6 s — `e2e/onboarding.spec.ts` no regresó) y tres del spec de login
solo (3/3, entre 1.3 s y 1.7 s). Sin intermitencia.

## 2. Diagnóstico

Ningún caso está rojo. El encargo de esta ronda era uno solo y puntual:
certificar que **la segunda mitad de E1 es de verdad un inicio de sesión y puede
ponerse roja**. El verde que reporta el generador no es evidencia de eso, así
que se midió contra la aplicación viva —interceptando la red y provocando el
fallo a propósito— y no leyendo el script.

### E1 — la segunda mitad emite el `POST` de token, y ningún segundo `signup`

- **Criterio:** «WHEN el visitante envía el panel en modo `entrar` con un correo
  y una clave que corresponden a una cuenta existente THE SYSTEM SHALL navegar a
  `#/perfil`» (R1.1).
- **El test espera:** tras completar con **el mismo** correo y la misma clave del
  registro y hacer clic, `toHaveURL(/#\/perfil$/)` más el encabezado
  `Tell us about your finances` (`e2e/login-supabase-local.spec.ts:80-81`).
- **La app hace:** el recorrido completo de E1 reproducido con la red
  interceptada emite **exactamente dos peticiones a `127.0.0.1:54321`**, una por
  mitad y en este orden:

  | Mitad | Petición | Status | Claves del cuerpo |
  |---|---|---|---|
  | 1 — registro | `POST /auth/v1/signup` | `200` | `access_token`, `token_type`, `expires_in`, `expires_at`, `refresh_token`, `user` |
  | 2 — inicio de sesión | `POST /auth/v1/token?grant_type=password` | `200` | `access_token`, `token_type`, `expires_in`, `expires_at`, `refresh_token`, `user` |

- **Por qué es verde y no un verde prestado:** la duda concreta era que la
  segunda mitad emitiera un **segundo `/auth/v1/signup`** y pasara probando otra
  cosa. No ocurre: después del hito del registro no hay ningún `signup`, y quien
  responde es el endpoint de contraseña. R1.1 tiene por fin cobertura E2E real,
  que es lo que esta ronda venía a conseguir.

### E1 — el aserto del paso final sí se pone rojo (tres mutaciones)

Se corrió la misma secuencia tres veces con una sola cosa rota cada vez. En las
tres el recorrido **queda en `#/login`**, o sea que el `toHaveURL(/#\/perfil$/)`
de la línea 80 habría expirado y el caso se habría puesto rojo:

| Mutación | Red | Dónde queda | Mensaje de formulario |
|---|---|---|---|
| La clave del inicio de sesión no es la registrada | `POST /auth/v1/token?grant_type=password` → `400` (`code`, `error_code`, `msg`) | `#/login` | `That email and password don't match an account.` |
| Correo que nunca se registró (sin la mitad 1) | `POST …token` → `400` | `#/login` | `That email and password don't match an account.` |
| `**/auth/v1/token**` abortado — "el endpoint cambió" | petición fallida | `#/login`, título sigue en `Welcome back` | `Can't reach the server. Is Supabase running?` |

La segunda mutación es la que cierra el argumento de fondo: **sin la primera
mitad no se entra**. La cuenta que hace pasar el paso 9 es la que creó el paso 6
contra el servidor real, y no hay camino por el que el panel navegue a
`#/perfil` sin que el servidor haya aceptado la credencial. En la mutación de
clave incorrecta los dos espacios `.campo__error` quedaron vacíos, lo que
confirma R4.6 por un camino distinto al de E2.

### E1 — R1.4 se mide después del inicio de sesión, y mide algo

- **Criterio:** «WHEN un intento termina con éxito THE SYSTEM SHALL descartar la
  sesión devuelta, sin escribirla en ningún almacenamiento del navegador» (R1.4).
- **El test espera:** `localStorage`, `sessionStorage` y las cookies del contexto
  vacíos (`e2e/login-supabase-local.spec.ts:86-92`).
- **La app hace:** el bloque está **después** de los asertos de la segunda mitad
  —confirmado en el archivo y reproducido a mano—, así que el estado que lee es
  el posterior al `POST` de token y no el del registro. Medido en los dos
  puntos: tras el registro `[] [] []`, tras el inicio de sesión `[] [] []`.
- **Por qué no es vacuo:** la respuesta `200` del token trae `access_token` y
  `refresh_token` (tabla de arriba). Hay una sesión concreta que descartar, así
  que el vacío es una decisión de la aplicación —D3: la variante de éxito de
  `ResultadoAuth` no tiene dónde poner el token— y no la ausencia de algo que
  guardar. La ronda 1 ya había comprobado que **la misma expresión** devuelve
  `["sb-127-auth-token"] ["algo"] ["sb-fake"]` si se planta contenido a mano.

### E1 — las dos guardas de modo son cinturón y tirantes, no imprescindibles

La observación del generador es **correcta**, y conviene dejarla medida porque
los comentarios del propio script dicen lo contrario:

- Yendo de `#/perfil` a `#/login` **sin recargar**, el panel ya vuelve montado en
  modo `entrar`: título `Welcome back`, botón `Sign in`, campo de correo vacío.
  El fragmento cambia, así que la trampa same-document no aplica en este punto.
- Por eso el `page.reload()` de la línea 69 y los asertos de las líneas 70-71 no
  son lo que salva al caso: son verificación redundante. Redundante está bien
  —son baratos y afirman R3.5 de paso—, pero no hay que creer que sin ellos el
  caso se volvería un registro duplicado silencioso.
- Y aunque el panel sobreviviera en modo `registrar`, el caso **no** pasaría por
  el motivo equivocado: el envío sería un `signup` con un correo que ya tiene
  cuenta, el servidor devolvería `422`, el recorrido quedaría en `#/login` y E1
  se pondría rojo. Es justo lo que E3 demuestra por separado.

### E2 y E3 — sin cambios respecto de la ronda 1

Ninguno de los dos se tocó. Se volvieron a correr cuatro veces, verdes. Lo que
la ronda 1 certificó sigue en pie: el rechazo de E2 es un `400` real con
`error_code: invalid_credentials` y `code` trayendo el **número** del status —la
forma que DV2 corrigió—, `toHaveText` con un arreglo fija también el conteo de
dos nodos `.campo__error`, y los textos afirmados coinciden carácter a carácter
con `web/src/auth/errores.ts:19-25` y con R1.2 y R2.2.

## 3. Qué haría falta para el verde

Nada: el veredicto global es **verde**. El hueco que motivó esta ronda —R1.1 sin
ningún inicio de sesión exitoso en toda la suite— está cerrado y verificado
contra el servidor real.

## 4. Observaciones

Ninguna cambia el veredicto. Se listan porque son las que un rojo futuro vuelve
caras.

- **Dos comentarios del script afirman algo que no es cierto.** Ningún aserto
  depende de ellos, pero orientan mal a quien los lea después:
  `e2e/login-supabase-local.spec.ts:63-65` («ir a un fragmento es una navegación
  same-document que puede no remontar el panel») y `:132-134` («navegar al mismo
  fragmento no remonta el panel, y el modo del paso anterior sobreviviría»). Ir
  de `#/perfil` a `#/login` **sí** remonta el panel, porque el fragmento cambia.
  La recarga sigue siendo correcta y barata; lo que no se sostiene es su
  justificación escrita. Es un comentario, no una aserción: **no** es
  `falla-de-test` y no justifica por sí solo una ronda 3.
- **R3.1 sigue cubierto a dos tercios en E1.** El criterio fija tres cosas al
  pasar a modo `registrar`: el título `Create your account`, el botón
  `Create account` y el enlace `Already have an account?`. E1 afirma las dos
  primeras (`spec.ts:51-52`) y no la tercera. El plan pide exactamente eso, así
  que **el hueco es del plan, no del script**: una regresión que rompiera solo el
  texto del enlace del pie pasaría sin que nadie la vea.
- **La cláusula posicional de R4.1 no la afirma nadie.** R4.1 dice «ubicado entre
  la fila de opciones y el botón de envío»; E2 y E3 afirman el rol de alerta y el
  texto, no la posición en el árbol. Lo de «un único mensaje» sí queda cubierto
  de rebote: `getByRole("alert")` en modo estricto falla si hubiera más de uno.
- **El nombre accesible del campo de clave es `Password Show`, no `Password`.**
  El botón `Show`/`Hide` vive dentro del `<label class="campo">`, así que su
  texto entra en el nombre calculado del `input`.
  `getByRole("textbox", { name: "Password" })` funciona **solo** porque la opción
  `name` de Playwright hace coincidencia por subcadena; con `exact: true`
  resuelve a 0 elementos, y el nombre cambia a `Password Hide` al alternar la
  visibilidad. Es frágil y conviene saberlo antes de tocar ese selector. No es un
  defecto: ningún criterio fija el nombre accesible del campo.
- **El límite de tasa puede teñir de rojo una ronda entera, y E1 ahora gasta
  más.** `config.toml` fija `sign_in_sign_ups = 30` por IP cada 5 minutos. Con E1
  encadenado cada corrida del spec gasta **cinco** peticiones (E1 un signup y un
  token, E2 un token, E3 dos signups) en vez de las cuatro de la ronda 1. A
  partir de unas seis corridas seguidas dentro de la misma ventana el servidor
  responde `429`, el mapeo lo manda al genérico `Something went wrong. Try
  again.` y los asertos de texto exacto se ponen rojos. Eso sería un fallo de
  entorno, no un defecto — es el supuesto S3 y la pregunta abierta Q1. En esta
  ronda no se alcanzó el límite, pese a las cuatro corridas más los guiones de
  certificación.
- **El cuerpo `200` de `/auth/v1/token?grant_type=password` de este GoTrue trae
  además una clave `weak_password`.** No se usa y no afecta a nada; queda anotado
  por si alguna vez alguien la lee como señal de fallo.
- **Cada corrida deja usuarios nuevos en la base local de auth**, sin limpieza.
  Es consecuencia deliberada de no sembrar datos y de que cada caso construya su
  propia precondición; no afecta a ningún criterio.
- **Precondiciones del entorno, en verde:** `GET /auth/v1/health` responde `200`,
  `web/.env.local` tiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, y
  `enable_confirmations = false`, así que el registro entrega la cuenta al
  instante.
- **Sobre el instrumental de esta ronda:** el MCP de Playwright no conectó en
  esta sesión, así que la reproducción manual se hizo con guiones de Node contra
  `@playwright/test` desde `test-results/`, borrados al terminar. La evidencia es
  la misma —red interceptada y estado del DOM leído—, pero sin snapshots de
  accesibilidad.
