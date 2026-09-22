# Diseño — Login contra Supabase local

| | |
|---|---|
| **Requisitos** | [requirements.md](./requirements.md) |
| **Estado** | Borrador |
| **Última actualización** | 2026-09-22 |

## 1. Resumen de la solución

Aparece una carpeta nueva, `web/src/auth/`, con tres piezas pequeñas y sin DOM: una que resuelve **dónde** está Supabase y con qué llave, otra que traduce **por qué** falló un intento, y una tercera que **emite** el intento y devuelve un resultado cerrado. El panel de acceso no cambia de forma: conserva el reparto que ya tiene —`login-estado.ts` decide, `login.ts` pinta— y lo que gana es un modo (`entrar` / `registrar`), un indicador de envío en curso y un mensaje de formulario. El clic en el botón deja de navegar directamente y pasa a esperar la respuesta del servidor; solo si el servidor acepta, se llama a `navegar("perfil")` igual que hoy.

Nada de esto agrega dependencias: el transporte es `fetch` contra los dos endpoints de GoTrue, y ese `fetch` se recibe como parámetro para que las pruebas unitarias no abran una conexión. La sesión que devuelve Supabase nunca sale de la función que la recibe — el tipo del resultado no tiene dónde ponerla.

## 2. Arquitectura

| Componente | Responsabilidad | Nuevo / Existente | Ubicación |
|---|---|---|---|
| `configuracion` | Resuelve la URL y la llave anónima del entorno, o declara que faltan | Nuevo | `web/src/auth/configuracion.ts` |
| `errores` | Traduce una respuesta de fallo a un código, y un código a su mensaje | Nuevo | `web/src/auth/errores.ts` |
| `autenticar` | Emite el intento contra GoTrue y devuelve un resultado cerrado | Nuevo | `web/src/auth/autenticar.ts` |
| `vite-env.d.ts` | Declara los tipos de `import.meta.env` que consume `configuracion` | Nuevo | `web/src/vite-env.d.ts` |
| `login-estado` | Decide qué muestra el panel: modo, validez, envío y mensajes | Ampliado | `web/src/onboarding/login-estado.ts` |
| `login` | Pinta el panel y conecta los eventos con las transiciones | Ampliado | `web/src/onboarding/login.ts` |
| `mensajeFormulario` | Nodo de alerta del panel, único lugar de los fallos de servidor | Ampliado (DS) | `web/src/ds/componentes.ts` + `web/src/onboarding/pantallas.css` |
| Recorrido E2E | Deja de atravesar el acceso para llegar a las pantallas de adentro | Ampliado | `e2e/onboarding.spec.ts` |
| Arranque de la suite | Levanta Supabase antes de correr los E2E | Ampliado | `playwright.config.ts` |
| Configuración local | Plantilla versionada y valores reales ignorados | Nuevo | `.env.example`, `.gitignore` |

La dirección de las dependencias es una sola: `login.ts` → `login-estado.ts` → `errores.ts`, y `login.ts` → `autenticar.ts` → {`configuracion.ts`, `errores.ts`}. Nada de `auth/` conoce el DOM y nada de `auth/` importa de `onboarding/`.

## 3. Flujo de datos

**Flujo A: iniciar sesión con éxito** *(cubre R1.1, R1.3, R1.4, R5.1, R5.3, R5.4)*

1. El visitante escribe correo y clave; `escribir` limpia el error del campo y el mensaje de formulario.
2. Activa el botón. El manejador comprueba `puedeEnviar(estado)` y, si es falso, no hace nada.
3. `enviar(estado)` marca `enviando`; `pintar()` deshabilita el botón.
4. `autenticar("entrar", { correo: estado.correo.trim(), clave: estado.clave })` emite `POST {url}/auth/v1/token?grant_type=password`.
5. GoTrue responde `200` con la sesión. `autenticar` **no la lee**: devuelve `{ ok: true }`.
6. `responder(estado, resultado)` apaga `enviando` y deja el mensaje vacío.
7. `navegar("perfil")` cambia el fragmento, y el router monta el perfil como siempre.

**Flujo B: crear una cuenta con un correo que ya existe** *(cubre R2.2, R4.1, R4.6, R5.3)*

