import { buscarCategoria } from "./categorias";
import { mesDe, validarFecha } from "./mes";
import { exito, type Resultado } from "./resultado";
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
  const categoria = buscarCategoria(categoriasDelMes, entrada.categoria);
  return exito({
    id,
    mes: mesDe(fecha.valor),
    categoria: categoria?.nombre ?? entrada.categoria,
    monto: entrada.monto,
    fecha: fecha.valor,
    descripcion: entrada.descripcion ?? "",
  });
}
