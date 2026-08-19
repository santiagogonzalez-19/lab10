import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { CasosUso } from "../app/casos-uso";
import type { Categoria, EntradaGasto } from "../domain/tipos";
import type { Resultado } from "../domain/resultado";
import { respuestaDeError } from "./errores-http";

export function crearServidor(casos: CasosUso): Server {
  return createServer((peticion, respuesta) => {
    void atender(casos, peticion, respuesta).catch(() => {
      if (!respuesta.headersSent) {
        responder(respuesta, 500, { mensaje: "Error interno." });
      } else {
        respuesta.end();
      }
    });
  });
}

async function atender(
  casos: CasosUso,
  peticion: IncomingMessage,
  respuesta: ServerResponse,
): Promise<void> {
  const url = new URL(peticion.url ?? "/", "http://localhost");
  const metodo = peticion.method ?? "GET";
  const partes = url.pathname.split("/").filter((parte) => parte !== "");

  // El cuerpo se parsea ANTES de enrutar (CP73): un JSON ilegible es 400 del
  // pipeline del servidor, no de una ruta concreta (design.md §6, "capa HTTP").
  let cuerpo: unknown;
  if (metodo === "PUT" || metodo === "POST") {
    const crudo = await leerCuerpo(peticion);
    if (crudo.length > 0) {
      try {
        cuerpo = JSON.parse(crudo);
      } catch {
        return responder(respuesta, 400, { mensaje: "No se pudo leer la petición." });
      }
    }
  }

  // GET /api/presupuestos/{mes} · PUT /api/presupuestos/{mes}
  if (partes[0] === "api" && partes[1] === "presupuestos" && partes.length === 3) {
    const mes = decodeURIComponent(partes[2] ?? "");
    if (metodo === "GET") {
      return conResultado(respuesta, await casos.verMes(mes), 200, (valor) => valor);
    }
    if (metodo === "PUT") {
      const categorias = categoriasDelCuerpo(cuerpo);
      return conResultado(
        respuesta,
        await casos.fijarLimites(mes, categorias),
        200,
        (valor) => ({ categorias: valor }),
      );
    }
  }

  // POST /api/presupuestos/{destino}/copiar-de/{origen}
  if (
    metodo === "POST" &&
    partes[0] === "api" &&
    partes[1] === "presupuestos" &&
    partes[3] === "copiar-de" &&
    partes.length === 5
  ) {
    const destino = decodeURIComponent(partes[2] ?? "");
    const origen = decodeURIComponent(partes[4] ?? "");
    return conResultado(
      respuesta,
      await casos.copiarLimites(destino, origen),
      200,
      (valor) => ({ categorias: valor }),
    );
  }

  if (partes[0] === "api" && partes[1] === "gastos") {
    // POST /api/gastos
    if (metodo === "POST" && partes.length === 2) {
      return conResultado(
        respuesta,
        await casos.registrarGasto(entradaGastoDelCuerpo(cuerpo)),
        201,
        (valor) => valor,
      );
    }
    // GET /api/gastos?mes=YYYY-MM
    if (metodo === "GET" && partes.length === 2) {
      const mes = url.searchParams.get("mes") ?? "";
      return conResultado(respuesta, await casos.listarGastos(mes), 200, (valor) => ({
        gastos: valor,
      }));
    }
    // DELETE /api/gastos/{id}
    if (metodo === "DELETE" && partes.length === 3) {
      const id = decodeURIComponent(partes[2] ?? "");
      return conResultado(respuesta, await casos.borrarGasto(id), 204, () => undefined);
    }
  }

  return responder(respuesta, 404, { mensaje: "Recurso no encontrado." });
}

function entradaGastoDelCuerpo(cuerpo: unknown): EntradaGasto {
  const objeto = (typeof cuerpo === "object" && cuerpo !== null ? cuerpo : {}) as Record<
    string,
    unknown
  >;
  const entrada: EntradaGasto = {
    categoria: typeof objeto.categoria === "string" ? objeto.categoria : "",
    monto: typeof objeto.monto === "number" ? objeto.monto : Number.NaN,
    fecha: typeof objeto.fecha === "string" ? objeto.fecha : "",
  };
  if (typeof objeto.descripcion === "string") entrada.descripcion = objeto.descripcion;
  return entrada;
}

function categoriasDelCuerpo(cuerpo: unknown): Categoria[] {
  if (typeof cuerpo === "object" && cuerpo !== null && Array.isArray((cuerpo as { categorias?: unknown }).categorias)) {
    return (cuerpo as { categorias: Categoria[] }).categorias;
  }
  return [];
}

function conResultado<T>(
  respuesta: ServerResponse,
  resultado: Resultado<T>,
  estadoDeExito: number,
  proyectar: (valor: T) => unknown,
): void {
  if (!resultado.ok) {
    const { estado, cuerpo } = respuestaDeError(resultado.error);
    return responder(respuesta, estado, cuerpo);
  }
  return responder(respuesta, estadoDeExito, proyectar(resultado.valor));
}

function responder(respuesta: ServerResponse, estado: number, cuerpo: unknown): void {
  if (estado === 204 || cuerpo === undefined) {
    respuesta.writeHead(estado);
    respuesta.end();
    return;
  }
  const texto = JSON.stringify(cuerpo);
  respuesta.writeHead(estado, { "content-type": "application/json; charset=utf-8" });
  respuesta.end(texto);
}

function leerCuerpo(peticion: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const trozos: Buffer[] = [];
    peticion.on("data", (trozo: Buffer) => trozos.push(trozo));
    peticion.on("end", () => resolve(Buffer.concat(trozos).toString("utf8")));
    peticion.on("error", reject);
  });
}
