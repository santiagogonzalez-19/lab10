// Los controles del mockup, como constructores de DOM. Cada uno devuelve las
// partes que despues cambian con el estado, para que la pantalla las parche
// sin reemplazar nodos (reemplazarlos pierde el foco del teclado).

import { icono, type NombreIcono } from "./iconos";

export function elemento<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  clase?: string,
  texto?: string,
): HTMLElementTagNameMap[K] {
  const nodo = document.createElement(etiqueta);
  if (clase !== undefined) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function conClase(nodo: HTMLElement, clase: string): HTMLElement {
  nodo.classList.add(clase);
  return nodo;
}

export type CampoTexto = {
  raiz: HTMLElement;
  entrada: HTMLInputElement;
  error: HTMLElement;
  toggle: HTMLButtonElement | null;
  toggleEtiqueta: HTMLElement | null;
};

export function campoTexto(opciones: {
  etiqueta: string;
  tipo: "email" | "password";
  placeholder: string;
  conToggle?: boolean;
}): CampoTexto {
  const raiz = elemento("label", "campo");
  raiz.append(elemento("span", "campo__etiqueta", opciones.etiqueta));

  const caja = elemento("span", "campo__caja");
  const entrada = elemento("input", "campo__entrada");
  entrada.type = opciones.tipo;
  entrada.placeholder = opciones.placeholder;
  caja.append(entrada);

  let toggle: HTMLButtonElement | null = null;
  let toggleEtiqueta: HTMLElement | null = null;
  if (opciones.conToggle === true) {
    toggle = elemento("button", "campo__toggle");
    toggle.type = "button";
    toggleEtiqueta = elemento("span", undefined, "Show");
    toggle.append(
      conClase(icono("eye-off", 16), "icono--base"),
      conClase(icono("eye", 16), "icono--alterno"),
      toggleEtiqueta,
    );
    caja.append(toggle);
  }

  const error = elemento("span", "campo__error");
  raiz.append(caja, error);
  return { raiz, entrada, error, toggle, toggleEtiqueta };
}

export function casilla(etiqueta: string): { raiz: HTMLButtonElement } {
  const raiz = elemento("button", "casilla");
  raiz.type = "button";
  raiz.setAttribute("role", "checkbox");
  raiz.setAttribute("aria-checked", "false");

  const marca = elemento("span", "casilla__marca");
  marca.append(icono("check", 12));
  raiz.append(marca, elemento("span", undefined, etiqueta));
  return { raiz };
}

export function enlace(texto: string): HTMLButtonElement {
  const boton = elemento("button", "enlace", texto);
  boton.type = "button";
  return boton;
}

// El unico lugar donde se muestra un fallo del servidor. No es un error de
// campo: cuando las credenciales no coinciden, nadie sabe cual de los dos esta
// mal, asi que culpar a uno seria mentir.
//
// role="alert" hace que un lector de pantalla lo anuncie al aparecer el texto.
// El nodo se crea una vez y se oculta con `hidden` en vez de entrar y salir del
// arbol (D9): asi el panel no salta de alto, y getByRole("alert") no lo
// encuentra mientras esta vacio, que es como el E2E afirma "no hay mensaje".
export function mensajeFormulario(): { raiz: HTMLElement } {
  const raiz = elemento("div", "mensaje-formulario");
  raiz.setAttribute("role", "alert");
  raiz.hidden = true;
  return { raiz };
}

export function botonPrimario(etiqueta: string): HTMLButtonElement {
  const boton = elemento("button", "boton boton--primario", etiqueta);
  boton.type = "button";
  return boton;
}

export function botonGoogle(etiqueta: string): HTMLButtonElement {
  const boton = elemento("button", "boton boton--secundario");
  boton.type = "button";
  boton.append(
    elemento("span", "marca-google", "G"),
    elemento("span", undefined, etiqueta),
  );
  return boton;
}

export type Paso = { etiqueta: string; estado: "hecho" | "actual" | "pendiente" };

export type VarianteCabecera = "perfil" | "conoceme" | "plan";

export function cabeceraDePasos(opciones: {
  marca: string;
  icono: NombreIcono;
  tamanoIcono: number;
  variante: VarianteCabecera;
  pasos: readonly Paso[];
}): HTMLElement {
  const { pasos } = opciones;
  const raiz = elemento("header", "cabecera");
  raiz.dataset["variante"] = opciones.variante;

  const identidad = elemento("div", "cabecera__marca");
  identidad.append(
    icono(opciones.icono, opciones.tamanoIcono),
    elemento("span", undefined, opciones.marca),
  );

  const lista = elemento("div", "pasos");
  pasos.forEach((paso, indice) => {
    if (indice > 0) {
      const conector = elemento("span", "conector");
      if (pasos[indice - 1]?.estado === "hecho") conector.dataset["hecho"] = "";
      lista.append(conector);
    }
    const nodo = elemento("div", "paso");
    nodo.dataset["estado"] = paso.estado;
    const punto = elemento("span", "paso__punto");
    if (paso.estado === "hecho") punto.append(icono("check", 14));
    else punto.textContent = String(indice + 1);
    nodo.append(punto, elemento("span", undefined, paso.etiqueta));
    lista.append(nodo);
  });

  raiz.append(identidad, lista);
  return raiz;
}

export function tarjeta(pregunta: string, pista?: string): HTMLElement {
  const raiz = elemento("section", "tarjeta");
  if (pista === undefined) {
    raiz.append(elemento("h2", "tarjeta__pregunta", pregunta));
    return raiz;
  }
  const encabezado = elemento("div", "tarjeta__encabezado");
  encabezado.append(
    elemento("h2", "tarjeta__pregunta", pregunta),
    elemento("p", "tarjeta__pista", pista),
  );
  raiz.append(encabezado);
  return raiz;
}

export function opcionRadio(etiqueta: string): HTMLButtonElement {
  const raiz = elemento("button", "opcion");
  raiz.type = "button";
  raiz.setAttribute("role", "radio");
  raiz.setAttribute("aria-checked", "false");

  const radio = elemento("span", "opcion__radio");
  radio.append(icono("check", 13));
  raiz.append(radio, elemento("span", undefined, etiqueta));
  return raiz;
}

export type Segmentado = { raiz: HTMLElement; botones: readonly HTMLButtonElement[] };

export function segmentado(etiquetas: readonly string[]): Segmentado {
  const raiz = elemento("div", "segmentado");
  raiz.setAttribute("role", "group");
  const botones = etiquetas.map((etiqueta) => {
    const boton = elemento("button", "segmento", etiqueta);
    boton.type = "button";
    boton.setAttribute("aria-pressed", "false");
    raiz.append(boton);
    return boton;
  });
  return { raiz, botones };
}

export function ficha(etiqueta: string): HTMLButtonElement {
  const raiz = elemento("button", "ficha");
  raiz.type = "button";
  raiz.setAttribute("role", "checkbox");
  raiz.setAttribute("aria-checked", "false");
  raiz.append(
    conClase(icono("plus", 15), "icono--base"),
    conClase(icono("check", 15), "icono--alterno"),
    elemento("span", undefined, etiqueta),
  );
  return raiz;
}

export function botonTexto(etiqueta: string, nombre: NombreIcono): HTMLButtonElement {
  const boton = elemento("button", "boton-texto");
  boton.type = "button";
  boton.append(icono(nombre, 16), elemento("span", undefined, etiqueta));
  return boton;
}

export function botonContinuar(etiqueta: string): HTMLButtonElement {
  const boton = elemento("button", "boton-continuar");
  boton.type = "button";
  boton.append(elemento("span", undefined, etiqueta), icono("arrow-right", 16));
  return boton;
}