1. El visitante activa el enlace del pie; `alternarModo` pasa a `registrar` conservando lo escrito.
2. Envía. `autenticar("registrar", …)` emite `POST {url}/auth/v1/signup`.
3. GoTrue responde `422`. `codigoDeRespuesta(422, cuerpo)` devuelve `user_already_exists`.
4. `autenticar` devuelve `{ ok: false, codigo: "user_already_exists" }`.
5. `responder` apaga `enviando` y fija `mensaje = mensajeDe(codigo)`.
6. `pintar()` escribe ese texto en el nodo de alerta y lo muestra; los espacios de error de los campos siguen vacíos.

**Flujo C: Supabase apagado** *(cubre R4.2, BR5)*

1. Envío igual que en el flujo A, paso 4.
2. `fetch` lanza. El `try/catch` de `autenticar` devuelve `{ ok: false, codigo: "sin-red" }` sin propagar la excepción.
3. El panel muestra `Can't reach the server. Is Supabase running?` y el botón vuelve a habilitarse.

**Flujo D: sin llave anónima** *(cubre R4.3)*

1. `configuracion()` devuelve `null` porque `VITE_SUPABASE_ANON_KEY` falta o está vacía.
2. `autenticar` corta antes de tocar la red y devuelve `{ ok: false, codigo: "sin-configurar" }`.
3. El panel muestra `Auth isn't configured — see .env.example.`

## 4. Interfaces

```ts
// web/src/auth/errores.ts
export type CodigoAuth =
  | "invalid_credentials"
  | "user_already_exists"
  | "weak_password"
  | "sin-red"
  | "sin-configurar"
  | "desconocido";

// Lee el codigo del cuerpo mirando, en orden, `code`, `error_code` y `error`;
// si ninguno esta, cae a una heuristica sobre `msg` / `message`. Ver D6.
export function codigoDeRespuesta(estado: number, cuerpo: unknown): CodigoAuth;

export function mensajeDe(codigo: CodigoAuth): string;
```

```ts
// web/src/auth/configuracion.ts
export type Configuracion = { readonly url: string; readonly llave: string };

// null significa "sin-configurar": falta la llave. La URL tiene valor por
// defecto porque el puerto local es fijo; la llave no puede inventarse.
export function configuracion(): Configuracion | null;
```

```ts
// web/src/auth/autenticar.ts
import type { CodigoAuth } from "./errores";
import type { Configuracion } from "./configuracion";

export type ModoAuth = "entrar" | "registrar";

// La variante de exito no lleva datos A PROPOSITO: es BR1 garantizada por el
// tipo. No hay donde poner el access_token, asi que no puede filtrarse. Ver D3.
export type ResultadoAuth = { ok: true } | { ok: false; codigo: CodigoAuth };

export type Dependencias = {
  readonly peticion?: typeof fetch;
  readonly config?: Configuracion | null;
};

export function autenticar(
  modo: ModoAuth,
  credenciales: { readonly correo: string; readonly clave: string },
  dependencias?: Dependencias,
): Promise<ResultadoAuth>;
```

```ts
// web/src/onboarding/login-estado.ts  (ampliaciones)
export type ModoLogin = ModoAuth;

export type TextosLogin = {
  readonly titulo: string;
  readonly subtitulo: string;
  readonly boton: string;
  readonly pieTexto: string;
  readonly pieEnlace: string;
};

export function textosDe(modo: ModoLogin): TextosLogin;

export function alternarModo(estado: EstadoLogin): EstadoLogin;
export function enviar(estado: EstadoLogin): EstadoLogin;
export function responder(estado: EstadoLogin, resultado: ResultadoAuth): EstadoLogin;
export function puedeEnviar(estado: EstadoLogin): boolean; // reemplaza a puedeEntrar
```

```ts
// web/src/ds/componentes.ts  (ampliacion)
export type MensajeFormulario = { raiz: HTMLElement };

// role="alert" fijo; el nodo vive siempre en el DOM y se oculta con `hidden`
// cuando no hay texto, de modo que getByRole("alert") no lo encuentre. Ver D9.
export function mensajeFormulario(): MensajeFormulario;
```

Los textos concretos que devuelve `textosDe`:

