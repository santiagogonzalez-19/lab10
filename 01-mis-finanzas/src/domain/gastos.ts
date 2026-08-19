import { buscarCategoria } from "./categorias";
import { mesDe, validarFecha } from "./mes";
import { exito, fallo, type Resultado } from "./resultado";
import type { Categoria, EntradaGasto, Gasto, Mes } from "./tipos";

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

export function gastosDeMes(gastos: Gasto[], mes: Mes): Gasto[] {
  // Filtra por el campo `mes` (D3, sin reparsear la fecha). El desempate a igual
  // fecha es "el registrado más tarde primero": se recorre el array (orden de
  // registro) al revés y el sort estable conserva ese orden entre iguales.
  return gastos
    .filter((gasto) => gasto.mes === mes)
    .reverse()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}
