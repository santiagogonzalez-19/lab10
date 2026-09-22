# Requisitos — Login contra Supabase local

| | |
|---|---|
| **Spec** | `docs/specs/2026-09-22-login-supabase-local/` |
| **Estado** | Borrador |
| **Última actualización** | 2026-09-22 |
| **Diseño** | [design.md](./design.md) *(pendiente hasta aprobar estos requisitos)* |

## 1. Contexto y problema

La pantalla de acceso de Northstar es hoy una maqueta. `web/src/onboarding/login.ts` valida la forma del correo y que la clave no esté vacía, y cuando el botón se habilita, el clic llama directo a `navegar("perfil")`: cualquier par de valores con forma de correo y cualquier texto como clave abren la aplicación. No hay cuenta, no hay servidor, no hay nada contra qué verificar.

Eso deja el onboarding entero apoyado en una puerta pintada. Mientras la aplicación no distinga a una persona de otra, nada de lo que se captura después —el perfil, los movimientos, el plan— tiene a quién pertenecer, y cada pantalla que se agregue encima hereda ese vacío. El proyecto ya tiene un Supabase local inicializado (`supabase/config.toml`, API en `:54321`, `[auth]` habilitado y `enable_confirmations = false`), pero ninguna línea de la aplicación lo consulta todavía.

Esta feature convierte esa puerta en una puerta de verdad, y nada más que eso: el mismo panel va a poder **iniciar sesión** y **crear una cuenta** contra Supabase Auth local, va a mostrar el motivo real cuando el servidor rechace el intento, y en cuanto las credenciales se verifiquen va a seguir navegando a `#/perfil` igual que hoy. La sesión que devuelva Supabase se descarta a propósito: verificar quién es alguien no es lo mismo que recordarlo, y recordarlo es una feature aparte con su propio modelo.

## 2. Alcance

**Incluido**

- Iniciar sesión con correo y clave contra Supabase Auth local, con el resultado decidido por el servidor.
- Crear una cuenta con correo y clave, como un segundo modo del mismo panel de acceso.
- Alternar entre los dos modos desde el enlace del pie, conservando lo ya escrito.
- Mostrar el motivo de un intento fallido en un único mensaje a nivel de formulario.
- Impedir que haya más de un intento de autenticación en vuelo a la vez.
- Ajustar el recorrido E2E existente, que hoy depende de que el acceso sea una maqueta.

**Fuera de alcance**

- **Persistencia de la sesión, guardia de rutas y cerrar sesión** — decisión explícita del diseño acordado: el token se lee y se descarta. Recargar vuelve a pedir credenciales. Es una feature propia, con su modelo de sesión y su efecto sobre el router.
- **"Continue with Google"** — el botón se queda inerte. OAuth exige arreglar `site_url` (hoy apunta a `http://127.0.0.1:3000` mientras la app corre en `:5173`), registrar credenciales de proveedor y manejar el regreso por redirección.
- **"Forgot password?"** — el enlace se queda inerte. Recuperar la clave implica leer correo desde Inbucket (`:54324`) y una pantalla de clave nueva.
- **"Remember me"** — la casilla sigue alternando su estado sin efecto, porque no hay sesión que recordar.
- **Confirmación de correo** — `config.toml` la tiene apagada y así se deja; el registro entrega la cuenta de inmediato.
- **Pantalla y ruta propias de registro** — el registro es un modo del panel existente; `rutas.ts` no cambia.
- **Validar la longitud de la clave en el cliente** — ver BR2: esa regla vive en `config.toml`.
- **Tablas, migraciones, RLS y perfiles de usuario en Supabase** — esta feature toca únicamente el servicio de autenticación. `supabase/migrations/` sigue sin existir.
- **Vincular al usuario autenticado los datos del onboarding** — tras entrar, las pantallas de perfil, movimientos y plan siguen sin saber quién las está usando. Es el paso natural siguiente y necesita la sesión, que está fuera de alcance.

## 3. Actores

