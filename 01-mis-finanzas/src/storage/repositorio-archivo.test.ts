import { mkdir, mkdtemp, readdir, readFile, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bateriaDelContrato } from "./contrato.test";
import { RepositorioArchivo } from "./repositorio-archivo";
import type { Datos } from "./repositorio";

async function directorioTemporal(): Promise<string> {
  return mkdtemp(join(tmpdir(), "finanzas-test-"));
}

const unosDatos: Datos = {
  version: 1,
  presupuestos: { "2026-07": [{ nombre: "Comida", limite: 500000 }] },
  gastos: [
    {
      id: "g1",
      mes: "2026-07",
      categoria: "Comida",
      monto: 25000,
      fecha: "2026-07-10",
      descripcion: "mercado",
    },
  ],
};

describe("RepositorioArchivo", () => {
  it("CP53 — archivo inexistente → datos vacíos sin error", async () => {
    const ruta = join(await directorioTemporal(), "finanzas.json");
    const repo = new RepositorioArchivo(ruta);
    expect(await repo.leer()).toEqual({ version: 1, presupuestos: {}, gastos: [] });
  });

  it("CP54 — escribir y volver a leer → datos iguales", async () => {
    const ruta = join(await directorioTemporal(), "finanzas.json");
    const repo = new RepositorioArchivo(ruta);
    await repo.escribir(unosDatos);
    expect(await repo.leer()).toEqual(unosDatos);
  });

  it("CP55 — JSON inválido → lanza informando la ruta, y el archivo queda byte a byte igual", async () => {
    const ruta = join(await directorioTemporal(), "finanzas.json");
    const corrupto = '{ "version": 1, "presupuestos": { rotísimo';
    await writeFile(ruta, corrupto, "utf8");
    const repo = new RepositorioArchivo(ruta);
    await expect(repo.leer()).rejects.toThrow(ruta);
    expect(await readFile(ruta, "utf8")).toBe(corrupto);
  });

  it("CP56 — version desconocida → lanza sin sobrescribir", async () => {
    const ruta = join(await directorioTemporal(), "finanzas.json");
    const futuro = JSON.stringify({ version: 99, presupuestos: {}, gastos: [] });
    await writeFile(ruta, futuro, "utf8");
    const repo = new RepositorioArchivo(ruta);
    await expect(repo.leer()).rejects.toThrow(ruta);
    expect(await readFile(ruta, "utf8")).toBe(futuro);
  });

  it("CP57 — tras guardar, el directorio solo tiene finanzas.json", async () => {
    const directorio = await directorioTemporal();
    const repo = new RepositorioArchivo(join(directorio, "finanzas.json"));
    await repo.escribir(unosDatos);
    expect(await readdir(directorio)).toEqual(["finanzas.json"]);
  });

  it("un escribir que falla se propaga a su llamador y no bloquea el siguiente", async () => {
    const directorio = await directorioTemporal();
    const ruta = join(directorio, "finanzas.json");
    // Un directorio ocupando la ruta destino hace fallar el `rename` de esta escritura.
    await mkdir(ruta);
    const repo = new RepositorioArchivo(ruta);
    await expect(repo.escribir(unosDatos)).rejects.toThrow();
    await rmdir(ruta);
    await repo.escribir(unosDatos);
    expect(await repo.leer()).toEqual(unosDatos);
  });

  it("escrituras concurrentes se serializan: al final queda la última y el archivo es JSON válido", async () => {
    // Riesgo de design.md §10: dos guardados simultáneos no deben pisarse.
    const ruta = join(await directorioTemporal(), "finanzas.json");
    const repo = new RepositorioArchivo(ruta);
    const versiones: Datos[] = Array.from({ length: 5 }, (_, i) => ({
      version: 1,
      presupuestos: { "2026-07": [{ nombre: "Comida", limite: (i + 1) * 1000 }] },
      gastos: [],
    }));
    await Promise.all(versiones.map((datos) => repo.escribir(datos)));
    expect(await repo.leer()).toEqual(versiones[4]);
  });
});

// CP58 (segunda mitad) — la MISMA batería de T12, ahora contra RepositorioArchivo.
bateriaDelContrato("RepositorioArchivo", async () => {
  const ruta = join(await directorioTemporal(), "finanzas.json");
  return new RepositorioArchivo(ruta);
});
