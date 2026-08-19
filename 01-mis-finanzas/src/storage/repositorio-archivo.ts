import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { datosVacios, type Datos, type Repositorio } from "./repositorio";

export class RepositorioArchivo implements Repositorio {
  // Serializa las escrituras (design.md §10): cada `escribir` espera a la anterior.
  private colaDeEscritura: Promise<void> = Promise.resolve();
  private contadorTemporal = 0;

  constructor(private readonly ruta: string) {}

  async leer(): Promise<Datos> {
    let contenido: string;
    try {
      contenido = await readFile(this.ruta, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return datosVacios();
      }
      throw error;
    }
    let datos: unknown;
    try {
      datos = JSON.parse(contenido);
    } catch (error) {
      throw new Error(
        `El archivo de datos ${this.ruta} no contiene JSON válido y no se va a sobrescribir: ${String(error)}`,
      );
    }
    if (
      typeof datos !== "object" ||
      datos === null ||
      (datos as { version?: unknown }).version !== 1
    ) {
      throw new Error(
        `El archivo de datos ${this.ruta} tiene una versión desconocida y no se va a sobrescribir.`,
      );
    }
    return datos as Datos;
  }

  async escribir(datos: Datos): Promise<void> {
    const escritura = this.colaDeEscritura.then(() => this.escribirAhora(datos));
    // La cola nunca queda rechazada: un fallo se propaga al llamador de este
    // `escribir`, pero no bloquea los siguientes.
    this.colaDeEscritura = escritura.catch(() => undefined);
    return escritura;
  }

  private async escribirAhora(datos: Datos): Promise<void> {
    await mkdir(dirname(this.ruta), { recursive: true });
    // Escritura atómica (NF2, D8): temporal en el mismo directorio + rename.
    const temporal = join(
      dirname(this.ruta),
      `.finanzas-${process.pid}-${this.contadorTemporal++}.tmp`,
    );
    try {
      await writeFile(temporal, JSON.stringify(datos, null, 2), "utf8");
      await rename(temporal, this.ruta);
    } catch (error) {
      await unlink(temporal).catch(() => undefined);
      throw error;
    }
  }
}
