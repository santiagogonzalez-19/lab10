import { datosVacios, type Datos, type Repositorio } from "./repositorio";

export class RepositorioMemoria implements Repositorio {
  private datos: Datos = datosVacios();

  async leer(): Promise<Datos> {
    // Clona para que el llamador no pueda mutar el estado guardado por referencia.
    return structuredClone(this.datos);
  }

  async escribir(datos: Datos): Promise<void> {
    this.datos = structuredClone(datos);
  }
}
