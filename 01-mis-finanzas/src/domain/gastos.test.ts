import { describe, expect, it } from "vitest";
import { registrarGasto } from "./gastos";
import type { Categoria } from "./tipos";

const presupuestoJunio: Categoria[] = [
  { nombre: "Comida", limite: 500000 },
  { nombre: "Transporte", limite: 200000 },
];

describe("registrarGasto", () => {
  it("CP26 — gasto válido con id inyectado 'g1' → se devuelve con id 'g1' y todos sus campos", () => {
    const resultado = registrarGasto(
      {
        categoria: "Comida",
        monto: 25000,
        fecha: "2026-06-28",
        descripcion: "mercado",
      },
      presupuestoJunio,
      "g1",
    );
    expect(resultado).toEqual({
      ok: true,
      valor: {
        id: "g1",
        mes: "2026-06",
        categoria: "Comida",
        monto: 25000,
        fecha: "2026-06-28",
        descripcion: "mercado",
      },
    });
  });

  it("CP27 — fecha '2026-06-28' con junio presupuestado → mes '2026-06', no el mes que se esté mirando", () => {
    const resultado = registrarGasto(
      { categoria: "Comida", monto: 10000, fecha: "2026-06-28" },
      presupuestoJunio,
      "g1",
    );
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.valor.mes).toBe("2026-06");
  });

  it("CP29 — categoría ' comida ' con presupuesto 'Comida' → se almacena con el nombre canónico 'Comida'", () => {
    const resultado = registrarGasto(
      { categoria: " comida ", monto: 10000, fecha: "2026-06-28" },
      presupuestoJunio,
      "g1",
    );
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.valor.categoria).toBe("Comida");
  });

  it("CP32 — sin descripcion → ''", () => {
    const resultado = registrarGasto(
      { categoria: "Comida", monto: 10000, fecha: "2026-06-28" },
      presupuestoJunio,
      "g1",
    );
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.valor.descripcion).toBe("");
  });

  it("CP33 — dos gastos idénticos → dos registros con ids distintos", () => {
    const entrada = {
      categoria: "Comida",
      monto: 10000,
      fecha: "2026-06-28",
      descripcion: "almuerzo",
    };
    const primero = registrarGasto(entrada, presupuestoJunio, "g1");
    const segundo = registrarGasto(entrada, presupuestoJunio, "g2");
    expect(primero.ok).toBe(true);
    expect(segundo.ok).toBe(true);
    if (primero.ok && segundo.ok) {
      expect(primero.valor.id).not.toBe(segundo.valor.id);
      const { id: _id1, ...resto1 } = primero.valor;
      const { id: _id2, ...resto2 } = segundo.valor;
      expect(resto1).toEqual(resto2);
    }
  });
});
