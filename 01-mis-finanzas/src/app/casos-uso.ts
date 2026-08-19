import { consumo } from "../domain/consumo";
import { validarMes } from "../domain/mes";
import {
  copiarLimites as copiarLimitesDominio,
  fijarLimites as fijarLimitesDominio,
} from "../domain/presupuesto";
import { exito, type Resultado } from "../domain/resultado";
import type { Categoria, Gasto, Mes, VistaMes } from "../domain/tipos";
import type { Datos, Repositorio } from "../storage/repositorio";

// El tipo se completa en T15 con registrarGasto, listarGastos y borrarGasto.
export type CasosUso = {
  verMes(mes: string): Promise<Resultado<VistaMes>>;
  fijarLimites(mes: string, categorias: Categoria[]): Promise<Resultado<Categoria[]>>;
  copiarLimites(destino: string, origen: string): Promise<Resultado<Categoria[]>>;
};

export function crearCasosUso(repo: Repositorio, generarId: () => string): CasosUso {
  void generarId; // lo consume registrarGasto, que nace en T15 (D9)

  function gastosDelMes(datos: Datos, mes: Mes): Gasto[] {
    return datos.gastos.filter((gasto) => gasto.mes === mes);
  }

  return {
    async verMes(mes) {
      const mesValido = validarMes(mes);
      if (!mesValido.ok) return mesValido;
      const datos = await repo.leer();
      const categorias = datos.presupuestos[mesValido.valor] ?? [];
      return exito({
        mes: mesValido.valor,
        categorias: consumo(categorias, gastosDelMes(datos, mesValido.valor)),
      });
    },

    async fijarLimites(mes, categorias) {
      const mesValido = validarMes(mes);
      if (!mesValido.ok) return mesValido;
      const datos = await repo.leer();
      const actuales = datos.presupuestos[mesValido.valor] ?? [];
      const resultado = fijarLimitesDominio(
        actuales,
        categorias,
        gastosDelMes(datos, mesValido.valor),
      );
      if (!resultado.ok) return resultado;
      const presupuestos = { ...datos.presupuestos };
      if (resultado.valor.length === 0) {
        // R1.11: la lista vacía deja el mes sin presupuesto, no con uno vacío.
        delete presupuestos[mesValido.valor];
      } else {
        presupuestos[mesValido.valor] = resultado.valor;
      }
      await repo.escribir({ ...datos, presupuestos });
      return resultado;
    },

    async copiarLimites(destino, origen) {
      const destinoValido = validarMes(destino);
      if (!destinoValido.ok) return destinoValido;
      const origenValido = validarMes(origen);
      if (!origenValido.ok) return origenValido;
      const datos = await repo.leer();
      const resultado = copiarLimitesDominio(
        { mes: origenValido.valor, categorias: datos.presupuestos[origenValido.valor] ?? [] },
        { mes: destinoValido.valor, categorias: datos.presupuestos[destinoValido.valor] ?? [] },
      );
      if (!resultado.ok) return resultado;
      await repo.escribir({
        ...datos,
        presupuestos: { ...datos.presupuestos, [destinoValido.valor]: resultado.valor },
      });
      return resultado;
    },
  };
}
