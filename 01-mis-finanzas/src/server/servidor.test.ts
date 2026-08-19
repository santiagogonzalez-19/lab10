import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { crearCasosUso } from "../app/casos-uso";
import type { Datos } from "../storage/repositorio";
import { RepositorioMemoria } from "../storage/repositorio-memoria";
import { crearServidor } from "./servidor";

// Servidor real en puerto efímero (listen(0)) con RepositorioMemoria.
type Servidor = ReturnType<typeof crearServidor>;
const servidoresAbiertos: Servidor[] = [];

let siguienteId = 0;
async function levantarServidor(datos?: Datos): Promise<string> {
  const repo = new RepositorioMemoria();
  if (datos) await repo.escribir(datos);
  const servidor = crearServidor(crearCasosUso(repo, () => `id-${++siguienteId}`));
  servidoresAbiertos.push(servidor);
  await new Promise<void>((resolve) => servidor.listen(0, resolve));
  const { port } = servidor.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  await Promise.all(
    servidoresAbiertos.splice(0).map(
      (servidor) => new Promise<void>((resolve) => servidor.close(() => resolve())),
    ),
  );
});

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

describe("servidor — errores y rutas de presupuesto", () => {
  it("CP59 — PUT /api/presupuestos/2026-07 con 2 categorías → 200 con las guardadas", async () => {
    const base = await levantarServidor();
    const categorias = [
      { nombre: "Comida", limite: 500000 },
      { nombre: "Transporte", limite: 200000 },
    ];
    const respuesta = await fetch(`${base}/api/presupuestos/2026-07`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categorias }),
    });
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ categorias });
  });

  it("CP60 — PUT con límite negativo → 400 con el motivo", async () => {
    const base = await levantarServidor();
    const respuesta = await fetch(`${base}/api/presupuestos/2026-07`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categorias: [{ nombre: "Comida", limite: -1 }] }),
    });
    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as { codigo: string; mensaje: string };
    expect(cuerpo.codigo).toBe("LIMITE_NEGATIVO");
    expect(cuerpo.mensaje).toContain("negativos");
  });

  it("CP61 — PUT que quita una categoría con gastos → 409 con el nombre y el conteo", async () => {
    const base = await levantarServidor(datosConJulio);
    const respuesta = await fetch(`${base}/api/presupuestos/2026-07`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categorias: [{ nombre: "Comida", limite: 500000 }] }),
    });
    expect(respuesta.status).toBe(409);
    const cuerpo = (await respuesta.json()) as {
      codigo: string;
      detalle?: Record<string, unknown>;
    };
    expect(cuerpo.codigo).toBe("CATEGORIA_CON_GASTOS");
    expect(cuerpo.detalle).toEqual({ categoria: "Ocio", gastos: 1 });
  });

  it("CP66 — GET /api/presupuestos/2026-07 → 200 con límite, gastado, restante, porcentaje y estado", async () => {
    const base = await levantarServidor(datosConJulio);
    const respuesta = await fetch(`${base}/api/presupuestos/2026-07`);
    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as {
      mes: string;
      categorias: Record<string, unknown>[];
    };
    expect(cuerpo.mes).toBe("2026-07");
    expect(cuerpo.categorias[1]).toEqual({
      categoria: "Ocio",
      limite: 150000,
      gastado: 20000,
      restante: 130000,
      excedido: 0,
      porcentaje: 13.3,
      estado: "ok",
    });
  });

  it("CP67 — GET /api/presupuestos/2026-13 → 400", async () => {
    const base = await levantarServidor();
    const respuesta = await fetch(`${base}/api/presupuestos/2026-13`);
    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as { codigo: string };
    expect(cuerpo.codigo).toBe("MES_INVALIDO");
  });

  it("CP72 — GET /api/inventado → 404", async () => {
    const base = await levantarServidor();
    const respuesta = await fetch(`${base}/api/inventado`);
    expect(respuesta.status).toBe(404);
  });

  it("CP73 — POST /api/gastos con cuerpo no-JSON → 400 sin caerse", async () => {
    const base = await levantarServidor(datosConJulio);
    const respuesta = await fetch(`${base}/api/gastos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "esto no es json {",
    });
    expect(respuesta.status).toBe(400);
    // El servidor sigue vivo tras el cuerpo ilegible:
    const sano = await fetch(`${base}/api/presupuestos/2026-07`);
    expect(sano.status).toBe(200);
  });
});