| Campo | `entrar` | `registrar` |
|---|---|---|
| `titulo` | `Welcome back` | `Create your account` |
| `subtitulo` | `Sign in to continue building your Northstar plan.` | `Start building your Northstar plan in a minute.` |
| `boton` | `Sign in` | `Create account` |
| `pieTexto` | `New here?` | `Already have an account?` |
| `pieEnlace` | `Create an account` | `Sign in` |

El `subtitulo` es lo único de esta tabla que ningún criterio fija: es copia, y se decide aquí.

## 5. Modelos de datos

No hay persistencia: esta feature no crea tablas, no escribe migraciones y no guarda nada en el navegador. El único modelo es el estado en memoria del panel, que vive lo que vive la pantalla.

```ts
export type CampoLogin = "correo" | "clave";

export type EstadoLogin = {
  readonly modo: ModoLogin;          // nuevo — arranca en "entrar"
  readonly correo: string;
  readonly clave: string;
  readonly claveVisible: boolean;
  readonly recordarme: boolean;
  readonly enviando: boolean;        // nuevo — hay un intento en vuelo
  readonly mensaje: string | undefined; // nuevo — fallo de servidor, unico
  readonly errores: Readonly<Partial<Record<CampoLogin, string>>>;
};

export const LOGIN_INICIAL: EstadoLogin = {
  modo: "entrar",
  correo: "",
  clave: "",
  claveVisible: false,
  recordarme: false,
  enviando: false,
  mensaje: undefined,
  errores: {},
};
```

El cuerpo que viaja a GoTrue en los dos modos es el mismo, y es lo único que sale del navegador:

```ts
{ email: string /* recortado */, password: string /* literal */ }
```

**Restricciones e invariantes**

- `mensaje` es una propiedad **requerida** de tipo `string | undefined`, no una propiedad opcional: `web/tsconfig.json` tiene `exactOptionalPropertyTypes: true`, y declararla opcional obligaría a distinguir "ausente" de "indefinida" sin ganar nada.
- `enviando === true` implica botón deshabilitado y cambio de modo ignorado — implementa **BR3** y **R5.2**.
- `ResultadoAuth` en su variante de éxito no tiene campos — implementa **BR1**.
- `errores` solo lo escriben `abandonar` y `escribir`; ni `responder` ni `enviar` lo tocan — implementa **BR4**.

## 6. Manejo de errores

| Caso | Representación | Qué ve el usuario | Requisito |
|---|---|---|---|
| Credenciales que no corresponden a una cuenta | `invalid_credentials` | `That email and password don't match an account.` | R1.2 |
| Registro sobre un correo con cuenta | `user_already_exists` | `That email already has an account. Sign in instead.` | R2.2 |
| Clave rechazada por corta | `weak_password` | `Use at least 6 characters.` | R2.3 |
| `fetch` lanza (Supabase apagado, DNS, CORS) | `sin-red` | `Can't reach the server. Is Supabase running?` | R4.2 |
| Falta la llave anónima | `sin-configurar` | `Auth isn't configured — see .env.example.` | R4.3 |
| Fallo con código no reconocido, cuerpo ilegible, `429`, `5xx` | `desconocido` | `Something went wrong. Try again.` | R4.4, S3 |

Los seis códigos comparten destino: el nodo de alerta del panel, uno solo, entre la fila de opciones y el botón (**R4.1**). Ningún código escribe en `errores`, así que los espacios de error de los campos quedan vacíos (**R4.6**, **BR4**), y ningún camino de fallo deja la pantalla sin mensaje (**BR5**): `codigoDeRespuesta` devuelve `desconocido` como último recurso, nunca `undefined`.

La lectura del código en el cuerpo, en orden (**R4.7**, **D6**):

1. `cuerpo.code` — GoTrue reciente.
2. `cuerpo.error_code` — GoTrue intermedio.
3. `cuerpo.error` — respuestas OAuth antiguas de `/token`, donde `invalid_grant` significa credenciales inválidas.
4. Heurística sobre `cuerpo.msg` o `cuerpo.message`: `/already registered/i` → `user_already_exists`; `/at least .* characters/i` → `weak_password`.
5. `desconocido`.

## 7. Estrategia de pruebas unitarias

Corren con `npm test` (vitest ya incluye `web/src/**/*.test.ts`).

### `web/src/auth/errores.test.ts`

