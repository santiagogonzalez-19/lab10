// Pantalla "3 · Know Me": subir extractos, ver el panorama que Northstar
// deduce de ellos, y registrar a mano lo que los archivos no traen.
//
// Las cifras del panorama son las del mockup: se derivarian de los archivos,
// y aqui no hay nada que los procese.

import { botonTexto, cabeceraDePasos, elemento, type Paso } from "../ds/componentes";
import { icono, type NombreIcono } from "../ds/iconos";
import type { Pantalla } from "../rutas";
import { CATEGORIAS, MONEDAS } from "./catalogos";
import {
  agregarArchivos,
  agregarMovimiento,
  CONOCEME_INICIAL,
  elegirTipo,
  escribirCampo,
  formatearMonto,
  formatearTamano,
  puedeAgregar,
  quitarArchivo,
  type EstadoConoceme,
  type TipoMovimiento,
} from "./conoceme-estado";

const PASOS: readonly Paso[] = [
  { etiqueta: "Account", estado: "hecho" },
  { etiqueta: "Profile", estado: "hecho" },
  { etiqueta: "Know Me", estado: "actual" },
  { etiqueta: "Plan", estado: "pendiente" },
];

const FIGURAS: readonly { valor: string; leyenda: string; destacada?: boolean }[] = [
  { valor: "$48,920", leyenda: "Total balance", destacada: true },
  { valor: "23%", leyenda: "Savings rate" },
  { valor: "$7,450", leyenda: "Monthly income" },
  { valor: "$5,710", leyenda: "Monthly spending" },
];

// El ancho del relleno sale del mockup: 200, 88, 50 y 28 sobre una pista de 312.
const GASTOS: readonly { categoria: string; monto: string; porcentaje: number }[] = [
  { categoria: "Housing", monto: "$2,180", porcentaje: 64 },
  { categoria: "Food & dining", monto: "$960", porcentaje: 28 },
  { categoria: "Transport", monto: "$540", porcentaje: 16 },
  { categoria: "Subscriptions", monto: "$310", porcentaje: 9 },
];

const DESTACADOS: readonly { icono: NombreIcono; texto: string; aviso?: boolean }[] = [
  { icono: "trending-up", texto: "Spending is down 8% vs. last month." },
  { icono: "chart-pie", texto: "Housing is your top category at 38%." },
  { icono: "triangle-alert", texto: "2 subscriptions overlap — possible savings.", aviso: true },
];

const TIPOS: readonly { id: TipoMovimiento; etiqueta: string; icono: NombreIcono }[] = [
  { id: "expense", etiqueta: "Expense", icono: "trending-down" },
  { id: "income", etiqueta: "Income", icono: "trending-up" },
];

