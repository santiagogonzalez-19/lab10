export type CodigoError =
  | "MES_INVALIDO"
  | "FECHA_INVALIDA"
  | "LIMITE_NEGATIVO"
  | "LIMITE_NO_ENTERO"
  | "NOMBRE_VACIO"
  | "NOMBRE_DUPLICADO"
  | "CATEGORIA_CON_GASTOS"
  | "DESTINO_NO_VACIO"
  | "ORIGEN_SIN_PRESUPUESTO"
  | "MESES_IGUALES"
  | "CATEGORIA_SIN_PRESUPUESTO"
  | "MONTO_NO_POSITIVO"
  | "MONTO_NO_ENTERO"
  | "GASTO_NO_EXISTE";

export type ErrorDominio = {
  codigo: CodigoError;
  mensaje: string;
  detalle?: Record<string, string | number>;
};

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: ErrorDominio };

export function exito<T>(valor: T): Resultado<T> {
  return { ok: true, valor };
}

export function fallo<T>(
  codigo: CodigoError,
  mensaje: string,
  detalle?: Record<string, string | number>,
): Resultado<T> {
  return detalle === undefined
    ? { ok: false, error: { codigo, mensaje } }
    : { ok: false, error: { codigo, mensaje, detalle } };
}