| Actor | Descripción | Qué puede hacer en esta feature |
|---|---|---|
| Visitante | Persona que abre la aplicación sin haberse identificado. Es el único actor humano. | Iniciar sesión, crear una cuenta, alternar entre ambos modos |
| Supabase Auth local | Servicio GoTrue del Supabase local, en `http://127.0.0.1:54321`. Único juez de las credenciales. | Aceptar o rechazar un intento, y decir por qué |

## 4. Glosario

| Término | Definición |
|---|---|
| **Intento** | Un envío del panel al servidor: exactamente una petición HTTP, en curso desde el clic hasta la respuesta o el fallo de red |
| **Modo** | Cuál de los dos flujos muestra el panel: `entrar` (iniciar sesión) o `registrar` (crear cuenta) |
| **Mensaje de formulario** | El único texto de error que no pertenece a un campo: explica por qué el servidor rechazó el intento |
| **Error de campo** | El mensaje bajo un campo concreto, que ya existe hoy y solo juzga la forma de lo escrito, sin consultar al servidor |
| **Código de fallo** | El nombre normalizado de una causa de rechazo (`invalid_credentials`, `user_already_exists`, `weak_password`, `sin-red`, `sin-configurar`, `desconocido`), que es lo que decide qué mensaje se muestra |
| **Sesión** | El `access_token` y su acompañamiento que Supabase devuelve al aceptar un intento. En esta feature se descarta |

## 5. Requisitos funcionales

### R1 — Iniciar sesión con credenciales verificadas

**Historia:** Como visitante quiero que mi correo y mi clave se verifiquen de verdad para que la aplicación solo se abra si la cuenta es mía.

**Criterios de aceptación**

1. **R1.1** — WHEN el visitante envía el panel en modo `entrar` con un correo y una clave que corresponden a una cuenta existente THE SYSTEM SHALL navegar a `#/perfil`.
2. **R1.2** — IF el correo y la clave no corresponden a ninguna cuenta THEN THE SYSTEM SHALL permanecer en el acceso y mostrar en el mensaje de formulario `That email and password don't match an account.`
3. **R1.3** — WHEN se envía el panel THE SYSTEM SHALL recortar los espacios al inicio y al final del correo antes de enviarlo, y enviar la clave tal cual se escribió.
4. **R1.4** — WHEN un intento termina con éxito THE SYSTEM SHALL descartar la sesión devuelta, sin escribirla en ningún almacenamiento del navegador.

### R2 — Crear una cuenta desde el mismo panel

**Historia:** Como visitante sin cuenta quiero registrarme con correo y clave para poder entrar sin salir de la pantalla de acceso.

**Criterios de aceptación**

1. **R2.1** — WHEN el visitante envía el panel en modo `registrar` con un correo sin cuenta y una clave que el servidor acepta THE SYSTEM SHALL crear la cuenta y navegar a `#/perfil`.
2. **R2.2** — IF el correo enviado en modo `registrar` ya tiene una cuenta THEN THE SYSTEM SHALL permanecer en el acceso y mostrar en el mensaje de formulario `That email already has an account. Sign in instead.`
3. **R2.3** — IF el servidor rechaza la clave por ser demasiado corta THEN THE SYSTEM SHALL permanecer en el acceso y mostrar en el mensaje de formulario `Use at least 6 characters.`
4. **R2.4** — WHEN el visitante escribe en modo `registrar` una clave de menos de seis caracteres THE SYSTEM SHALL habilitar el botón de envío, dejando que el servidor juzgue la longitud (ver BR2).

### R3 — Alternar entre los dos modos del panel

**Historia:** Como visitante quiero pasar de iniciar sesión a crear una cuenta en el mismo sitio para no perder lo que ya escribí ni buscar otra pantalla.

**Criterios de aceptación**

