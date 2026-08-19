import { normalizar, validarCategorias } from "./categorias";
import { exito, fallo, type Resultado } from "./resultado";
import type { Categoria, Gasto } from "./tipos";

export function fijarLimites(
  actuales: Categoria[],
  nuevas: Categoria[],
  gastosDelMes: Gasto[],
): Resultado<Categoria[]> {
  const validas = validarCategorias(nuevas);
  if (!validas.ok) {
    return validas;
  }
  const clavesNuevas = new Set(nuevas.map((c) => normalizar(c.nombre)));
  for (const actual of actuales) {
    if (clavesNuevas.has(normalizar(actual.nombre))) continue;
    const gastos = gastosDelMes.filter(
      (gasto) => normalizar(gasto.categoria) === normalizar(actual.nombre),
    ).length;
    if (gastos > 0) {
      return fallo(
        "CATEGORIA_CON_GASTOS",
        `«${actual.nombre}» tiene ${gastos} gasto${gastos === 1 ? "" : "s"} en este mes; bórralos antes de quitar la categoría.`,
        { categoria: actual.nombre, gastos },
      );
    }
  }
  return exito(validas.valor);
}
