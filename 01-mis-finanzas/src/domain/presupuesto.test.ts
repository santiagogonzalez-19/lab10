import { describe, expect, it } from "vitest";
import { copiarLimites, fijarLimites } from "./presupuesto";
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

  it("CP16 — quitar 'Ocio' con 2 gastos → CATEGORIA_CON_GASTOS con { categoria: 'Ocio', gastos: 2 }", () => {
    const actuales: Categoria[] = [
      { nombre: "Comida", limite: 500000 },
      { nombre: "Ocio", limite: 150000 },
    ];
    const gastosDelMes: Gasto[] = [
      {
        id: "g1",
        mes: "2026-07",
        categoria: "Ocio",
        monto: 20000,
        fecha: "2026-07-05",
        descripcion: "",
      },
      {
        id: "g2",
        mes: "2026-07",
        categoria: "Ocio",
        monto: 35000,
        fecha: "2026-07-12",
        descripcion: "cine",
      },
    ];
    const resultado = fijarLimites(
      actuales,
      [{ nombre: "Comida", limite: 500000 }],
      gastosDelMes,
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.codigo).toBe("CATEGORIA_CON_GASTOS");
      expect(resultado.error.detalle).toEqual({ categoria: "Ocio", gastos: 2 });
    }
  });

  it("CP17 — quitar 'Ocio' sin gastos → se elimina", () => {
    const actuales: Categoria[] = [
      { nombre: "Comida", limite: 500000 },
      { nombre: "Ocio", limite: 150000 },
    ];
    const resultado = fijarLimites(
      actuales,
      [{ nombre: "Comida", limite: 500000 }],
      sinGastos,
    );
    expect(resultado).toEqual({ ok: true, valor: [{ nombre: "Comida", limite: 500000 }] });
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

describe("copiarLimites", () => {
  const tresCategorias: Categoria[] = [
    { nombre: "Comida", limite: 500000 },
    { nombre: "Transporte", limite: 200000 },
    { nombre: "Ocio", limite: 150000 },
  ];

  it("CP20 — copiar 3 categorías a un mes vacío → las mismas 3 con los mismos límites", () => {
    const resultado = copiarLimites(
      { mes: "2026-07", categorias: tresCategorias },
      { mes: "2026-08", categorias: [] },
    );
    expect(resultado).toEqual({ ok: true, valor: tresCategorias });
  });

  it("CP21 — el origen tiene gastos → el destino queda sin gastos", () => {
    // copiarLimites solo recibe y devuelve categorías (design.md §4): la firma hace
    // imposible copiar gastos. El test fija que el valor devuelto son categorías puras.
    const resultado = copiarLimites(
      { mes: "2026-07", categorias: tresCategorias },
      { mes: "2026-08", categorias: [] },
    );
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      for (const categoria of resultado.valor) {
        expect(Object.keys(categoria).sort()).toEqual(["limite", "nombre"]);
      }
    }
  });

  it("CP22 — destino con 1 categoría → DESTINO_NO_VACIO", () => {
    const resultado = copiarLimites(
      { mes: "2026-07", categorias: tresCategorias },
      { mes: "2026-08", categorias: [{ nombre: "Comida", limite: 100000 }] },
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.codigo).toBe("DESTINO_NO_VACIO");
  });

  it("CP23 — origen sin categorías → ORIGEN_SIN_PRESUPUESTO", () => {
    const resultado = copiarLimites(
      { mes: "2026-06", categorias: [] },
      { mes: "2026-08", categorias: [] },
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.codigo).toBe("ORIGEN_SIN_PRESUPUESTO");
  });

  it("CP24 — origen igual a destino → MESES_IGUALES", () => {
    const resultado = copiarLimites(
      { mes: "2026-07", categorias: tresCategorias },
      { mes: "2026-07", categorias: tresCategorias },
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.codigo).toBe("MESES_IGUALES");
  });

  it("CP25 — tras copiar, el origen queda idéntico y sin referencias compartidas", () => {
    const origen = {
      mes: "2026-07",
      categorias: structuredClone(tresCategorias),
    };
    const antes = structuredClone(origen.categorias);
    const resultado = copiarLimites(origen, { mes: "2026-08", categorias: [] });
    expect(origen.categorias).toEqual(antes);
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      // Mutar la copia no debe tocar el origen: no comparten referencias.
      resultado.valor[0]!.limite = 1;
      expect(origen.categorias[0]?.limite).toBe(500000);
    }
  });
});
