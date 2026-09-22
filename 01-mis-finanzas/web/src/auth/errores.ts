// Traduce una respuesta de fallo de GoTrue a un codigo normalizado, y un codigo
// a lo que lee el usuario. Es puro: no conoce el DOM, ni la red, ni el estado
// del panel. Por eso es el unico lugar donde se decide QUE salio mal, y
// login-estado decide DONDE se muestra.

export type CodigoAuth =
  | "invalid_credentials"
  | "user_already_exists"
  | "weak_password"
  | "sin-red"
  | "sin-configurar"
  | "desconocido";

// Los seis textos viven aca y en ningun otro lado. requirements.md los fija
// como criterios (R1.2, R2.2, R2.3, R4.2, R4.3, R4.4) y errores.test.ts los
// repite literales a proposito, para que editarlos rompa un test.
const MENSAJES: Readonly<Record<CodigoAuth, string>> = {
  invalid_credentials: "That email and password don't match an account.",
  user_already_exists: "That email already has an account. Sign in instead.",
  weak_password: "Use at least 6 characters.",
  "sin-red": "Can't reach the server. Is Supabase running?",
  "sin-configurar": "Auth isn't configured — see .env.example.",
  desconocido: "Something went wrong. Try again.",
};

export function mensajeDe(codigo: CodigoAuth): string {
  return MENSAJES[codigo];
}

// Los slugs que GoTrue manda y que tienen mensaje propio. Cualquier otro es
// un fallo real pero sin texto util para el usuario, asi que cae en generico.
const DEL_SERVIDOR: Readonly<Record<string, CodigoAuth>> = {
  invalid_credentials: "invalid_credentials",
  user_already_exists: "user_already_exists",
  weak_password: "weak_password",
  // Respuesta OAuth antigua de /token: el slug es otro y significa lo mismo.
  invalid_grant: "invalid_credentials",
};

export function codigoDeRespuesta(_estado: number, cuerpo: unknown): CodigoAuth {
  if (typeof cuerpo !== "object" || cuerpo === null) return "desconocido";
  const campos = cuerpo as Record<string, unknown>;

  const slug = slugDe(campos);
  if (slug !== undefined) {
    // El servidor nombro la causa. Si no la conocemos, NO se adivina leyendo
    // el texto: un codigo explicito que no esta en el mapa es generico, y
    // contradecirlo con una expresion regular seria peor que no saber.
    return DEL_SERVIDOR[slug] ?? "desconocido";
  }

  return porTexto(campos);
}

// El orden es el de design.md §6, con una correccion que el diseño no podia
// anticipar: en GoTrue v2.196.0 `code` trae el NUMERO del status (400, 422) y
// el slug vive en `error_code`. Tomar `code` a ciegas mandaria todos los
// fallos a "desconocido". Por eso solo cuenta cuando es un string.
function slugDe(campos: Record<string, unknown>): string | undefined {
  return texto(campos["code"]) ?? texto(campos["error_code"]) ?? texto(campos["error"]);
}

// Ultimo recurso, para las versiones que no mandan ningun codigo y solo
// describen el fallo en prosa.
function porTexto(campos: Record<string, unknown>): CodigoAuth {
  const prosa = texto(campos["msg"]) ?? texto(campos["message"]);
  if (prosa === undefined) return "desconocido";
  if (/already registered/i.test(prosa)) return "user_already_exists";
  if (/at least .* characters/i.test(prosa)) return "weak_password";
  return "desconocido";
}

function texto(valor: unknown): string | undefined {
  return typeof valor === "string" && valor !== "" ? valor : undefined;
}
