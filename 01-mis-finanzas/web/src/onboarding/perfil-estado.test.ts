import { describe, expect, it } from "vitest";
import { INGRESOS, METAS, RIESGOS } from "./catalogos";
import {
  alternarIngreso,
  descriptorDeRiesgo,
  elegirMeta,
  elegirRiesgo,
  PERFIL_INICIAL,
  puedeContinuar,
} from "./perfil-estado";

describe("catalogos", () => {
  it("tiene cinco metas, tres riesgos y seis fuentes de ingreso", () => {
    expect(METAS).toHaveLength(5);
    expect(RIESGOS).toHaveLength(3);
    expect(INGRESOS).toHaveLength(6);
  });

  it("no repite identificadores", () => {
    for (const catalogo of [METAS, RIESGOS, INGRESOS]) {
      const ids = catalogo.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("no deja etiquetas vacias", () => {
    for (const catalogo of [METAS, RIESGOS, INGRESOS]) {
      for (const opcion of catalogo) expect(opcion.etiqueta.trim()).not.toBe("");
    }
  });

  it("cada nivel de riesgo trae su descriptor", () => {
    for (const riesgo of RIESGOS) expect(riesgo.descriptor.trim()).not.toBe("");
  });
});

describe("estado inicial", () => {
  it("refleja lo que dibuja el mockup", () => {
    expect(PERFIL_INICIAL.meta).toBe("emergency");
    expect(PERFIL_INICIAL.riesgo).toBe("balanced");
    expect([...PERFIL_INICIAL.ingresos].sort()).toEqual(["investments", "salary"]);
  });
});

describe("elegirMeta", () => {
  it("marca la meta elegida", () => {
    expect(elegirMeta(PERFIL_INICIAL, "debt").meta).toBe("debt");
  });

  it("reemplaza la meta anterior en vez de acumular", () => {
    const estado = elegirMeta(elegirMeta(PERFIL_INICIAL, "debt"), "wealth");
    expect(estado.meta).toBe("wealth");
  });

  it("elegir la meta ya seleccionada la mantiene", () => {
    const una = elegirMeta(PERFIL_INICIAL, "retirement");
    expect(elegirMeta(una, "retirement").meta).toBe("retirement");
  });
});

describe("elegirRiesgo", () => {
  it("el descriptor inicial es el de balanced", () => {
    const balanced = RIESGOS.find((r) => r.id === "balanced");
    expect(descriptorDeRiesgo(PERFIL_INICIAL)).toBe(balanced?.descriptor);
  });

  it("deja el nivel elegido como unico", () => {
    expect(elegirRiesgo(PERFIL_INICIAL, "aggressive").riesgo).toBe("aggressive");
  });

  it("el descriptor sigue al nivel elegido", () => {
    const conservative = RIESGOS.find((r) => r.id === "conservative");
    expect(descriptorDeRiesgo(elegirRiesgo(PERFIL_INICIAL, "conservative"))).toBe(
      conservative?.descriptor,
    );
  });

  it("elegir el nivel ya seleccionado no cambia nada", () => {
    const estado = elegirRiesgo(PERFIL_INICIAL, "balanced");
    expect(estado.riesgo).toBe(PERFIL_INICIAL.riesgo);
    expect(descriptorDeRiesgo(estado)).toBe(descriptorDeRiesgo(PERFIL_INICIAL));
  });
});

describe("alternarIngreso", () => {
  const vacio = { ...PERFIL_INICIAL, ingresos: [] as const };

  it("acumula las fuentes marcadas", () => {
    const estado = alternarIngreso(alternarIngreso(vacio, "salary"), "rental");
    expect([...estado.ingresos].sort()).toEqual(["rental", "salary"]);
  });

  it("desmarcar una conserva las demas", () => {
    const dos = alternarIngreso(alternarIngreso(vacio, "salary"), "rental");
    expect(alternarIngreso(dos, "salary").ingresos).toEqual(["rental"]);
  });

  it("desmarcar la ultima deja la lista vacia", () => {
    const una = alternarIngreso(vacio, "other");
    expect(alternarIngreso(una, "other").ingresos).toEqual([]);
  });

  it("no repite una fuente ya marcada", () => {
    const una = alternarIngreso(vacio, "business");
    expect(alternarIngreso(alternarIngreso(una, "business"), "business").ingresos).toEqual([
      "business",
    ]);
  });
});

describe("puedeContinuar", () => {
  it("no alcanza con las fuentes si falta la meta", () => {
    const estado = alternarIngreso({ ...PERFIL_INICIAL, meta: null, ingresos: [] }, "salary");
    expect(puedeContinuar(estado)).toBe(false);
  });

  it("no alcanza con la meta si no hay ninguna fuente", () => {
    const estado = elegirMeta({ ...PERFIL_INICIAL, ingresos: [] }, "debt");
    expect(puedeContinuar(estado)).toBe(false);
  });

  it("habilita con una meta y al menos una fuente", () => {
    expect(puedeContinuar(PERFIL_INICIAL)).toBe(true);
  });
});
