import { describe, expect, it } from "vitest";
import { gastosDeMes, registrarGasto } from "./gastos";
import type { Categoria, Gasto } from "./tipos";

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

  it("CP28 — gasto en 'Ocio' cuando junio no tiene esa categoría → CATEGORIA_SIN_PRESUPUESTO", () => {
    const resultado = registrarGasto(
      { categoria: "Ocio", monto: 10000, fecha: "2026-06-28" },
      presupuestoJunio,
      "g1",
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.codigo).toBe("CATEGORIA_SIN_PRESUPUESTO");
  });

  it("CP30 — monto 0 y -5000 → MONTO_NO_POSITIVO", () => {
    for (const monto of [0, -5000]) {
      const resultado = registrarGasto(
        { categoria: "Comida", monto, fecha: "2026-06-28" },
        presupuestoJunio,
        "g1",
      );
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) expect(resultado.error.codigo).toBe("MONTO_NO_POSITIVO");
    }
  });

  it("CP31 — monto 25000.5 → MONTO_NO_ENTERO", () => {
    const resultado = registrarGasto(
      { categoria: "Comida", monto: 25000.5, fecha: "2026-06-28" },
      presupuestoJunio,
      "g1",
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.codigo).toBe("MONTO_NO_ENTERO");
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

describe("gastosDeMes", () => {
  function gastoDe(id: string, mes: string, fecha: string): Gasto {
    return { id, mes, categoria: "Comida", monto: 10000, fecha, descripcion: `d-${id}` };
  }

  it("CP46 — gastos de dos meses cargados → solo los del mes pedido, con todos sus campos", () => {
    const junio = gastoDe("g1", "2026-06", "2026-06-15");
    const julio = gastoDe("g2", "2026-07", "2026-07-03");
    const resultado = gastosDeMes([junio, julio], "2026-07");
    expect(resultado).toEqual([
      {
        id: "g2",
        mes: "2026-07",
        categoria: "Comida",
        monto: 10000,
        fecha: "2026-07-03",
        descripcion: "d-g2",
      },
    ]);
  });

  it("CP47 — tres gastos, dos con la misma fecha → fecha descendente y, a igual fecha, el registrado más tarde primero", () => {
    // El orden del array es el orden de registro: g1 y g3 comparten fecha,
    // g3 se registró más tarde y debe salir antes.
    const gastos = [
      gastoDe("g1", "2026-07", "2026-07-10"),
      gastoDe("g2", "2026-07", "2026-07-20"),
      gastoDe("g3", "2026-07", "2026-07-10"),
    ];
    const resultado = gastosDeMes(gastos, "2026-07");
    expect(resultado.map((g) => g.id)).toEqual(["g2", "g3", "g1"]);
  });

  it("CP48 — mes sin gastos → lista vacía sin error", () => {
    const gastos = [gastoDe("g1", "2026-06", "2026-06-15")];
    expect(gastosDeMes(gastos, "2026-08")).toEqual([]);
  });
});
