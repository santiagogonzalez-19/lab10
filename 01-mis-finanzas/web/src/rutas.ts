// Traduce el fragmento de la URL al nombre de una pantalla.
// Es una funcion pura para que las rutas se prueben sin navegador.

export type Pantalla = "login" | "perfil" | "conoceme" | "plan";

export const RUTA: Readonly<Record<Pantalla, string>> = {
  login: "#/login",
  perfil: "#/perfil",
  conoceme: "#/conoceme",
  plan: "#/plan",
};

const CONOCIDAS: readonly Pantalla[] = ["login", "perfil", "conoceme", "plan"];

// Todo lo que no se reconoce entra por el acceso: es la primera pantalla del
// onboarding y la puerta de la app.
export function pantallaDe(hash: string): Pantalla {
  const nombre = hash.replace(/^#\/?/, "");
  return CONOCIDAS.find((pantalla) => pantalla === nombre) ?? "login";
}