export function montarConoceme(raiz: HTMLElement, navegar: (p: Pantalla) => void): void {
  let estado = CONOCEME_INICIAL;
  let siguienteId = 0;
  const nuevoId = (prefijo: string): string => `${prefijo}${(siguienteId += 1)}`;

  const pantalla = elemento("div", "pantalla-conoceme");
  const envoltorio = elemento("div", "envoltorio");
  const columna = elemento("div", "columna-ancha");
  envoltorio.append(columna);
  pantalla.append(
    cabeceraDePasos({
      marca: "Northstar",
      icono: "compass",
      tamanoIcono: 22,
      variante: "conoceme",
      pasos: PASOS,
    }),
    envoltorio,
  );

  // --- Zona de subida y lista de archivos ---
  const zonas = elemento("div", "zonas");
  const bloqueSubida = elemento("section", "bloque bloque--subida");
  const encabezado = elemento("div", "bloque__encabezado");
  encabezado.append(
    elemento("h1", "bloque__titulo", "Know me"),
    elemento(
      "p",
      "bloque__subtitulo",
      "Upload your recent statements so Northstar can understand your finances.",
    ),
  );

  const selector = elemento("input");
  selector.type = "file";
  selector.multiple = true;
  selector.accept = ".pdf,.csv,.xlsx";
  selector.hidden = true;

  const zona = elemento("div", "zona-suelta");
  const circulo = elemento("span", "zona-suelta__circulo");
  circulo.append(icono("cloud-upload", 28));
  const explorar = elemento("button", "boton-pildora");
  explorar.type = "button";
  explorar.append(icono("folder-open", 16), elemento("span", undefined, "Browse files"));
  zona.append(
    circulo,
    elemento("p", "zona-suelta__titulo", "Drag & drop your statements"),
    elemento(
      "p",
      "zona-suelta__formatos",
      "Supported formats: PDF, CSV, XLSX · up to 25 MB",
    ),
    explorar,
    selector,
  );

  const archivos = elemento("div", "archivos");
  const archivosEtiqueta = elemento("p", "archivos__etiqueta");
  const archivosLista = elemento("div", "archivos");
  archivos.append(archivosEtiqueta, archivosLista);

  bloqueSubida.append(encabezado, zona, archivos);

  // --- Panorama financiero (estatico) ---
  const snapshot = elemento("section", "bloque bloque--snapshot");
  const snapEnc = elemento("div", "snapshot__encabezado");
  const tag = elemento("span", "etiqueta-generado");
  tag.append(icono("sparkles", 12), elemento("span", undefined, "Generated"));
  snapEnc.append(elemento("h2", "snapshot__titulo", "Your financial snapshot"), tag);

  const figuras = elemento("div", "figuras");
  for (let i = 0; i < FIGURAS.length; i += 2) {
    const fila = elemento("div", "figuras__fila");
    for (const dato of FIGURAS.slice(i, i + 2)) {
      const figura = elemento(
        "div",
        dato.destacada === true ? "figura figura--destacada" : "figura",
      );
      figura.append(
        elemento("span", "figura__valor", dato.valor),
        elemento("span", "figura__leyenda", dato.leyenda),
      );
      fila.append(figura);
    }
    figuras.append(fila);
  }

  const barras = elemento("div", "barras");
  barras.append(elemento("p", "barras__titulo", "Spending by category"));
  for (const gasto of GASTOS) {
    const barra = elemento("div", "barra");
    const fila = elemento("div", "barra__fila");
    fila.append(
      elemento("span", undefined, gasto.categoria),
      elemento("span", "barra__monto", gasto.monto),
    );
    const pista = elemento("div", "barra__pista");
    const relleno = elemento("div", "barra__relleno");
    relleno.style.width = `${gasto.porcentaje}%`;
    pista.append(relleno);
    barra.append(fila, pista);
    barras.append(barra);
  }

  const destacados = elemento("div", "destacados");
  destacados.append(elemento("p", "destacados__titulo", "Highlights"));
  for (const dato of DESTACADOS) {
    const fila = elemento(
      "div",
      dato.aviso === true ? "destacado destacado--aviso" : "destacado",
    );
    fila.append(icono(dato.icono, 16), elemento("span", undefined, dato.texto));
    destacados.append(fila);
  }

  snapshot.append(snapEnc, figuras, barras, destacados);
  zonas.append(bloqueSubida, snapshot);

  // --- Alta manual ---
  const manual = elemento("section", "bloque");
  const manualEnc = elemento("div", "manual__encabezado");
  const manualTexto = elemento("div", "manual__texto");
  manualTexto.append(
    elemento("h2", "manual__titulo", "Add income or expense"),
    elemento("p", "manual__sub", "Log a transaction we couldn't detect from your files."),
  );
  const conmutador = elemento("div", "conmutador");
  conmutador.setAttribute("role", "group");
  const botonesTipo = TIPOS.map((tipo) => {
    const boton = elemento("button", "conmutador__opcion");
    boton.type = "button";
    boton.dataset["tipo"] = tipo.id;
    boton.setAttribute("aria-pressed", "false");
    boton.append(icono(tipo.icono, 15), elemento("span", undefined, tipo.etiqueta));
    conmutador.append(boton);
    return boton;
  });
  manualEnc.append(manualTexto, conmutador);

  const filaFormulario = elemento("div", "fila-formulario");
  const descripcion = campoTextoCorto("Description", "e.g. Monthly rent", true);
  const valor = campoTextoCorto("Value", "0.00", false, 130);
  const moneda = campoSelect("Currency", MONEDAS, 110);
  const categoria = campoSelect("Category", CATEGORIAS, 190, "Select category");
  const agregar = elemento("button", "boton-agregar");
  agregar.type = "button";
  agregar.append(icono("plus", 17), elemento("span", undefined, "Add"));
  filaFormulario.append(
    descripcion.raiz,
    valor.raiz,
    moneda.raiz,
    categoria.raiz,
    agregar,
  );

  const recientes = elemento("div", "recientes");
  const recientesLista = elemento("div", "recientes");
  recientes.append(elemento("p", "recientes__etiqueta", "RECENTLY ADDED"), recientesLista);

  manual.append(manualEnc, filaFormulario, recientes);

  // --- Pie ---
  const acciones = elemento("div", "acciones");
  const atras = botonTexto("Back", "arrow-left");
  const continuar = elemento("button", "boton-final");
  continuar.type = "button";
  continuar.append(
    elemento("span", undefined, "Continue to plan"),
    icono("arrow-right", 16),
  );
  acciones.append(atras, continuar);

  columna.append(zonas, manual, acciones);
  raiz.replaceChildren(pantalla);

  const cambiar = (siguiente: EstadoConoceme): void => {
    estado = siguiente;
    pintar();
  };

  // --- Eventos ---
  explorar.addEventListener("click", () => selector.click());
  selector.addEventListener("change", () => {
    cambiar(agregarArchivos(estado, desdeArchivos(selector.files)));
    selector.value = "";
  });
  zona.addEventListener("dragover", (evento) => {
    evento.preventDefault();
    zona.dataset["encima"] = "";
  });
  zona.addEventListener("dragleave", () => delete zona.dataset["encima"]);
  zona.addEventListener("drop", (evento) => {
    evento.preventDefault();
    delete zona.dataset["encima"];
    cambiar(agregarArchivos(estado, desdeArchivos(evento.dataTransfer?.files ?? null)));
  });

  botonesTipo.forEach((boton, indice) => {
    const tipo = TIPOS[indice];
    if (tipo === undefined) return;
    boton.addEventListener("click", () => cambiar(elegirTipo(estado, tipo.id)));
  });
  descripcion.entrada.addEventListener("input", () =>
    cambiar(escribirCampo(estado, "descripcion", descripcion.entrada.value)),
  );
  valor.entrada.addEventListener("input", () =>
    cambiar(escribirCampo(estado, "valor", valor.entrada.value)),
  );
  moneda.entrada.addEventListener("change", () =>
    cambiar(escribirCampo(estado, "moneda", moneda.entrada.value)),
  );
  categoria.entrada.addEventListener("change", () =>
    cambiar(escribirCampo(estado, "categoria", categoria.entrada.value)),
  );
  agregar.addEventListener("click", () => cambiar(agregarMovimiento(estado, nuevoId("m"))));

  atras.addEventListener("click", () => navegar("perfil"));
  continuar.addEventListener("click", () => navegar("plan"));

  function desdeArchivos(lista: FileList | null): { id: string; nombre: string; tamano: string }[] {
    return Array.from(lista ?? []).map((archivo) => ({
      id: nuevoId("f"),
      nombre: archivo.name,
      tamano: formatearTamano(archivo.size),
    }));
  }

  // Una sola funcion escribe TODO lo que se deriva del estado.
  function pintar(): void {
    archivosEtiqueta.textContent = `Uploaded (${estado.archivos.length})`;
    archivos.hidden = estado.archivos.length === 0;
    archivosLista.replaceChildren(...estado.archivos.map(filaDeArchivo));

    for (const [indice, boton] of botonesTipo.entries()) {
      boton.setAttribute("aria-pressed", String(TIPOS[indice]?.id === estado.tipo));
    }
    if (descripcion.entrada.value !== estado.descripcion) {
      descripcion.entrada.value = estado.descripcion;
    }
    if (valor.entrada.value !== estado.valor) valor.entrada.value = estado.valor;
    moneda.entrada.value = estado.moneda;
    categoria.entrada.value = estado.categoria;
    agregar.disabled = !puedeAgregar(estado);

    recientesLista.replaceChildren(
      ...(estado.movimientos.length === 0
        ? [elemento("p", "vacio", "Nothing added yet.")]
        : estado.movimientos.map(filaDeMovimiento)),
    );
  }

  function filaDeArchivo(archivo: EstadoConoceme["archivos"][number]): HTMLElement {
    const fila = elemento("div", "archivo");
    const caja = elemento("span", "archivo__icono");
    caja.append(icono("file-text", 18));

    const meta = elemento("div", "archivo__meta");
    const listo = archivo.progreso >= 100;
    meta.append(
      elemento("span", "archivo__nombre", archivo.nombre),
      elemento(
        "span",
        "archivo__tamano",
        listo ? archivo.tamano : `${archivo.tamano} · uploading…`,
      ),
    );

    const insignia = elemento("span", listo ? "insignia" : "insignia insignia--subiendo");
    insignia.append(
      icono(listo ? "circle-check" : "loader", 13),
      elemento("span", undefined, listo ? "Done" : `${archivo.progreso}%`),
    );

    const quitar = elemento("button", "archivo__quitar");
    quitar.type = "button";
    quitar.setAttribute("aria-label", `Remove ${archivo.nombre}`);
    quitar.append(icono("x", 18));
    quitar.addEventListener("click", () => cambiar(quitarArchivo(estado, archivo.id)));

    fila.append(caja, meta, insignia, quitar);
    return fila;
  }

  function filaDeMovimiento(
    movimiento: EstadoConoceme["movimientos"][number],
  ): HTMLElement {
    const fila = elemento("div", "movimiento");
    fila.dataset["tipo"] = movimiento.tipo;

    const izquierda = elemento("div", "movimiento__izquierda");
    const caja = elemento("span", "movimiento__icono");
    caja.append(icono(movimiento.tipo === "income" ? "trending-up" : "trending-down", 17));
    const meta = elemento("div", "movimiento__meta");
    meta.append(
      elemento("span", "movimiento__desc", movimiento.descripcion),
      elemento(
        "span",
        "movimiento__cat",
        `${movimiento.tipo === "income" ? "Income" : "Expense"} · ${movimiento.moneda}`,
      ),
    );
    izquierda.append(caja, meta);

    fila.append(izquierda, elemento("span", "movimiento__monto", formatearMonto(movimiento)));
    return fila;
  }

  pintar();
}

