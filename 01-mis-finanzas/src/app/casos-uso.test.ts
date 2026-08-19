import { describe, expect, it } from "vitest";
import type { Resultado } from "../domain/resultado";
import { RepositorioMemoria } from "../storage/repositorio-memoria";
import type { Datos } from "../storage/repositorio";
import { crearCasosUso, type CasosUso } from "./casos-uso";

// Repositorio que cuenta las escrituras: la única forma de comprobar que un
// rechazo del dominio no dejó nada persistido (CP52).
export class RepositorioContador extends RepositorioMemoria {
  escrituras = 0;

  override async escribir(datos: Datos): Promise<void> {
    this.escrituras += 1;
    return super.escribir(datos);
  }
}

let siguienteId = 0;
export async function crearCasosUsoDePrueba(datos?: Datos): Promise<{
  casos: CasosUso;
  repo: RepositorioContador;
}> {
  const repo = new RepositorioContador();
  if (datos) {
    await repo.escribir(datos);
    repo.escrituras = 0;
  }
  const casos = crearCasosUso(repo, () => `id-${++siguienteId}`);
  return { casos, repo };
}

const datosConJulio: Datos = {
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
      categoria: "Ocio",
      monto: 20000,
      fecha: "2026-07-05",
      descripcion: "",
    },
  ],
};

// CP52 — helper parametrizado por operación: la operación debe fallar en el
// dominio y el repositorio no debe recibir ninguna escritura.
export async function esperarRechazoSinEscritura(
  repo: RepositorioContador,
  operacion: () => Promise<Resultado<unknown>>,
  codigoEsperado: string,
): Promise<void> {
  const resultado = await operacion();
  expect(resultado.ok).toBe(false);
  if (!resultado.ok) expect(resultado.error.codigo).toBe(codigoEsperado);
  expect(repo.escrituras).toBe(0);
}

describe("casos de uso de presupuesto", () => {
  it("CP52 (rama R1.4) — fijarLimites con un límite negativo → sin escrituras", async () => {
    const { casos, repo } = await crearCasosUsoDePrueba(datosConJulio);
    await esperarRechazoSinEscritura(
      repo,
      () => casos.fijarLimites("2026-07", [{ nombre: "Comida", limite: -1 }]),
      "LIMITE_NEGATIVO",
    );
  });

  it("CP52 (rama R1.8) — fijarLimites que quita una categoría con gastos → sin escrituras", async () => {
    const { casos, repo } = await crearCasosUsoDePrueba(datosConJulio);
    await esperarRechazoSinEscritura(
      repo,
      () => casos.fijarLimites("2026-07", [{ nombre: "Comida", limite: 500000 }]),
      "CATEGORIA_CON_GASTOS",
    );
  });

  it("CP52 (rama R2.3) — copiarLimites hacia un destino no vacío → sin escrituras", async () => {
    const { casos, repo } = await crearCasosUsoDePrueba({
      ...datosConJulio,
      presupuestos: {
        ...datosConJulio.presupuestos,
        "2026-08": [{ nombre: "Comida", limite: 100000 }],
      },
    });
    await esperarRechazoSinEscritura(
      repo,
      () => casos.copiarLimites("2026-08", "2026-07"),
      "DESTINO_NO_VACIO",
    );
  });

  it("CP43 (vía verMes) — mes sin presupuesto → { mes, categorias: [] } sin error", async () => {
    const { casos } = await crearCasosUsoDePrueba(datosConJulio);
    const resultado = await casos.verMes("2026-09");
    expect(resultado).toEqual({ ok: true, valor: { mes: "2026-09", categorias: [] } });
  });

  it("fijarLimites con lista vacía deja el mes sin presupuesto (R1.11 en persistencia)", async () => {
    const { casos, repo } = await crearCasosUsoDePrueba({
      version: 1,
      presupuestos: { "2026-07": [{ nombre: "Comida", limite: 500000 }] },
      gastos: [],
    });
    const resultado = await casos.fijarLimites("2026-07", []);
    expect(resultado.ok).toBe(true);
    const datos = await repo.leer();
    expect("2026-07" in datos.presupuestos).toBe(false);
  });

  it("verMes calcula el consumo con los gastos del mes pedido", async () => {
    const { casos } = await crearCasosUsoDePrueba(datosConJulio);
    const resultado = await casos.verMes("2026-07");
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.categorias.map((c) => c.categoria)).toEqual([
        "Comida",
        "Ocio",
      ]);
      expect(resultado.valor.categorias[1]?.gastado).toBe(20000);
    }
  });
});
