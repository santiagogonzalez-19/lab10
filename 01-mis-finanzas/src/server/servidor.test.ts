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

describe("servidor — rutas de copiar y de gastos", () => {
  it("CP62 — POST /api/presupuestos/2026-08/copiar-de/2026-07 con destino vacío → 200 con las copiadas", async () => {
    const base = await levantarServidor(datosConJulio);
    const respuesta = await fetch(`${base}/api/presupuestos/2026-08/copiar-de/2026-07`, {
      method: "POST",
    });
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({
      categorias: [
        { nombre: "Comida", limite: 500000 },
        { nombre: "Ocio", limite: 150000 },
      ],
    });
  });

  it("CP63 — el mismo POST con destino poblado → 409", async () => {
    const base = await levantarServidor({
      ...datosConJulio,
      presupuestos: {
        ...datosConJulio.presupuestos,
        "2026-08": [{ nombre: "Comida", limite: 100000 }],
      },
    });
    const respuesta = await fetch(`${base}/api/presupuestos/2026-08/copiar-de/2026-07`, {
      method: "POST",
    });
    expect(respuesta.status).toBe(409);
    const cuerpo = (await respuesta.json()) as { codigo: string };
    expect(cuerpo.codigo).toBe("DESTINO_NO_VACIO");
  });

  it("CP64 — POST /api/gastos que excede → 201 con el gasto y estado 'excedido' con el monto excedido", async () => {
    const base = await levantarServidor(datosConJulio);
    const respuesta = await fetch(`${base}/api/gastos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categoria: "Ocio",
        monto: 140000,
        fecha: "2026-07-15",
        descripcion: "concierto",
      }),
    });
    expect(respuesta.status).toBe(201);
    const cuerpo = (await respuesta.json()) as {
      gasto: Record<string, unknown>;
      consumo: Record<string, unknown>;
    };
    expect(cuerpo.gasto).toMatchObject({
      categoria: "Ocio",
      monto: 140000,
      fecha: "2026-07-15",
      mes: "2026-07",
      descripcion: "concierto",
    });
    // 20000 previos + 140000 = 160000 sobre límite 150000: excedido en 10000.
    expect(cuerpo.consumo).toMatchObject({ estado: "excedido", excedido: 10000 });
  });

  it("CP65 — POST /api/gastos en categoría sin presupuesto en el mes de la fecha → 400", async () => {
    const base = await levantarServidor(datosConJulio);
    const respuesta = await fetch(`${base}/api/gastos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categoria: "Ocio", monto: 1000, fecha: "2026-06-15" }),
    });
    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as { codigo: string };
    expect(cuerpo.codigo).toBe("CATEGORIA_SIN_PRESUPUESTO");
  });

  it("CP68 — GET /api/gastos?mes=2026-07 → 200 en orden descendente y solo julio", async () => {
    const base = await levantarServidor({
      version: 1,
      presupuestos: {
        "2026-06": [{ nombre: "Comida", limite: 500000 }],
        "2026-07": [{ nombre: "Comida", limite: 500000 }],
      },
      gastos: [
        { id: "g1", mes: "2026-07", categoria: "Comida", monto: 1000, fecha: "2026-07-05", descripcion: "" },
        { id: "g2", mes: "2026-06", categoria: "Comida", monto: 2000, fecha: "2026-06-20", descripcion: "" },
        { id: "g3", mes: "2026-07", categoria: "Comida", monto: 3000, fecha: "2026-07-18", descripcion: "" },
      ],
    });
    const respuesta = await fetch(`${base}/api/gastos?mes=2026-07`);
    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as { gastos: { id: string }[] };
    expect(cuerpo.gastos.map((g) => g.id)).toEqual(["g3", "g1"]);
    // R6.1: cada gasto viaja con todos sus campos, no solo el id.
    expect(cuerpo.gastos[0]).toEqual({
      id: "g3",
      mes: "2026-07",
      categoria: "Comida",
      monto: 3000,
      fecha: "2026-07-18",
      descripcion: "",
    });
  });

  it("CP69 — DELETE /api/gastos/{id} existente y luego GET del mes → 204 y el consumo ya no lo cuenta", async () => {
    const base = await levantarServidor(datosConJulio);
    const borrado = await fetch(`${base}/api/gastos/g1`, { method: "DELETE" });
    expect(borrado.status).toBe(204);
    const mes = await fetch(`${base}/api/presupuestos/2026-07`);
    const cuerpo = (await mes.json()) as { categorias: { categoria: string; gastado: number }[] };
    expect(cuerpo.categorias.find((c) => c.categoria === "Ocio")?.gastado).toBe(0);
  });

  it("CP71 — DELETE /api/gastos/no-existe → 404", async () => {
    const base = await levantarServidor(datosConJulio);
    const respuesta = await fetch(`${base}/api/gastos/no-existe`, { method: "DELETE" });
    expect(respuesta.status).toBe(404);
    const cuerpo = (await respuesta.json()) as { codigo: string };
    expect(cuerpo.codigo).toBe("GASTO_NO_EXISTE");
  });
});