1. **R3.1** — WHEN el visitante activa el enlace del pie en modo `entrar` THE SYSTEM SHALL pasar el panel a modo `registrar`, mostrando el título `Create your account`, el botón `Create account` y el enlace `Already have an account?`
2. **R3.2** — WHEN el visitante activa el enlace del pie en modo `registrar` THE SYSTEM SHALL volver a modo `entrar`, mostrando el título `Welcome back`, el botón `Sign in` y el enlace `Create an account`.
3. **R3.3** — WHEN el panel cambia de modo THE SYSTEM SHALL conservar el correo y la clave ya escritos.
4. **R3.4** — WHEN el panel cambia de modo THE SYSTEM SHALL retirar el mensaje de formulario y los errores de campo visibles.
5. **R3.5** — WHEN se monta el acceso THE SYSTEM SHALL mostrarlo en modo `entrar`, cualquiera haya sido el modo en una visita anterior.

### R4 — Un solo lugar para los fallos del servidor

**Historia:** Como visitante quiero que el motivo del rechazo aparezca en un sitio fijo y sin culpar a un campo, para saber qué corregir sin que la pantalla me engañe.

**Criterios de aceptación**

1. **R4.1** — WHEN un intento falla THE SYSTEM SHALL mostrar el motivo en un único mensaje de formulario, ubicado entre la fila de opciones y el botón de envío, y anunciado como alerta.
2. **R4.2** — IF la petición no llega a completarse por un fallo de red THEN THE SYSTEM SHALL mostrar en el mensaje de formulario `Can't reach the server. Is Supabase running?`
3. **R4.3** — IF la llave anónima no está configurada THEN THE SYSTEM SHALL mostrar en el mensaje de formulario `Auth isn't configured — see .env.example.` sin emitir ninguna petición.
4. **R4.4** — IF el servidor rechaza el intento por una causa que el sistema no reconoce THEN THE SYSTEM SHALL mostrar en el mensaje de formulario `Something went wrong. Try again.`
5. **R4.5** — WHEN el visitante escribe en el campo de correo o en el de clave THE SYSTEM SHALL retirar el mensaje de formulario.
6. **R4.6** — WHEN un intento falla THE SYSTEM SHALL dejar vacíos los espacios de error de ambos campos.
7. **R4.7** — WHEN el servidor rechaza el intento con una causa reconocida THE SYSTEM SHALL mostrar el mensaje correspondiente a esa causa tanto si el cuerpo de la respuesta nombra el código como `error_code` junto a `msg` como si lo nombra `code` junto a `message`.

### R5 — Un intento a la vez

**Historia:** Como visitante quiero que un doble clic o un servidor lento no dispare dos registros ni dos inicios de sesión, para no terminar con un resultado que no pedí.

**Criterios de aceptación**

1. **R5.1** — WHILE hay un intento en vuelo THE SYSTEM SHALL mantener el botón de envío deshabilitado.
2. **R5.2** — WHILE hay un intento en vuelo THE SYSTEM SHALL ignorar la activación del enlace que cambia de modo.
3. **R5.3** — WHEN un intento termina, con éxito o con fallo, THE SYSTEM SHALL volver a habilitar el botón si el correo y la clave siguen siendo válidos en su forma.
4. **R5.4** — WHEN el visitante activa el botón de envío THE SYSTEM SHALL emitir exactamente una petición por activación.

## 6. Requisitos no funcionales

| # | Categoría | Requisito |
|---|---|---|
| NF1 | Dependencias | La feature no agrega dependencias de ejecución ni de desarrollo a `package.json` (regla del `CLAUDE.md`: no agregar dependencias sin necesidad) |
| NF2 | Pruebas | Las pruebas unitarias no abren conexiones de red: el acceso al servidor se sustituye desde el test |
| NF3 | Configuración | La URL y la llave anónima se leen de la configuración del entorno; ningún valor de configuración local queda versionado |

## 7. Reglas de negocio e invariantes

- **BR1** — La sesión devuelta por Supabase se descarta al terminar el intento: no se persiste, no sobrevive a la llamada y no queda accesible para el resto de la aplicación.
- **BR2** — La longitud mínima de la clave la define el servidor (`minimum_password_length` en `supabase/config.toml`) y nunca el cliente. Hay una sola fuente de verdad para esa regla.
- **BR3** — Hay a lo sumo un intento de autenticación en vuelo a la vez.
- **BR4** — Un fallo del servidor nunca se atribuye a un campo concreto: los errores de campo siguen juzgando solo la forma de lo escrito.
- **BR5** — Todo fallo tiene un mensaje: no existe un camino en que el intento falle y la pantalla quede igual que antes de enviarlo.

