# Plan de pruebas E2E — Login contra Supabase local

| | |
|---|---|
| **Spec** | `docs/specs/2026-09-22-login-supabase-local/` |
| **App** | `npm run dev` → http://localhost:5173 |
| **Runner** | `npm run test:e2e` (Playwright, `e2e/login-supabase-local.spec.ts`) |
| **Escrito** | 2026-09-24 |

## 1. Qué se prueba acá y qué no

Estos tres casos prueban **que el panel de acceso habla de verdad con Supabase y que el usuario entiende el resultado**. Es la única capa donde eso es demostrable: los 34 casos unitarios de `design.md` §7 cubren el mapeo de errores, el transporte y la máquina de estados por separado, cada uno contra un doble. Ninguno puede afirmar que el navegador llega al servidor, ni que el mensaje correcto termina en la pantalla correcta.

Lo que deliberadamente **no** se prueba acá, porque ya está cubierto abajo y repetirlo con un navegador alrededor sería un unitario caro: las tres formas del cuerpo de error de GoTrue (CP1–CP10), el endpoint y las cabeceras de cada modo (CP11–CP17), y las transiciones del estado del panel (CP18–CP34). Tampoco se prueba nada de `requirements.md` §2 "Fuera de alcance" — Google, recuperar clave, `Remember me`, persistencia de sesión y guardia de rutas siguen fuera, y un caso que los tocara estaría inventando alcance.

Un hueco que vale nombrar y que **no** se planea porque ningún criterio lo fija: el panel no da ninguna señal visible mientras el intento viaja más allá de deshabilitar el botón. Es la pregunta abierta Q2 de `requirements.md` §10; si se decide que sí, va a `/specify`, no a este plan.

## 2. Precondiciones

- Supabase local arriba: `GET http://127.0.0.1:54321/auth/v1/health` responde `200`. `playwright.config.ts` lo levanta como segundo `webServer`, así que la suite lo arranca sola si Docker está corriendo.
- `web/.env.local` con `VITE_SUPABASE_ANON_KEY` de esa corrida. Sin eso todos los casos fallan con `Auth isn't configured — see .env.example.`, que es un fallo de entorno y no un defecto.
- **Ningún dato sembrado.** Los tres casos generan sus propios correos, únicos por corrida (marca de tiempo + aleatorio), y el que necesita una cuenta preexistente la crea él mismo. El registro entrega la cuenta al instante porque `config.toml` tiene `enable_confirmations = false`.
- **Cada caso arranca con el panel recién montado.** Navegar a la misma URL con idéntico fragmento no lo remonta, así que un caso no puede heredar el modo del anterior: se fuerza recarga o página nueva.

## 3. Casos

### E1 — Me creo una cuenta y entro — · happy path

- **Criterios:** R2.1, R1.4, R3.1
- **Como usuario quiero:** crearme una cuenta desde la misma pantalla de acceso y quedar adentro, sin pasar por ninguna otra página.
- **Pasos:**
  1. Abrir `http://localhost:5173/#/login` con el panel recién montado.
  2. Hacer clic en el enlace del pie `Create an account`.
  3. Comprobar que el panel ahora dice `Create your account` y que el botón dice `Create account`.
  4. Escribir un correo nuevo, único de esta corrida, por ejemplo `e2e-1758700000000-483921@example.com`.
  5. Escribir la clave `supersecret123`.
  6. Hacer clic en el botón de envío.
- **Resultado esperado:**
  - La URL termina en `#/perfil`.
  - Se ve el encabezado `Tell us about your finances`, que es el efecto real de haber entrado y no solo el cambio de fragmento.
  - `localStorage`, `sessionStorage` y las cookies del contexto quedan **vacíos**: la sesión que Supabase devolvió se descartó (R1.4).
- **Cómo falla:** si el botón navegara sin consultar al servidor, este caso pasaría igual — por eso el aserto de los almacenamientos es el que tiene valor. Si la sesión se persistiera "por conveniencia", aparecería una clave `sb-…-auth-token` en `localStorage` y el caso se pondría rojo. Si el registro no funcionara, quedaría en `#/login` con un mensaje de error.

### E2 — Me equivoco de clave y la pantalla me lo dice sin culpar a un campo · error

- **Criterios:** R1.2, R4.1, R4.6
- **Como usuario quiero:** que cuando mis credenciales no sirvan me lo digan claro, sin que la pantalla señale un campo que puede estar bien.
- **Pasos:**
  1. Abrir `http://localhost:5173/#/login` con el panel recién montado, en modo `entrar`.
  2. Escribir un correo que no tiene cuenta, único de esta corrida, por ejemplo `e2e-nadie-1758700000000-771204@example.com`.
  3. Escribir la clave `claveIncorrecta999`.
  4. Hacer clic en `Sign in`.
- **Resultado esperado:**
  - La URL **sigue** en `#/login`: el intento no abrió la aplicación.
  - Aparece el mensaje de formulario con el texto exacto `That email and password don't match an account.`, y es el nodo con rol de alerta.
  - Los espacios de error **de los dos campos quedan vacíos**: ningún texto bajo `Email` ni bajo `Password` (R4.6).
