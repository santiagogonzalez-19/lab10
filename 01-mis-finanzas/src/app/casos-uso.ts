import { consumo, consumoDeCategoria } from "../domain/consumo";
import {
  gastosDeMes,
  quitarGasto,
  registrarGasto as registrarGastoDominio,
} from "../domain/gastos";
import { validarMes } from "../domain/mes";
import {
  copiarLimites as copiarLimitesDominio,
  fijarLimites as fijarLimitesDominio,
} from "../domain/presupuesto";
import { exito, type Resultado } from "../domain/resultado";
import type {
  Categoria,
  EntradaGasto,
  Gasto,
  GastoRegistrado,
  Mes,
  VistaMes,
} from "../domain/tipos";
import type { Datos, Repositorio } from "../storage/repositorio";

export type CasosUso = {
  verMes(mes: string): Promise<Resultado<VistaMes>>;
  fijarLimites(mes: string, categorias: Categoria[]): Promise<Resultado<Categoria[]>>;
  copiarLimites(destino: string, origen: string): Promise<Resultado<Categoria[]>>;
  registrarGasto(entrada: EntradaGasto): Promise<Resultado<GastoRegistrado>>;
  listarGastos(mes: string): Promise<Resultado<Gasto[]>>;
  borrarGasto(id: string): Promise<Resultado<null>>;
};

export function crearCasosUso(repo: Repositorio, generarId: () => string): CasosUso {
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

    async registrarGasto(entrada) {
      const datos = await repo.leer();
      // El dominio deriva el mes de la fecha; acá solo hay que darle las categorías
      // de ese mes. Se validan juntas dentro de registrarGasto (T9-D1).
      const mesDeLaFecha = entrada.fecha.slice(0, 7);
      const categorias = datos.presupuestos[mesDeLaFecha] ?? [];
      const resultado = registrarGastoDominio(entrada, categorias, generarId());
      if (!resultado.ok) return resultado;
      const gasto = resultado.valor;
      const gastosNuevos = [...datos.gastos, gasto];
      await repo.escribir({ ...datos, gastos: gastosNuevos });
      const categoria = categorias.find((c) => c.nombre === gasto.categoria);
      // La categoría existe: el dominio acaba de imputar el gasto a ella (R4.6:
      // se informa el consumo solo de la categoría del gasto).
      const consumoCategoria = consumoDeCategoria(
        categoria ?? { nombre: gasto.categoria, limite: 0 },
        gastosNuevos.filter((g) => g.mes === gasto.mes),
      );
      return exito({ gasto, consumo: consumoCategoria });
    },

    async listarGastos(mes) {
      const mesValido = validarMes(mes);
      if (!mesValido.ok) return mesValido;
      const datos = await repo.leer();
      // Solo lee y delega: el filtrado y el orden viven en gastosDeMes (T10).
      return exito(gastosDeMes(datos.gastos, mesValido.valor));
    },

    async borrarGasto(id) {
      const datos = await repo.leer();
      const resultado = quitarGasto(datos.gastos, id);
      if (!resultado.ok) return resultado;
      await repo.escribir({ ...datos, gastos: resultado.valor });
      return exito(null);
    },
  };
}
