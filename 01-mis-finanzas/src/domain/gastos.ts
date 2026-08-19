import { buscarCategoria } from "./categorias";
import { mesDe, validarFecha } from "./mes";
import { exito, fallo, type Resultado } from "./resultado";
import type { Categoria, EntradaGasto, Gasto } from "./tipos";

export function registrarGasto(
  entrada: EntradaGasto,
  categoriasDelMes: Categoria[],
  id: string,
): Resultado<Gasto> {
  const fecha = validarFecha(entrada.fecha);
  if (!fecha.ok) {
    return fecha;
  }
  const mes = mesDe(fecha.valor);
  if (!Number.isInteger(entrada.monto)) {
    return fallo("MONTO_NO_ENTERO", "El monto debe ser un entero, sin decimales.");
  }
  if (entrada.monto <= 0) {
    return fallo("MONTO_NO_POSITIVO", "El monto debe ser mayor que cero.");
  }
  // La categoría se busca en el presupuesto del mes de la FECHA, no del mes que
  // el usuario esté viendo (BR4): sin límite en ese mes, el gasto queda huérfano.
  const categoria = buscarCategoria(categoriasDelMes, entrada.categoria);
  if (categoria === undefined) {
    return fallo(
      "CATEGORIA_SIN_PRESUPUESTO",
      `«${entrada.categoria.trim()}» no tiene presupuesto en ${mes}. Defínelo primero.`,
      { categoria: entrada.categoria.trim(), mes },
    );
  }
  return exito({
    id,
    mes,
    categoria: categoria.nombre,
    monto: entrada.monto,
    fecha: fecha.valor,
    descripcion: entrada.descripcion ?? "",
  });
}