## 8. Comportamiento que no debe cambiar

*(Verificado leyendo `web/src/onboarding/login-estado.ts`, `web/src/onboarding/login.ts`, `web/src/rutas.ts` y `web/src/main.ts`.)*

- **REG1** — WHEN el visitante sale de un campo cuyo contenido es inválido THEN THE SYSTEM SHALL CONTINUE TO mostrar el mensaje de ese campo bajo el campo.
- **REG2** — WHEN el visitante escribe en un campo que tiene un error visible THEN THE SYSTEM SHALL CONTINUE TO retirar ese error sin volver a evaluar el campo.
- **REG3** — WHEN se monta el acceso con los campos vacíos THEN THE SYSTEM SHALL CONTINUE TO mantener el botón deshabilitado y la pantalla sin ningún mensaje de error.
- **REG4** — WHEN el visitante activa el control `Show` / `Hide` THEN THE SYSTEM SHALL CONTINUE TO alternar la visibilidad de la clave y el texto del control.
- **REG5** — WHEN el visitante activa `Remember me` THEN THE SYSTEM SHALL CONTINUE TO alternar su estado marcado, sin efecto sobre la autenticación.
- **REG6** — WHEN el fragmento de la URL no corresponde a una pantalla conocida THEN THE SYSTEM SHALL CONTINUE TO mostrar el acceso.
- **REG7** — WHEN se navega directamente a `#/perfil`, `#/conoceme` o `#/plan` THEN THE SYSTEM SHALL CONTINUE TO montar esa pantalla sin exigir credenciales, porque esta feature no agrega guardia de rutas.

## 9. Supuestos

- **S1** — El correo se recorta antes de enviarse (R1.3). Hoy `correoValido` recorta solo para juzgar la forma, pero el valor que se enviaría conserva los espacios, y el servidor los rechazaría.
- **S2** — El cambio de modo queda bloqueado mientras hay un intento en vuelo (R5.2). Es la forma más simple de evitar que una respuesta llegue a un panel que ya cambió de significado.
- **S3** — Un rechazo por límite de tasa (`config.toml` fija `sign_in_sign_ups = 30`) cae en el mensaje genérico de R4.4. Puede aparecer al repetir el loop E2E; ver Q1.
- **S4** — La llave anónima sale de una corrida real de `supabase start`, que exige Docker en marcha. Supabase no está corriendo al escribir este documento y `supabase/.temp/start-secrets` está vacío, así que el valor todavía no se conoce.
- **S5** — La tecla Enter no envía el panel: el acceso no usa un elemento `form`, sino contenedores con un botón, y esta feature no lo cambia. Ver Q3.
- **S6** — Supabase normaliza el correo a minúsculas, así que registrar `A@b.com` e iniciar sesión con `a@b.com` funciona. No se agrega normalización en el cliente.
- **S7** — El recorrido E2E existente deja de pasar por el acceso: `e2e/onboarding.spec.ts` define el ayudante `ingresar()` (línea 11), invocado desde las líneas 54, 101, 157 y 183, y además la prueba de la línea 34 hace el clic en línea. Son diez pruebas que hoy dependen de que el acceso sea una maqueta.

## 10. Preguntas abiertas

| # | Pregunta | Bloquea el diseño | Estado |
|---|---|---|---|
| Q1 | ¿El rechazo por límite de tasa merece su propio mensaje (`Too many attempts. Wait a minute.`) o basta el genérico de R4.4? | No | Abierta |
| Q2 | ¿El botón debe cambiar de texto mientras el intento está en vuelo (`Signing in…`), o alcanza con deshabilitarlo? | No | Abierta |
| Q3 | ¿Enter debería enviar el panel? Hoy no lo hace, y arreglarlo implica envolver los campos en un `form`. | No | Abierta |
