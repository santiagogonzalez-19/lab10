import { normalizar, validarCategorias } from "./categorias";
import { exito, fallo, type Resultado } from "./resultado";
import type { Categoria, Gasto, Mes } from "./tipos";

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

export function copiarLimites(
  origen: { mes: Mes; categorias: Categoria[] },
  destino: { mes: Mes; categorias: Categoria[] },
): Resultado<Categoria[]> {
  if (origen.mes === destino.mes) {
    return fallo("MESES_IGUALES", "El mes de origen y el de destino deben ser distintos.");
  }
  if (destino.categorias.length > 0) {
    return fallo("DESTINO_NO_VACIO", `${destino.mes} ya tiene límites definidos.`);
  }
  if (origen.categorias.length === 0) {
    return fallo("ORIGEN_SIN_PRESUPUESTO", `${origen.mes} no tiene presupuesto que copiar.`);
  }
  // Copia profunda: el destino no comparte referencias mutables con el origen (R2.6).
  return exito(origen.categorias.map((categoria) => ({ ...categoria })));
}
