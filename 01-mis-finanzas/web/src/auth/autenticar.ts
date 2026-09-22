// El unico punto por donde la aplicacion le habla a Supabase Auth.

import { configuracion, type Configuracion } from "./configuracion";
import { codigoDeRespuesta, type CodigoAuth } from "./errores";

export type ModoAuth = "entrar" | "registrar";

// La variante de exito NO lleva datos, y eso es el cumplimiento de BR1: la
// sesion que devuelve Supabase se lee y se descarta, y como el tipo no tiene
// donde ponerla, nadie puede filtrarla despues sin cambiar esta linea.
export type ResultadoAuth = { ok: true } | { ok: false; codigo: CodigoAuth };

// Inyectables para las pruebas (design.md D4). En produccion no se pasan.
export type Dependencias = {
  readonly peticion?: typeof fetch;
  readonly config?: Configuracion | null;
};

const RUTA: Readonly<Record<ModoAuth, string>> = {
  entrar: "/auth/v1/token?grant_type=password",
  registrar: "/auth/v1/signup",
};

export async function autenticar(
  modo: ModoAuth,
  credenciales: { readonly correo: string; readonly clave: string },
  dependencias?: Dependencias,
): Promise<ResultadoAuth> {
  const config = resolverConfig(dependencias);
  if (config === null) return { ok: false, codigo: "sin-configurar" };

  const peticion = dependencias?.peticion ?? fetchDelEntorno();

  let respuesta: Response;
  try {
    respuesta = await peticion(`${config.url}${RUTA[modo]}`, {
      method: "POST",
      headers: { apikey: config.llave, "Content-Type": "application/json" },
      // El correo se recorta y la clave no: un espacio es un caracter valido
      // de una clave, y recortarlo cambiaria la credencial (R1.3).
      body: JSON.stringify({
        email: credenciales.correo.trim(),
        password: credenciales.clave,
      }),
    });
  } catch {
    return { ok: false, codigo: "sin-red" };
  }

  if (respuesta.ok) return { ok: true };

  // El cuerpo se parsea FUERA del try de arriba a proposito: "no llegue al
  // servidor" y "el servidor contesto algo que no entiendo" son fallos
  // distintos y el usuario lee mensajes distintos. Compartir el try haria que
  // un 502 con HTML dijera "Can't reach the server", que es mentira.
  let cuerpo: unknown = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    cuerpo = null;
  }
  return { ok: false, codigo: codigoDeRespuesta(respuesta.status, cuerpo) };
}

// `config` omitido significa "usa el entorno"; `config: null` significa "no
// hay configuracion", que es un caso que las pruebas necesitan provocar. Por
// eso se distingue el ausente del nulo en vez de usar ??.
function resolverConfig(dependencias: Dependencias | undefined): Configuracion | null {
  if (dependencias === undefined || dependencias.config === undefined) {
    return configuracion();
  }
  return dependencias.config;
}

// `fetch` arrancado del global pierde su receptor y el navegador lo rechaza
// con "Illegal invocation", asi que se ata.
function fetchDelEntorno(): typeof fetch {
  return globalThis.fetch.bind(globalThis);
}
