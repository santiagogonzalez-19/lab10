export type Mes = string; // "YYYY-MM", validado por validarMes
export type Fecha = string; // "YYYY-MM-DD", validado por validarFecha

export type Categoria = {
  nombre: string; // tal como lo escribió el usuario; se compara normalizado
  limite: number; // entero >= 0, pesos colombianos sin decimales
};

export type Gasto = {
  id: string;
  mes: Mes; // derivado de fecha al registrar; nunca se recalcula
  categoria: string; // nombre canónico de la categoría del presupuesto de ese mes
  monto: number; // entero > 0
  fecha: Fecha;
  descripcion: string; // "" si el usuario no la escribió
};

export type EntradaGasto = {
  categoria: string;
  monto: number;
  fecha: string;
  descripcion?: string;
};

export type EstadoCategoria = "ok" | "alerta" | "excedido";

export type ConsumoCategoria = {
  categoria: string;
  limite: number;
  gastado: number; // entero: suma de los montos del mes
  restante: number; // limite - gastado; negativo si hay exceso
  excedido: number; // max(0, gastado - limite); 0 si no hay exceso
  porcentaje: number; // 0..∞, redondeado a un decimal; solo presentación
  estado: EstadoCategoria;
};

export type GastoRegistrado = { gasto: Gasto; consumo: ConsumoCategoria };
export type VistaMes = { mes: Mes; categorias: ConsumoCategoria[] };
