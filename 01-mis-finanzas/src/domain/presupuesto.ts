import { validarCategorias } from "./categorias";
import { exito, type Resultado } from "./resultado";
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
  return exito(validas.valor);
}
