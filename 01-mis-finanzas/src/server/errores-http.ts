import type { CodigoError, ErrorDominio } from "../domain/resultado";

// Mapeo exhaustivo: Record<CodigoError, número> obliga a que agregar un código
// de error rompa la compilación hasta decidir su estado HTTP (D1, D5).
// D5: 400 si el usuario puede corregir su petición; 409 si el conflicto es con
// los datos ya almacenados; 404 si el recurso no existe.
const ESTADO_POR_CODIGO: Record<CodigoError, number> = {
  MES_INVALIDO: 400,
  FECHA_INVALIDA: 400,
  LIMITE_NEGATIVO: 400,
  LIMITE_NO_ENTERO: 400,
  NOMBRE_VACIO: 400,
  NOMBRE_DUPLICADO: 400,
  CATEGORIA_CON_GASTOS: 409,
  DESTINO_NO_VACIO: 409,
  ORIGEN_SIN_PRESUPUESTO: 409,
  MESES_IGUALES: 400,
  CATEGORIA_SIN_PRESUPUESTO: 400,
  MONTO_NO_POSITIVO: 400,
  MONTO_NO_ENTERO: 400,
  GASTO_NO_EXISTE: 404,
};

export type CuerpoDeError = {
  codigo: CodigoError;
  mensaje: string;
  detalle?: Record<string, string | number>;
};

export function respuestaDeError(error: ErrorDominio): {
  estado: number;
  cuerpo: CuerpoDeError;
} {
  const cuerpo: CuerpoDeError = { codigo: error.codigo, mensaje: error.mensaje };
  if (error.detalle !== undefined) cuerpo.detalle = error.detalle;
  return { estado: ESTADO_POR_CODIGO[error.codigo], cuerpo };
}
