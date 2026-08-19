import { describe, expect, it } from "vitest";
import { mesDe, validarFecha, validarMes } from "./mes";

describe("validarMes", () => {
  it("CP1 — acepta un mes con la forma YYYY-MM", () => {
    const resultado = validarMes("2026-07");
    expect(resultado).toEqual({ ok: true, valor: "2026-07" });
  });

  it("CP2 — rechaza meses fuera de 01..12", () => {
    for (const valor of ["2026-13", "2026-00"]) {
      const resultado = validarMes(valor);
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) expect(resultado.error.codigo).toBe("MES_INVALIDO");
    }
  });

  it("CP3 — rechaza formatos que no son YYYY-MM", () => {
    for (const valor of ["2026-7", "julio", ""]) {
      const resultado = validarMes(valor);
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) expect(resultado.error.codigo).toBe("MES_INVALIDO");
    }
  });
});

describe("validarFecha y mesDe", () => {
  it("CP4 — de una fecha válida deriva su mes", () => {
    const resultado = validarFecha("2026-06-28");
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(mesDe(resultado.valor)).toBe("2026-06");
  });

  it("CP5 — rechaza una fecha que no existe en el calendario", () => {
    const resultado = validarFecha("2026-02-30");
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error.codigo).toBe("FECHA_INVALIDA");
  });

  it("CP6 — rechaza formatos que no son YYYY-MM-DD", () => {
    for (const valor of ["28/06/2026", "2026-6-8"]) {
      const resultado = validarFecha(valor);
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) expect(resultado.error.codigo).toBe("FECHA_INVALIDA");
    }
  });
});
