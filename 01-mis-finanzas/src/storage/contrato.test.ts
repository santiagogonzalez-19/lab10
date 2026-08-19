import { describe, expect, it } from "vitest";
import type { Datos, Repositorio } from "./repositorio";
import { RepositorioMemoria } from "./repositorio-memoria";

// CP58 — la MISMA batería corre contra cada implementación del contrato.
// T12 la ejercita contra RepositorioMemoria; T13 la reusa contra RepositorioArchivo.
export function bateriaDelContrato(
  nombre: string,
  crearRepositorio: () => Promise<Repositorio> | Repositorio,
): void {
  describe(`contrato Repositorio — ${nombre}`, () => {
    it("leer sin escritura previa devuelve datos vacíos con version 1", async () => {
      const repo = await crearRepositorio();
      const datos = await repo.leer();
      expect(datos).toEqual({ version: 1, presupuestos: {}, gastos: [] });
    });

    it("escribir y volver a leer devuelve datos iguales a los escritos", async () => {
      const repo = await crearRepositorio();
      const datos: Datos = {
        version: 1,
        presupuestos: {
          "2026-07": [
            { nombre: "Comida", limite: 500000 },
            { nombre: "Ocio", limite: 150000 },
          ],
        },
        gastos: [
          {
            id: "g1",
            mes: "2026-07",
            categoria: "Comida",
            monto: 25000,
            fecha: "2026-07-10",
            descripcion: "mercado",
          },
        ],
      };
      await repo.escribir(datos);
      expect(await repo.leer()).toEqual(datos);
    });

    it("mutar lo devuelto por leer no contamina el estado guardado", async () => {
      const repo = await crearRepositorio();
      const datos: Datos = {
        version: 1,
        presupuestos: { "2026-07": [{ nombre: "Comida", limite: 500000 }] },
        gastos: [],
      };
      await repo.escribir(datos);
      const leidos = await repo.leer();
      leidos.presupuestos["2026-07"]![0]!.limite = 1;
      leidos.gastos.push({
        id: "intruso",
        mes: "2026-07",
        categoria: "Comida",
        monto: 1,
        fecha: "2026-07-01",
        descripcion: "",
      });
      expect(await repo.leer()).toEqual(datos);
    });

    it("la última escritura gana", async () => {
      const repo = await crearRepositorio();
      await repo.escribir({
        version: 1,
        presupuestos: { "2026-06": [{ nombre: "Vieja", limite: 1 }] },
        gastos: [],
      });
      const segunda: Datos = {
        version: 1,
        presupuestos: { "2026-07": [{ nombre: "Comida", limite: 500000 }] },
        gastos: [],
      };
      await repo.escribir(segunda);
      expect(await repo.leer()).toEqual(segunda);
    });
  });
}

bateriaDelContrato("RepositorioMemoria", () => new RepositorioMemoria());
