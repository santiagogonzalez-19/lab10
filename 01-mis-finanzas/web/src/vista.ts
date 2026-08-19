// Dibuja el mes. La vista no reordena, no calcula estados ni porcentajes:
// muestra lo que la API devuelve (D6, riesgo de design.md §10).

import type { Categoria, ConsumoCategoria, EntradaGasto, ErrorApi, VistaMes } from "./api";

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
  alEditar: () => void;
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
  const barra = document.createElement("p");
  const editar = document.createElement("button");
  editar.textContent = "Ajustar límites";
  editar.addEventListener("click", () => acciones.alEditar());
  barra.append(editar);
  raiz.append(seccion, barra);
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
  const copiar = document.createElement("button");
  copiar.textContent = `Copiar los límites de ${origen}`;
  copiar.addEventListener("click", () => acciones.alCopiar(origen));
  const definir = document.createElement("button");
  definir.textContent = "Definir límites";
  definir.addEventListener("click", () => acciones.alEditar());
  const botones = document.createElement("p");
  botones.className = "botones";
  botones.append(copiar, " ", definir);
  contenedor.append(texto, botones);
  return contenedor;
}

export type AccionesDeEditor = {
  alGuardar: (categorias: Categoria[]) => void;
  alCancelar: () => void;
};

// El mismo editor sirve para fijar (mes sin presupuesto) y ajustar (mes con
// límites): se edita y guarda el conjunto completo, como R1.2 trata la operación.
export function dibujarEditor(
  raiz: HTMLElement,
  mes: string,
  actuales: Categoria[],
  acciones: AccionesDeEditor,
): void {
  raiz.replaceChildren();
  const seccion = document.createElement("section");
  seccion.className = "editor";
  const titulo = document.createElement("h2");
  titulo.textContent = `Límites de ${mes}`;
  const filas = document.createElement("div");
  filas.className = "filas";
  for (const categoria of actuales) {
    filas.append(filaDeCategoria(categoria));
  }
  if (actuales.length === 0) filas.append(filaDeCategoria());

  const agregar = document.createElement("button");
  agregar.textContent = "+ Agregar categoría";
  agregar.addEventListener("click", () => filas.append(filaDeCategoria()));

  const guardar = document.createElement("button");
  guardar.textContent = "Guardar";
  guardar.addEventListener("click", () => {
    const categorias: Categoria[] = [];
    for (const fila of filas.querySelectorAll<HTMLElement>(".fila-editor")) {
      const nombre = fila.querySelector<HTMLInputElement>(".campo-nombre")?.value ?? "";
      const limite = fila.querySelector<HTMLInputElement>(".campo-limite")?.value ?? "";
      categorias.push({ nombre, limite: Number(limite) });
    }
    acciones.alGuardar(categorias);
  });

  const cancelar = document.createElement("button");
  cancelar.textContent = "Cancelar";
  cancelar.addEventListener("click", () => acciones.alCancelar());

  const botones = document.createElement("p");
  botones.className = "botones";
  botones.append(agregar, " ", guardar, " ", cancelar);
  seccion.append(titulo, filas, botones);
  raiz.append(seccion);
}

function filaDeCategoria(categoria?: Categoria): HTMLElement {
  const fila = document.createElement("div");
  fila.className = "fila-editor";
  const nombre = document.createElement("input");
  nombre.className = "campo-nombre";
  nombre.placeholder = "Categoría";
  nombre.value = categoria?.nombre ?? "";
  const limite = document.createElement("input");
  limite.className = "campo-limite";
  limite.type = "number";
  limite.placeholder = "Límite";
  limite.value = categoria === undefined ? "" : String(categoria.limite);
  const quitar = document.createElement("button");
  quitar.textContent = "Quitar";
  quitar.addEventListener("click", () => fila.remove());
  fila.append(nombre, limite, quitar);
  return fila;
}

// El 409 conflicta con los datos, no con el formulario (D5): la salida que se
// ofrece es revisar los gastos del mes, no corregir campos.
export function dibujarErrorDeEditor(
  raiz: HTMLElement,
  error: ErrorApi,
  alRevisarGastos: () => void,
): void {
  raiz.querySelectorAll(".mensaje-error").forEach((previo) => previo.remove());
  const parrafo = document.createElement("p");
  parrafo.className = "mensaje-error";
  parrafo.textContent = error.mensaje;
  if (error.estado === 409) {
    const revisar = document.createElement("button");
    revisar.textContent = "Revisar los gastos del mes";
    revisar.addEventListener("click", alRevisarGastos);
    parrafo.append(" ", revisar);
  }
  raiz.querySelector(".editor")?.append(parrafo);
}