- **Cómo falla:** si el mapeo de errores se rompiera —por ejemplo si `code` volviera a leerse como slug cuando trae el número del status— el mensaje sería `Something went wrong. Try again.` y el aserto del texto exacto lo atraparía. Si alguien decidiera "ayudar" poniendo el error bajo `Password`, el tercer aserto se pondría rojo: el servidor no sabe cuál de los dos campos está mal.

### E3 — Intento registrarme con un correo que ya usé y me mandan a entrar · error

- **Criterios:** R2.2, R4.1
- **Como usuario quiero:** que si ya tengo cuenta con ese correo me lo digan y me sugieran iniciar sesión, en vez de fallar sin explicación o crearme una cuenta duplicada.
- **Pasos:**
  1. Abrir el acceso, pasar a modo registrar y crear la cuenta `e2e-dup-1758700000000-990517@example.com` con la clave `supersecret123`. Llegar a `#/perfil` — esto es la precondición del caso, hecha por la interfaz.
  2. Volver al acceso con el panel recién montado.
  3. Hacer clic en `Create an account` para volver al modo registrar.
  4. Escribir **el mismo** correo del paso 1 y la misma clave.
  5. Hacer clic en `Create account`.
- **Resultado esperado:**
  - La URL **sigue** en `#/login`.
  - Aparece el mensaje de formulario con el texto exacto `That email already has an account. Sign in instead.`
  - El panel sigue en modo registrar: el título sigue diciendo `Create your account`. El fallo no cambia de modo por su cuenta.
- **Cómo falla:** si el segundo registro entrara igual, la URL sería `#/perfil` y el caso se pondría rojo — que es lo que pasaría si el cliente ignorara el `422` del servidor. Si el mensaje fuera el genérico, el aserto del texto exacto lo atraparía: `user_already_exists` es uno de los tres slugs que `errores.ts` reconoce, y perderlo es la regresión silenciosa que este caso vigila.

## 4. Trazabilidad

| Caso | Criterios | Tarea(s) | ¿Cubierto abajo? |
|---|---|---|---|
| E1 | R2.1, R1.4, R3.1 | T9, T6, T3 | CP12, CP14, CP27 (unitarios) — pero ninguno afirma que el navegador llegue al servidor ni que el almacenamiento quede limpio |
| E2 | R1.2, R4.1, R4.6 | T9, T5, T2 | CP1, CP15, CP26, CP31 (unitarios) — ninguno afirma dónde aparece el mensaje en la pantalla |
| E3 | R2.2, R4.1 | T9, T5, T2 | CP4, CP5, CP26 (unitarios) — ninguno usa el servidor real, que es quien decide el `422` |

Los criterios que **no** toca este plan y siguen cubiertos solo por unitarios: R1.1, R1.3, R2.3, R2.4, R3.2–R3.5, R4.2–R4.5, R4.7, R5.1–R5.4, y todos los `BR#` y `REG#`. Es lo esperado — tres casos son un muestreo de usuario, no la trazabilidad de `tasks.md` §5.

## 5. Selectores conocidos

Todos verificados contra la app viva durante la implementación (bitácoras de T6 y T9), no deducidos del código.

| Qué | Cómo se ubica hoy | Archivo |
|---|---|---|
| Campo de correo | `getByRole("textbox", { name: "Email" })` | `web/src/onboarding/login.ts` |
| Campo de clave | `getByRole("textbox", { name: "Password" })` | `web/src/onboarding/login.ts` |
| Botón de envío | `.formulario .boton--primario` — **doble guion**, la clase es `boton--primario` | `web/src/ds/componentes.ts` |
| Enlace del pie (a registrar) | `getByRole("button", { name: "Create an account" })` | `web/src/onboarding/login.ts` |
| Enlace del pie (a entrar) | en modo registrar dice `Sign in` | `web/src/onboarding/login-estado.ts` |
| Título del panel | `.formulario__titulo` — `Welcome back` / `Create your account` | `web/src/onboarding/login.ts` |
| Mensaje de servidor | `.mensaje-formulario`, con `role="alert"`; lleva `hidden` cuando está vacío, así que `getByRole("alert")` **no lo encuentra** sin texto | `web/src/ds/componentes.ts` |
| Errores de campo | `.campo__error` — hay uno por campo, vacío cuando no hay error | `web/src/ds/componentes.ts` |
| Encabezado del perfil | `getByRole("heading", { name: "Tell us about your finances" })` | pantalla de perfil |

**Aviso para `generate-tests`:** el botón de envío no tiene nombre accesible estable entre modos —cambia de `Sign in` a `Create account`—, así que ubicarlo por rol y nombre obliga a cambiar el selector según el modo. Es más robusto ubicarlo por la clase `.formulario .boton--primario`, que no cambia. El enlace del pie sí conviene ubicarlo por nombre, porque es la forma en que el usuario lo distingue del botón.
