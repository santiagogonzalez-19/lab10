import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// CP74 — NF4: las reglas del dominio se ejecutan sin servidor, navegador ni disco.
// El escaneo cubre los archivos de producción de src/domain/ y excluye *.test.ts:
// NF4 protege las reglas, no a sus tests (este archivo mismo importa node:fs).
const DIRECTORIO_DOMINIO = dirname(fileURLToPath(import.meta.url));

const IMPORTACIONES_PROHIBIDAS = [
  /from\s+["']node:/, //         import x from "node:..."
  /import\s+["']node:/, //       import "node:..." (por efecto)
  /import\(\s*["']node:/, //     import("node:...") dinámico
  /require\(\s*["']node:/, //    require("node:...")
  /["'][^"']*\/storage\//, //    cualquier forma de importar los anillos externos
  /["'][^"']*\/app\//,
  /["'][^"']*\/server\//,
];

describe("pureza del dominio", () => {
  it("CP74 — ningún archivo de producción de src/domain/ importa node:*, storage, app ni server", () => {
    const archivos = readdirSync(DIRECTORIO_DOMINIO).filter(
      (nombre) => nombre.endsWith(".ts") && !nombre.endsWith(".test.ts"),
    );
    expect(archivos.length).toBeGreaterThan(0);

    for (const nombre of archivos) {
      const contenido = readFileSync(join(DIRECTORIO_DOMINIO, nombre), "utf8");
      for (const prohibida of IMPORTACIONES_PROHIBIDAS) {
        expect(
          prohibida.test(contenido),
          `${nombre} contiene una importación prohibida (${prohibida})`,
        ).toBe(false);
      }
    }
  });
});