export function dibujarError(raiz: HTMLElement, error: ErrorApi): void {
  // Un solo mensaje visible: clicks repetidos reemplazan el anterior, no lo apilan.
  raiz.querySelectorAll(".mensaje-error").forEach((previo) => previo.remove());
  const parrafo = document.createElement("p");
  parrafo.className = "mensaje-error";
  parrafo.textContent = error.mensaje;
  raiz.append(parrafo);
}

export type AccionesDeGasto = {
  alRegistrar: (entrada: EntradaGasto) => void;
};

// Formulario de registro (T21). El select ofrece las categorías del mes en
// pantalla como comodidad; la que manda es la del mes de la FECHA (R3.2), y
// el rechazo de esa regla llega de la API, no se anticipa acá.
export function dibujarFormularioGasto(
  raiz: HTMLElement,
  categorias: string[],
  acciones: AccionesDeGasto,
): void {
  const seccion = document.createElement("section");
  seccion.className = "form-gasto";
  const titulo = document.createElement("h2");
  titulo.textContent = "Registrar un gasto";

  const fecha = document.createElement("input");
  fecha.type = "date";
  fecha.className = "campo-fecha";
  fecha.value = new Date().toISOString().slice(0, 10);

  const categoria = document.createElement("select");
  categoria.className = "campo-categoria";
  for (const nombre of categorias) {
    const opcion = document.createElement("option");
    opcion.value = nombre;
    opcion.textContent = nombre;
    categoria.append(opcion);
  }

  const monto = document.createElement("input");
  monto.type = "number";
  monto.className = "campo-monto";
  monto.placeholder = "Monto";

  const descripcion = document.createElement("input");
  descripcion.className = "campo-descripcion";
  descripcion.placeholder = "Descripción (opcional)";

  const boton = document.createElement("button");
  boton.textContent = "Registrar";
  boton.addEventListener("click", () => {
    acciones.alRegistrar({
      categoria: categoria.value,
      monto: Number(monto.value),
      fecha: fecha.value,
      ...(descripcion.value !== "" ? { descripcion: descripcion.value } : {}),
    });
  });

  const fila = document.createElement("div");
  fila.className = "fila-editor";
  fila.append(fecha, categoria, monto, descripcion, boton);
  seccion.append(titulo, fila);
  raiz.append(seccion);
}

// El aviso sale de la respuesta del POST (CP64): sin segunda petición.
export function dibujarAvisoDeGasto(raiz: HTMLElement, consumo: ConsumoCategoria): void {
  raiz.querySelectorAll(".aviso-gasto").forEach((previo) => previo.remove());
  const aviso = document.createElement("p");
  aviso.className = "aviso-gasto";
  if (consumo.estado === "excedido") {
    aviso.classList.add("aviso-excedido");
    aviso.textContent = `«${consumo.categoria}» quedó excedida en ${formatearPesos(consumo.excedido)}.`;
  } else if (consumo.estado === "alerta") {
    aviso.classList.add("aviso-alerta");
    aviso.textContent = `«${consumo.categoria}» está en alerta: ${consumo.porcentaje} % del límite.`;
  } else {
    aviso.textContent = `Gasto registrado en «${consumo.categoria}»: ${consumo.porcentaje} % del límite.`;
  }
  raiz.prepend(aviso);
}

// R3.3 en pantalla: el 400 de categoría sin presupuesto trae la salida
// «Defínelo primero», que lleva a la pantalla de límites (T23).
export function dibujarErrorDeGasto(
  raiz: HTMLElement,
  error: ErrorApi,
  alDefinirLimites?: () => void,
): void {
  raiz.querySelectorAll(".mensaje-error").forEach((previo) => previo.remove());
  // Un aviso de un registro anterior no debe convivir con el error del nuevo.
  raiz.querySelectorAll(".aviso-gasto").forEach((previo) => previo.remove());
  const parrafo = document.createElement("p");
  parrafo.className = "mensaje-error";
  parrafo.textContent = error.mensaje;
  if (error.codigo === "CATEGORIA_SIN_PRESUPUESTO" && alDefinirLimites) {
    const definir = document.createElement("button");
    definir.textContent = "Definir el límite";
    definir.addEventListener("click", alDefinirLimites);
    parrafo.append(" ", definir);
  }
  raiz.querySelector(".form-gasto")?.append(parrafo);
}