| # | Caso de prueba | Resultado esperado | Requisito |
|---|---|---|---|
| CP1 | `400` con `{ code: "invalid_credentials" }` | `invalid_credentials` | R1.2, R4.7 |
| CP2 | `400` con `{ error_code: "invalid_credentials", msg: "…" }` | `invalid_credentials` | R4.7 |
| CP3 | `400` con `{ error: "invalid_grant", error_description: "…" }` | `invalid_credentials` | R4.7 |
| CP4 | `422` con `{ code: "user_already_exists" }` | `user_already_exists` | R2.2 |
| CP5 | `422` con solo `{ msg: "User already registered" }` | `user_already_exists` | R2.2, R4.7 |
| CP6 | `422` con `{ code: "weak_password" }` | `weak_password` | R2.3 |
| CP7 | `422` con solo `{ msg: "Password should be at least 6 characters" }` | `weak_password` | R2.3, R4.7 |
| CP8 | `429` con `{ code: "over_request_rate_limit" }` | `desconocido` | R4.4, S3 |
| CP9 | `500` con cuerpo `null` o texto no-JSON | `desconocido` | R4.4, BR5 |
| CP10 | Cada uno de los seis códigos pasado a `mensajeDe` | El texto exacto de la tabla §6 | R1.2, R2.2, R2.3, R4.2, R4.3, R4.4 |

### `web/src/auth/autenticar.test.ts`

Con un `fetch` falso inyectado por `dependencias.peticion`; ninguna prueba abre la red (**NF2**).

| # | Caso de prueba | Resultado esperado | Requisito |
|---|---|---|---|
| CP11 | Modo `entrar` | Llama a `{url}/auth/v1/token?grant_type=password`, método `POST`, cabeceras `apikey` y `Content-Type: application/json` | R1.1 |
| CP12 | Modo `registrar` | Llama a `{url}/auth/v1/signup` con las mismas cabeceras | R2.1 |
| CP13 | Correo `"  a@b.com  "` con clave `" x "` | El cuerpo lleva `email: "a@b.com"` y `password: " x "` sin tocar | R1.3 |
| CP14 | Respuesta `200` con sesión completa en el cuerpo | `{ ok: true }` — el objeto devuelto no tiene ninguna propiedad más | R1.4, BR1 |
| CP15 | Respuesta `400` con `invalid_credentials` | `{ ok: false, codigo: "invalid_credentials" }` | R1.2 |
| CP16 | El `fetch` inyectado lanza | `{ ok: false, codigo: "sin-red" }` y la promesa no se rechaza | R4.2 |
| CP17 | `config: null` | `{ ok: false, codigo: "sin-configurar" }` y el `fetch` inyectado no se llama ni una vez | R4.3 |

### `web/src/onboarding/login-estado.test.ts` (casos nuevos)

| # | Caso de prueba | Resultado esperado | Requisito |
|---|---|---|---|
| CP18 | `LOGIN_INICIAL` | `modo === "entrar"`, `enviando === false`, `mensaje === undefined` | R3.5, REG3 |
| CP19 | `alternarModo` desde `entrar` | `modo === "registrar"` | R3.1 |
| CP20 | `alternarModo` desde `registrar` | `modo === "entrar"` | R3.2 |
| CP21 | `alternarModo` con correo y clave escritos | Los dos valores sobreviven intactos | R3.3 |
| CP22 | `alternarModo` con un error de campo y un mensaje visibles | `errores` vacío y `mensaje === undefined` | R3.4 |
| CP23 | `alternarModo` con `enviando === true` | Devuelve el estado sin cambio alguno, incluido el modo | R5.2, BR3 |
| CP24 | `textosDe("entrar")` y `textosDe("registrar")` | Los títulos, botones y enlaces de la tabla §4 | R3.1, R3.2 |
| CP25 | `enviar` sobre un estado con mensaje | `enviando === true` y `mensaje === undefined` | R5.1 |
| CP26 | `responder` con `{ ok: false, codigo }` | `enviando === false` y `mensaje === mensajeDe(codigo)` | R4.1, BR5 |
| CP27 | `responder` con `{ ok: true }` | `enviando === false` y `mensaje === undefined` | R1.1, R2.1 |
| CP28 | `escribir` sobre un estado con mensaje | `mensaje === undefined` | R4.5 |
| CP29 | `puedeEnviar` con campos válidos y `enviando === true` | `false` | R5.1, BR3 |
| CP30 | `puedeEnviar` con clave de tres caracteres y correo válido | `true` | R2.4, BR2 |
| CP31 | `responder` con fallo sobre un estado con `errores` poblado | `errores` queda exactamente igual | R4.6, BR4 |
| CP32 | `abandonar` con correo inválido, y luego `escribir` | Aparece y desaparece el error del campo, como hoy | REG1, REG2 |
| CP33 | `alternarClaveVisible` y `alternarRecordarme` | Alternan su campo sin tocar `modo`, `enviando` ni `mensaje` | REG4, REG5 |
| CP34 | `responder` con éxito sobre un estado con `errores` poblado | `errores` queda igual | R4.6 |

