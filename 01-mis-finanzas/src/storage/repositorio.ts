import type { Categoria, Gasto, Mes } from "../domain/tipos";

export type Datos = {
  version: 1;
  presupuestos: Record<Mes, Categoria[]>; // la clave es el mes; el array conserva el orden de definición
  gastos: Gasto[];
};

export interface Repositorio {
  leer(): Promise<Datos>;
  escribir(datos: Datos): Promise<void>;
}

export function datosVacios(): Datos {
  return { version: 1, presupuestos: {}, gastos: [] };
}
