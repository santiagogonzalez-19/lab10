import { exito, fallo, type Resultado } from "./resultado";
import type { Fecha, Mes } from "./tipos";

const FORMA_MES = /^(\d{4})-(0[1-9]|1[0-2])$/;
const FORMA_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function validarMes(valor: string): Resultado<Mes> {
  if (!FORMA_MES.test(valor)) {
    return fallo("MES_INVALIDO", "El mes debe tener la forma AAAA-MM (ej. 2026-07).");
  }
  return exito(valor);
}

export function validarFecha(valor: string): Resultado<Fecha> {
  const partes = FORMA_FECHA.exec(valor);
  if (partes === null) {
    return fallo(
      "FECHA_INVALIDA",
      "La fecha debe tener la forma AAAA-MM-DD y existir en el calendario.",
    );
  }
  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasDelMes(anio, mes)) {
    return fallo(
      "FECHA_INVALIDA",
      "La fecha debe tener la forma AAAA-MM-DD y existir en el calendario.",
    );
  }
  return exito(valor);
}

export function mesDe(fecha: Fecha): Mes {
  return fecha.slice(0, 7);
}

function diasDelMes(anio: number, mes: number): number {
  const porMes = [31, esBisiesto(anio) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return porMes[mes - 1] ?? 0;
}

function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}
