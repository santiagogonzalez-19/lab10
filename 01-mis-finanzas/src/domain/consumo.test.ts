import { describe, expect, it } from "vitest";
import { consumo, consumoDeCategoria } from "./consumo";
import type { Gasto } from "./tipos";

function gasto(monto: number, sufijo = "1"): Gasto {
  return {
    id: `g${sufijo}`,
    mes: "2026-07",
    categoria: "Comida",
    monto,
    fecha: "2026-07-10",
    descripcion: "",
  };
}

describe("consumoDeCategoria", () => {
  it("CP36 — límite 500000 sin gastos → 0 / 500000 / 0 % / ok", () => {
    const consumo = consumoDeCategoria({ nombre: "Comida", limite: 500000 }, []);
    expect(consumo).toEqual({
      categoria: "Comida",
      limite: 500000,
      gastado: 0,
      restante: 500000,
      excedido: 0,
      porcentaje: 0,
      estado: "ok",
    });
  });

  it("CP37 — gastado 600000 sobre límite 500000 → restante -100000, excedido 100000, excedido", () => {
    const consumo = consumoDeCategoria({ nombre: "Comida", limite: 500000 }, [
      gasto(600000),
    ]);
    expect(consumo.restante).toBe(-100000);
    expect(consumo.excedido).toBe(100000);
    expect(consumo.estado).toBe("excedido");
  });

  it("CP38 — gastado exactamente 500000 → excedido 0, 100 %, alerta", () => {
    const consumo = consumoDeCategoria({ nombre: "Comida", limite: 500000 }, [
      gasto(500000),
    ]);
    expect(consumo.excedido).toBe(0);
    expect(consumo.porcentaje).toBe(100);
    expect(consumo.estado).toBe("alerta");
  });

  it("CP39 — gastado 400000 (80 % exacto) → alerta", () => {
    const consumo = consumoDeCategoria({ nombre: "Comida", limite: 500000 }, [
      gasto(400000),
    ]);
    expect(consumo.estado).toBe("alerta");
  });

  it("CP40 — gastado 399800 (79,96 %) → ok, con porcentaje redondeado 80", () => {
    const consumo = consumoDeCategoria({ nombre: "Comida", limite: 500000 }, [
      gasto(399800),
    ]);
    expect(consumo.estado).toBe("ok");
    expect(consumo.porcentaje).toBe(80);
  });

  it("CP41 — límite 0 con gasto → 100 %, excedido 30000, excedido", () => {
    const consumo = consumoDeCategoria({ nombre: "Comida", limite: 0 }, [gasto(30000)]);
    expect(consumo.porcentaje).toBe(100);
    expect(consumo.excedido).toBe(30000);
    expect(consumo.estado).toBe("excedido");
  });

  it("CP42 — límite 0 sin gastos → 0 %, ok", () => {
    const consumo = consumoDeCategoria({ nombre: "Comida", limite: 0 }, []);
    expect(consumo.porcentaje).toBe(0);
    expect(consumo.excedido).toBe(0);
    expect(consumo.estado).toBe("ok");
  });

  it("CP70 — diez gastos de 999999 → gastado entero exacto", () => {
    const gastos = Array.from({ length: 10 }, (_, i) => gasto(999999, String(i + 1)));
    const resultado = consumoDeCategoria({ nombre: "Comida", limite: 5000000 }, gastos);
    expect(resultado.gastado).toBe(9999990);
    expect(Number.isInteger(resultado.gastado)).toBe(true);
  });
});

describe("consumo (mes completo)", () => {
  it("CP34 — límite 500000 con gastos de 100000 y 50000 → 150000 / 350000 / 30 % / ok", () => {
    const resultado = consumo(
      [{ nombre: "Comida", limite: 500000 }],
      [gasto(100000, "1"), gasto(50000, "2")],
    );
    expect(resultado).toEqual([
      {
        categoria: "Comida",
        limite: 500000,
        gastado: 150000,
        restante: 350000,
        excedido: 0,
        porcentaje: 30,
        estado: "ok",
      },
    ]);
  });

  it("CP35 — gastos de la misma categoría en junio y julio → el gastado de julio suma solo los de julio", () => {
    const gastosDeJulio: Gasto[] = [gasto(100000, "jul")];
    const deJunio: Gasto = {
      id: "gjun",
      mes: "2026-06",
      categoria: "Comida",
      monto: 999,
      fecha: "2026-06-15",
      descripcion: "",
    };
    // El llamador filtra por mes antes de llamar (D3: comparar cadenas del campo `mes`);
    // el test fija que el cálculo de julio no ve los de junio.
    const soloJulio = [...gastosDeJulio, deJunio].filter((g) => g.mes === "2026-07");
    const resultado = consumo([{ nombre: "Comida", limite: 500000 }], soloJulio);
    expect(resultado[0]?.gastado).toBe(100000);
  });

  it("CP43 — mes sin categorías → lista vacía", () => {
    expect(consumo([], [])).toEqual([]);
  });

  it("CP44 — categorías definidas en orden C, A, B → se devuelven C, A, B", () => {
    const resultado = consumo(
      [
        { nombre: "C", limite: 100 },
        { nombre: "A", limite: 200 },
        { nombre: "B", limite: 300 },
      ],
      [],
    );
    expect(resultado.map((c) => c.categoria)).toEqual(["C", "A", "B"]);
  });
});