`web/src/rutas.test.ts` ya cubre **REG6** y no cambia.

**Fuera del alcance de pruebas unitarias**

- **R4.1** (la posición del nodo en el panel y su rol de alerta) y **R5.4** (una petición por activación en el DOM real): son propiedades del árbol pintado, no del estado. Van al E2E.
- **R1.4** en su sentido literal —que no se escriba nada en el almacenamiento del navegador— solo se puede afirmar con un navegador. CP14 cubre la mitad demostrable sin DOM: que el resultado no transporta la sesión.
- **R2.1, R2.2, R1.1, R1.2 de punta a punta**: los tres casos del loop E2E (`e2e-tests-plan.md`) los ejercitan contra GoTrue de verdad, que es lo único que valida que los códigos que mapeamos son los que el servidor manda.
- **REG7** lo cubren los nueve recorridos existentes una vez repuntados a `page.goto`.
- **NF1** y **NF3** se verifican revisando el diff de `package.json` y el `.gitignore`, no con un test.

## 8. Trazabilidad

| Requisito | Componente(s) | Caso de prueba |
|---|---|---|
| R1.1 | `autenticar`, `login.ts` (manejador de envío) | CP11, CP27, E2E-1 |
| R1.2 | `errores.codigoDeRespuesta`, `mensajeDe` | CP1, CP10, CP15, E2E-2 |
| R1.3 | `login.ts` (recorte previo), `autenticar` | CP13 |
| R1.4 | `autenticar` (tipo `ResultadoAuth`) | CP14, E2E-1 |
| R2.1 | `autenticar` (endpoint de registro) | CP12, CP27, E2E-1 |
| R2.2 | `errores.codigoDeRespuesta` | CP4, CP5, CP10, E2E-3 |
| R2.3 | `errores.codigoDeRespuesta` | CP6, CP7, CP10 |
| R2.4 | `login-estado.puedeEnviar` | CP30 |
| R3.1 | `login-estado.alternarModo`, `textosDe`, `login.pintar` | CP19, CP24 |
| R3.2 | `login-estado.alternarModo`, `textosDe`, `login.pintar` | CP20, CP24 |
| R3.3 | `login-estado.alternarModo` | CP21 |
| R3.4 | `login-estado.alternarModo` | CP22 |
| R3.5 | `LOGIN_INICIAL` | CP18 |
| R4.1 | `mensajeFormulario`, `login.pintar` | CP26, E2E-2 |
| R4.2 | `autenticar` (`try/catch`) | CP16, CP10 |
| R4.3 | `configuracion`, `autenticar` | CP17, CP10 |
| R4.4 | `errores.codigoDeRespuesta` (caso final) | CP8, CP9, CP10 |
| R4.5 | `login-estado.escribir` | CP28 |
| R4.6 | `login-estado.responder` | CP31, CP34 |
| R4.7 | `errores.codigoDeRespuesta` | CP2, CP3, CP5, CP7 |
| R5.1 | `login-estado.enviar`, `puedeEnviar` | CP25, CP29 |
| R5.2 | `login-estado.alternarModo` | CP23 |
| R5.3 | `login-estado.responder`, `puedeEnviar` | CP26, CP27 |
| R5.4 | `login.ts` (guarda `puedeEnviar` + botón deshabilitado) | CP29, E2E-2 |
| NF1 | — (ninguna dependencia nueva) | Revisión del diff de `package.json` |
| NF2 | `autenticar` (`fetch` inyectado) | CP11–CP17 |
| NF3 | `configuracion`, `.env.example`, `.gitignore` | Revisión del árbol versionado |
| BR1 | `ResultadoAuth` (variante de éxito vacía) | CP14 |
| BR2 | `login-estado.puedeEnviar` (no juzga longitud) | CP30 |
| BR3 | `login-estado.enviar`, `puedeEnviar`, `alternarModo` | CP23, CP29 |
| BR4 | `login-estado.responder` (no escribe `errores`) | CP31, CP34 |
| BR5 | `errores.codigoDeRespuesta` (`desconocido` final) | CP9, CP26 |
| REG1 | `login-estado.abandonar` (sin cambios) | CP32 |
| REG2 | `login-estado.escribir` | CP32 |
| REG3 | `LOGIN_INICIAL`, `puedeEnviar` | CP18, CP29 |
| REG4 | `login-estado.alternarClaveVisible` | CP33 |
| REG5 | `login-estado.alternarRecordarme` | CP33 |
| REG6 | `rutas.pantallaDe` (sin cambios) | `rutas.test.ts` existente |
| REG7 | `main.ts` (sin guardia), `e2e/onboarding.spec.ts` | Los nueve recorridos existentes repuntados |

