import type { Categoria, ConsumoCategoria, EstadoCategoria, Gasto } from "./tipos";

export const UMBRAL_ALERTA = 80;

export function consumoDeCategoria(
  categoria: Categoria,
  gastosDelMes: Gasto[],
  umbralAlerta: number = UMBRAL_ALERTA,
): ConsumoCategoria {
  // Los gastos guardan el nombre canónico del presupuesto (D4): comparar es comparar cadenas.
  const gastado = gastosDelMes
    .filter((gasto) => gasto.categoria === categoria.nombre)
    .reduce((suma, gasto) => suma + gasto.monto, 0);
  const limite = categoria.limite;

  const porcentaje =
    limite === 0 ? (gastado > 0 ? 100 : 0) : redondear1((gastado / limite) * 100);

  let estado: EstadoCategoria;
  if (gastado > limite) {
    estado = "excedido";
  } else if (limite > 0 && (gastado / limite) * 100 >= umbralAlerta) {
    // El umbral se evalúa sobre el cociente sin redondear (R4.4):
    // 79,96 % no es alerta aunque `porcentaje` se muestre como 80.
    estado = "alerta";
  } else {
    estado = "ok";
  }

  return {
    categoria: categoria.nombre,
    limite,
    gastado,
    restante: limite - gastado,
    excedido: Math.max(0, gastado - limite),
    porcentaje,
    estado,
  };
}

export function consumo(
  categorias: Categoria[],
  gastosDelMes: Gasto[],
  umbralAlerta: number = UMBRAL_ALERTA,
): ConsumoCategoria[] {
  return categorias.map((categoria) =>
    consumoDeCategoria(categoria, gastosDelMes, umbralAlerta),
  );
}

function redondear1(valor: number): number {
  return Math.round(valor * 10) / 10;
}