type CampoCorto = { raiz: HTMLElement; entrada: HTMLInputElement };

function campoTextoCorto(
  etiqueta: string,
  placeholder: string,
  ancho: boolean,
  px?: number,
): CampoCorto {
  const raiz = elemento("label", ancho ? "campo-corto campo-corto--ancho" : "campo-corto");
  if (px !== undefined) raiz.style.width = `${px}px`;
  raiz.append(elemento("span", "campo-corto__etiqueta", etiqueta));

  const caja = elemento("span", "campo-corto__caja");
  const entrada = elemento("input");
  entrada.type = "text";
  entrada.placeholder = placeholder;
  caja.append(entrada);
  raiz.append(caja);
  return { raiz, entrada };
}

type CampoSelect = { raiz: HTMLElement; entrada: HTMLSelectElement };

function campoSelect(
  etiqueta: string,
  opciones: readonly string[],
  px: number,
  vacio?: string,
): CampoSelect {
  const raiz = elemento("label", "campo-corto");
  raiz.style.width = `${px}px`;
  raiz.append(elemento("span", "campo-corto__etiqueta", etiqueta));

  const caja = elemento("span", "campo-corto__caja");
  const entrada = elemento("select");
  if (vacio !== undefined) {
    const opcion = elemento("option", undefined, vacio);
    opcion.value = "";
    entrada.append(opcion);
  }
  for (const valor of opciones) {
    const opcion = elemento("option", undefined, valor);
    opcion.value = valor;
    entrada.append(opcion);
  }
  caja.append(entrada, icono("chevron-down", 16));
  raiz.append(caja);
  return { raiz, entrada };
}
