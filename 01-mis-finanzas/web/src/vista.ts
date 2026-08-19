// Dibuja el mes. La vista no reordena, no calcula estados ni porcentajes:
// muestra lo que la API devuelve (D6, riesgo de design.md §10).

import type { ConsumoCategoria, ErrorApi, VistaMes } from "./api";

const pesos = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatearPesos(valor: number): string {
  return pesos.format(valor);
}

export function mesAnterior(mes: string): string {
  const anio = Number(mes.slice(0, 4));
  const numero = Number(mes.slice(5, 7));
  return numero === 1
    ? `${anio - 1}-12`
    : `${anio}-${String(numero - 1).padStart(2, "0")}`;
}

export type AccionesDeMes = {
  alCopiar: (origen: string) => void;
};

export function dibujarMes(
  raiz: HTMLElement,
  vista: VistaMes,
  acciones: AccionesDeMes,
): void {
  raiz.replaceChildren();
  if (vista.categorias.length === 0) {
    raiz.append(vistaVacia(vista.mes, acciones));
    return;
  }
  const seccion = document.createElement("section");
  for (const categoria of vista.categorias) {
    seccion.append(tarjetaDeCategoria(categoria));
  }
  raiz.append(seccion);
}

function tarjetaDeCategoria(consumo: ConsumoCategoria): HTMLElement {
  const tarjeta = document.createElement("article");
  tarjeta.className = `categoria estado-${consumo.estado}`;

  const fila = document.createElement("div");
  fila.className = "fila";
  const nombre = document.createElement("span");
  nombre.className = "nombre";
  nombre.textContent = consumo.categoria;
  const cifras = document.createElement("span");
  cifras.textContent = `${formatearPesos(consumo.gastado)} de ${formatearPesos(consumo.limite)}`;
  fila.append(nombre, cifras);

  const barra = document.createElement("div");
  barra.className = "barra";
  const relleno = document.createElement("div");
  relleno.style.width = `${Math.min(100, consumo.porcentaje)}%`;
  barra.append(relleno);

  const detalle = document.createElement("p");
  detalle.className = "detalle";
  if (consumo.estado === "excedido") {
    const exceso = document.createElement("span");
    exceso.className = "exceso";
    exceso.textContent = `Excedido en ${formatearPesos(consumo.excedido)}`;
    detalle.append(exceso, ` · ${consumo.porcentaje} % del límite`);
  } else if (consumo.estado === "alerta") {
    const aviso = document.createElement("span");
    aviso.className = "alerta-texto";
    aviso.textContent = "En alerta";
    detalle.append(
      aviso,
      ` · ${consumo.porcentaje} % del límite · restan ${formatearPesos(consumo.restante)}`,
    );
  } else {
    detalle.textContent = `${consumo.porcentaje} % del límite · restan ${formatearPesos(consumo.restante)}`;
  }

  tarjeta.append(fila, barra, detalle);
  return tarjeta;
}

function vistaVacia(mes: string, acciones: AccionesDeMes): HTMLElement {
  const contenedor = document.createElement("section");
  contenedor.className = "vacio";
  const texto = document.createElement("p");
  texto.textContent = `${mes} no tiene presupuesto todavía.`;
  const origen = mesAnterior(mes);
  const boton = document.createElement("button");
  boton.textContent = `Copiar los límites de ${origen}`;
  boton.addEventListener("click", () => acciones.alCopiar(origen));
  contenedor.append(texto, boton);
  return contenedor;
}

export function dibujarError(raiz: HTMLElement, error: ErrorApi): void {
  // Un solo mensaje visible: clicks repetidos reemplazan el anterior, no lo apilan.
  raiz.querySelectorAll(".mensaje-error").forEach((previo) => previo.remove());
  const parrafo = document.createElement("p");
  parrafo.className = "mensaje-error";
  parrafo.textContent = error.mensaje;
  raiz.append(parrafo);
}