`E2E-1`, `E2E-2` y `E2E-3` son los tres casos que `plan-test-cases` va a fijar en `e2e-tests-plan.md`: registro con correo nuevo, credenciales incorrectas, y registro sobre un correo existente.

## 9. Decisiones y alternativas descartadas

### D1 — `fetch` plano contra GoTrue, sin SDK

- **Elegido:** dos llamadas `fetch` a `/auth/v1/token` y `/auth/v1/signup`.
- **Alternativas:** `@supabase/supabase-js` — descartada porque su valor central es administrar la sesión (persistirla, refrescarla, avisar cambios) y aquí la sesión se descarta a propósito; habría que apagar `persistSession` para deshacer justamente lo que aporta. Proxy por el servidor Node de `src/server/` — descartada porque la llave anónima es pública por diseño, no hay sesión que proteger, y obligaría a correr un tercer proceso.
- **Criterio:** **NF1** y el hecho de que **BR1** vuelve inútil casi todo el SDK.

### D2 — Una sola función `autenticar(modo, …)`, no `entrar()` y `registrar()`

- **Elegido:** un único punto de entrada con el modo como parámetro.
- **Alternativas:** dos funciones exportadas, como se habló en el brainstorming.
- **Criterio:** el estado ya lleva `modo`, así que dos funciones obligarían al sitio de llamada a ramificar algo que la máquina de estados ya resolvió. **Este es un desvío del diseño acordado**; es interno y no cambia ningún comportamiento observable, pero está aquí para poder vetarlo.

### D3 — La variante de éxito de `ResultadoAuth` no lleva datos

- **Elegido:** `{ ok: true }`, sin `usuario` ni `token`.
- **Alternativas:** devolver el usuario "por si acaso" — descartada.
- **Criterio:** convierte **BR1** en una propiedad del tipo en vez de una regla de disciplina. No hay dónde poner el token, así que no puede filtrarse ni hoy ni cuando alguien agregue una pantalla.

### D4 — `fetch` y la configuración entran como dependencias opcionales

- **Elegido:** un tercer parámetro `dependencias?: { peticion?, config? }`.
- **Alternativas:** parchear el `fetch` global en los tests, o agregar una librería de dobles.
- **Criterio:** **NF1** y **NF2**. Un parámetro opcional no complica el sitio de llamada real y hace innecesario cualquier andamiaje.

### D5 — Los tipos de `import.meta.env` se declaran a mano

- **Elegido:** `web/src/vite-env.d.ts` con las dos interfaces mínimas.
- **Alternativas:** agregar `"types": ["vite/client"]` a `web/tsconfig.json`.
- **Criterio:** `tsc -p web --noEmit` fallaría hoy sobre `import.meta.env`; declarar dos interfaces de cuatro líneas lo resuelve sin sumar `vite` a la resolución de tipos de `web/`.

### D6 — El mapeo lee tres claves de código y cae a heurística de texto

