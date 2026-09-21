import { describe, expect, it } from "vitest";
import { pantallaDe, RUTA } from "./rutas";

describe("pantallaDe", () => {
  it("reconoce las cuatro pantallas del onboarding", () => {
    expect(pantallaDe("#/login")).toBe("login");
    expect(pantallaDe("#/perfil")).toBe("perfil");
    expect(pantallaDe("#/conoceme")).toBe("conoceme");
    expect(pantallaDe("#/plan")).toBe("plan");
  });

  it("sin fragmento entra por el acceso", () => {
    expect(pantallaDe("")).toBe("login");
  });

  it("la raiz entra por el acceso", () => {
    expect(pantallaDe("#/")).toBe("login");
  });

  it("una ruta desconocida entra por el acceso", () => {
    expect(pantallaDe("#/no-existe")).toBe("login");
  });

  it("cada pantalla tiene una ruta y son distintas", () => {
    const rutas = Object.values(RUTA);
    expect(new Set(rutas).size).toBe(rutas.length);
  });

  it("la ruta de cada pantalla vuelve a resolver a esa pantalla", () => {
    for (const [pantalla, ruta] of Object.entries(RUTA)) {
      expect(pantallaDe(ruta)).toBe(pantalla);
    }
  });
});
