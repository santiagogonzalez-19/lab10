// Donde esta Supabase y con que llave se le habla. Lo lee del entorno que Vite
// resuelve en tiempo de build desde web/.env.local (ver web/.env.example).

export type Configuracion = { readonly url: string; readonly llave: string };

// El puerto local es fijo y esta en config.toml, asi que la URL puede tener
// valor por defecto. La llave no: cambia con cada proyecto local, y una llave
// inventada fallaria con un error del servidor en vez de decir lo que pasa.
const URL_POR_DEFECTO = "http://127.0.0.1:54321";

// Devuelve null —y no lanza— cuando falta la llave. Que la aplicacion arranque
// igual no es indulgencia: las otras tres pantallas del onboarding no dependen
// de la autenticacion, y tirar el modulo al importarlo se llevaria puestas
// todas. El intento devuelve "sin-configurar" y el panel lo explica (R4.3).
export function configuracion(): Configuracion | null {
  const url = import.meta.env.VITE_SUPABASE_URL ?? URL_POR_DEFECTO;
  const llave = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (llave === undefined || llave.trim() === "") return null;
  return { url: url.replace(/\/+$/, ""), llave };
}