- **Elegido:** `code` → `error_code` → `error` → texto de `msg`/`message` → `desconocido`.
- **Alternativas:** leer solo `code`.
- **Criterio:** **R4.7**. GoTrue cambió la forma del cuerpo entre versiones del CLI, y leer solo la forma actual degrada en silencio a `desconocido` en la próxima actualización — un fallo que ningún test atraparía si los casos no cubrieran las formas viejas.

### D7 — La suite E2E levanta Supabase

- **Elegido:** una segunda entrada en `webServer` de `playwright.config.ts`, con `command: "supabase start"`, la `url` del health de auth y `reuseExistingServer`.
- **Alternativas:** documentar "levantá Supabase antes de correr los E2E" como precondición.
- **Criterio:** la precondición se olvida, y cuando se olvida los tres casos fallan con un error de red que parece un bug de la aplicación. Treinta segundos de arranque cuestan menos que ese diagnóstico.

### D8 — El recorrido E2E existente deja de atravesar el acceso

- **Elegido:** `ingresar()` pasa a ser `page.goto("/#/perfil")`, y la prueba de la línea 34 conserva la validación de campos pero suelta la aserción de navegación.
- **Alternativas:** registrar un usuario real en cada `beforeEach` para que el recorrido siga siendo realista.
- **Criterio:** esos nueve tests son sobre perfil, movimientos y plan; hacerlos depender de la red los vuelve lentos y frágiles por una razón ajena a lo que prueban. **REG7** existe justamente para garantizar que la navegación directa siga siendo legítima.

### D9 — El nodo de alerta vive siempre en el DOM y se oculta con `hidden`

- **Elegido:** crear el nodo una vez con `role="alert"`, escribir `textContent` y alternar `hidden`.
- **Alternativas:** insertarlo y quitarlo del árbol según haga falta.
- **Criterio:** `role="alert"` anuncia cuando aparece contenido, y `getByRole("alert")` no encuentra un nodo oculto — así "no hay mensaje" se afirma directamente en el E2E. Además evita que el panel salte de alto al aparecer y desaparecer el nodo.

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La llave anónima todavía no se conoce (S4): Supabase no está corriendo y `supabase/.temp/start-secrets` está vacío | Alto | Es la primera tarea del plan: levantar Supabase, capturar la llave y dejar `.env.example`. Sin ella todo cae en `sin-configurar`, que es un camino especificado (**R4.3**) y se lee claro en pantalla |
| GoTrue vuelve a cambiar la forma del cuerpo de error y el mapeo degrada en silencio a `desconocido` | Medio | D6 más CP2, CP3, CP5 y CP7; y el caso E2E-2 afirma el mensaje específico, así que una regresión rompe un test en vez de pasar inadvertida |
| Docker apagado: toda la suite E2E falla | Medio | D7 hace que el fallo diga qué falta en vez de parecer un error de la aplicación |
| Límite de tasa de GoTrue al repetir el loop E2E (S3) | Bajo | Los casos usan correos aleatorios; `sign_in_sign_ups` es 30 y el loop son 3 casos por ronda. Si aparece, se resuelve Q1 |
| CORS entre `localhost:5173` y `127.0.0.1:54321` | Bajo | GoTrue local acepta cualquier origen. Si apareciera, un `proxy` en `vite.config.ts` lo resuelve sin tocar el código |
| `site_url` de `config.toml` apunta a `:3000` y no a `:5173` | Nulo aquí | No afecta: ningún flujo de esta feature usa redirecciones. Importaría para Google o recuperación de clave, ambos fuera de alcance |

## 11. Preguntas abiertas heredadas

| # | Pregunta | Qué cambia según la respuesta |
|---|---|---|
| Q1 | ¿Mensaje propio para el límite de tasa? | Un séptimo valor en `CodigoAuth`, una fila en la tabla §6 y CP8 pasaría a esperar ese código en vez de `desconocido`. Nada más |
| Q2 | ¿El botón cambia de texto mientras envía? | Dos campos más en `TextosLogin` (`botonEnviando`) y una rama en `pintar()`. No toca `auth/` |
| Q3 | ¿Enter envía el panel? | `panelDeFormulario` pasaría de `div` a `form` con un `submit`, y el manejador se movería del `click` del botón al `submit`. Afecta a `login.ts` y al DS, no al estado ni a `auth/` |
