import { randomUUID } from "node:crypto";
import { crearCasosUso } from "./app/casos-uso";
import { crearServidor } from "./server/servidor";
import { RepositorioArchivo } from "./storage/repositorio-archivo";

const RUTA_DATOS = process.env.FINANZAS_DATOS ?? "datos/finanzas.json";
const PUERTO = Number(process.env.PORT ?? 3000);

async function principal(): Promise<void> {
  const repositorio = new RepositorioArchivo(RUTA_DATOS);
  // Flujo D (design.md §3): leer ANTES de escuchar. Si el archivo es ilegible,
  // esto lanza, el proceso no arranca y el archivo queda intacto (NF3).
  await repositorio.leer();
  const servidor = crearServidor(crearCasosUso(repositorio, () => randomUUID()));
  servidor.listen(PUERTO, () => {
    console.log(`Presupuesto mensual escuchando en http://localhost:${PUERTO}`);
    console.log(`Datos en ${RUTA_DATOS}`);
  });
}

principal().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
