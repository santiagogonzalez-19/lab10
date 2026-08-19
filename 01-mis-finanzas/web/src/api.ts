// Cliente HTTP de la API. web/ no calcula estados ni porcentajes: los recibe (D6, §10).
// Los tipos replican el contrato JSON de la API; web/ no importa código de src/.

export type EstadoCategoria = "ok" | "alerta" | "excedido";

export type ConsumoCategoria = {
  categoria: string;
  limite: number;
  gastado: number;
  restante: number;
  excedido: number;
  porcentaje: number;
  estado: EstadoCategoria;
};

export type VistaMes = { mes: string; categorias: ConsumoCategoria[] };
export type Categoria = { nombre: string; limite: number };

export type ErrorApi = {
  estado: number;
  codigo?: string;
  mensaje: string;
  detalle?: Record<string, string | number>;
};

export type Respuesta<T> = { ok: true; valor: T } | { ok: false; error: ErrorApi };

async function pedir<T>(ruta: string, init?: RequestInit): Promise<Respuesta<T>> {
  const respuesta = await fetch(ruta, init);
  if (respuesta.status === 204) {
    return { ok: true, valor: null as T };
  }
  const cuerpo: unknown = await respuesta.json().catch(() => undefined);
  if (respuesta.ok) {
    return { ok: true, valor: cuerpo as T };
  }
  const error = (cuerpo ?? {}) as { codigo?: string; mensaje?: string; detalle?: Record<string, string | number> };
  return {
    ok: false,
    error: {
      estado: respuesta.status,
      mensaje: error.mensaje ?? "Error inesperado.",
      ...(error.codigo !== undefined ? { codigo: error.codigo } : {}),
      ...(error.detalle !== undefined ? { detalle: error.detalle } : {}),
    },
  };
}

export function verMes(mes: string): Promise<Respuesta<VistaMes>> {
  return pedir(`/api/presupuestos/${encodeURIComponent(mes)}`);
}

export function copiarLimites(
  destino: string,
  origen: string,
): Promise<Respuesta<{ categorias: Categoria[] }>> {
  return pedir(
    `/api/presupuestos/${encodeURIComponent(destino)}/copiar-de/${encodeURIComponent(origen)}`,
    { method: "POST" },
  );
}

export function fijarLimites(
  mes: string,
  categorias: Categoria[],
): Promise<Respuesta<{ categorias: Categoria[] }>> {
  return pedir(`/api/presupuestos/${encodeURIComponent(mes)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ categorias }),
  });
}
