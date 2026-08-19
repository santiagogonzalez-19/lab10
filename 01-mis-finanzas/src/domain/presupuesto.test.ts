import { describe, expect, it } from "vitest";
import { fijarLimites } from "./presupuesto";
import type { Categoria, Gasto } from "./tipos";

const sinGastos: Gasto[] = [];

describe("fijarLimites", () => {
  it("CP13 — fijar 3 categorías en un mes sin presupuesto → las 3 en el orden recibido", () => {
    const nuevas: Categoria[] = [
      { nombre: "Comida", limite: 500000 },
      { nombre: "Transporte", limite: 200000 },
      { nombre: "Ocio", limite: 150000 },
    ];
    const resultado = fijarLimites([], nuevas, sinGastos);
    expect(resultado).toEqual({ ok: true, valor: nuevas });
  });

  it("CP14 — fijar límites en un mes que ya tenía otras → el conjunto queda reemplazado", () => {
    const actuales: Categoria[] = [
      { nombre: "Vieja", limite: 100000 },
      { nombre: "Otra", limite: 50000 },
    ];
    const nuevas: Categoria[] = [{ nombre: "Comida", limite: 500000 }];
    const resultado = fijarLimites(actuales, nuevas, sinGastos);
    expect(resultado).toEqual({ ok: true, valor: [{ nombre: "Comida", limite: 500000 }] });
  });

  it("CP15 — fijar los de 2026-07 teniendo 2026-06 → junio intacto", () => {
    // fijarLimites opera sobre las categorías de UN mes (design.md §4); el aislamiento
    // entre meses (BR7) se fija acá sobre la estructura Datos.presupuestos por mes.
    const presupuestos: Record<string, Categoria[]> = {
      "2026-06": [{ nombre: "Comida", limite: 300000 }],
      "2026-07": [],
    };
    const junioAntes = structuredClone(presupuestos["2026-06"]);
    const resultado = fijarLimites(
      presupuestos["2026-07"] ?? [],
      [{ nombre: "Comida", limite: 500000 }],
      sinGastos,
    );
    expect(resultado.ok).toBe(true);
    if (resultado.ok) presupuestos["2026-07"] = resultado.valor;
    expect(presupuestos["2026-06"]).toEqual(junioAntes);
  });

  it("CP18 — lista vacía en un mes sin gastos → el mes queda sin presupuesto", () => {
    const actuales: Categoria[] = [{ nombre: "Comida", limite: 500000 }];
    const resultado = fijarLimites(actuales, [], sinGastos);
    expect(resultado).toEqual({ ok: true, valor: [] });
  });

  it("CP19 — lista de 3 con la 3.ª de límite negativo → error y las 2 primeras no se aplican", () => {
    const resultado = fijarLimites(
      [],
      [
        { nombre: "Comida", limite: 500000 },
        { nombre: "Transporte", limite: 200000 },
        { nombre: "Ocio", limite: -1 },
      ],
      sinGastos,
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.codigo).toBe("LIMITE_NEGATIVO");
  });
});
