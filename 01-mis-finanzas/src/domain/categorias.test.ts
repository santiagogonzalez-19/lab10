import { describe, expect, it } from "vitest";
import { normalizar, validarCategorias } from "./categorias";

describe("normalizar", () => {
  it("CP7 — ' comida ' y 'Comida' normalizan igual", () => {
    expect(normalizar(" comida ")).toBe(normalizar("Comida"));
  });
});

describe("validarCategorias", () => {
  it("CP8 — dos categorías con el mismo nombre normalizado → NOMBRE_DUPLICADO con el nombre en el detalle", () => {
    const resultado = validarCategorias([
      { nombre: "Comida", limite: 500000 },
      { nombre: " comida ", limite: 200000 },
    ]);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.error.codigo).toBe("NOMBRE_DUPLICADO");
      expect(resultado.error.detalle).toMatchObject({ categoria: "Comida" });
    }
  });

  it("CP9 — límite -1 → LIMITE_NEGATIVO", () => {
    const resultado = validarCategorias([{ nombre: "Comida", limite: -1 }]);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.codigo).toBe("LIMITE_NEGATIVO");
  });

  it("CP10 — límite 1000.5 → LIMITE_NO_ENTERO", () => {
    const resultado = validarCategorias([{ nombre: "Comida", limite: 1000.5 }]);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.codigo).toBe("LIMITE_NO_ENTERO");
  });

  it("CP11 — límite 0 aceptado", () => {
    const resultado = validarCategorias([{ nombre: "Ahorro", limite: 0 }]);
    expect(resultado).toEqual({ ok: true, valor: [{ nombre: "Ahorro", limite: 0 }] });
  });

  it("CP12 — nombre '   ' → NOMBRE_VACIO", () => {
    const resultado = validarCategorias([{ nombre: "   ", limite: 1000 }]);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.codigo).toBe("NOMBRE_VACIO");
  });
});
