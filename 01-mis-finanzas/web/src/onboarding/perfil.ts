// Pantalla "2 · Financial Profile": cabecera con los cuatro pasos y una
// columna de 760 con tres tarjetas de pregunta.

import {
  botonContinuar,
  botonTexto,
  cabeceraDePasos,
  elemento,
  ficha,
  opcionRadio,
  segmentado,
  tarjeta,
  type Paso,
} from "../ds/componentes";
import type { Pantalla } from "../rutas";
import { INGRESOS, METAS, RIESGOS } from "./catalogos";
import {
  alternarIngreso,
  descriptorDeRiesgo,
  elegirMeta,
  elegirRiesgo,
  PERFIL_INICIAL,
  puedeContinuar,
  type EstadoPerfil,
} from "./perfil-estado";

const PASOS: readonly Paso[] = [
  { etiqueta: "Account", estado: "hecho" },
  { etiqueta: "Profile", estado: "actual" },
  { etiqueta: "Know Me", estado: "pendiente" },
  { etiqueta: "Plan", estado: "pendiente" },
];

export function montarPerfil(raiz: HTMLElement, navegar: (p: Pantalla) => void): void {
  let estado = PERFIL_INICIAL;

  const pantalla = elemento("div", "pantalla-perfil");
  const contenido = elemento("main", "contenido");
  const columna = elemento("div", "columna");
  contenido.append(columna);
  pantalla.append(
    cabeceraDePasos({
      marca: "Northstar",
      icono: "star",
      tamanoIcono: 20,
      variante: "perfil",
      pasos: PASOS,
    }),
    contenido,
  );

  const titular = elemento("div", "titular");
  titular.append(
    elemento("h1", "titular__titulo", "Tell us about your finances"),
    elemento(
      "p",
      "titular__subtitulo",
      "A few quick questions help us tailor your plan and recommendations to what matters most to you.",
    ),
  );
  columna.append(titular);

  const q1 = tarjeta(
    "What is your primary financial goal?",
    "Choose the one that best describes your focus right now.",
  );
  const lista = elemento("div", "opcion-lista");
  lista.setAttribute("role", "radiogroup");
  const opciones = METAS.map((meta) => {
    const opcion = opcionRadio(meta.etiqueta);
    lista.append(opcion);
    return opcion;
  });
  q1.append(lista);

  const q2 = tarjeta("What is your risk tolerance?");
  const niveles = segmentado(RIESGOS.map((riesgo) => riesgo.etiqueta));
  const descriptor = elemento("p", "descriptor");
  q2.append(niveles.raiz, descriptor);

  const q3 = tarjeta("What are your main income sources?", "Select all that apply.");
  // Dos filas de tres, como el mockup.
  const fichas = elemento("div", "fichas");
  const filas = [elemento("div", "fichas__fila"), elemento("div", "fichas__fila")];
  const chips = INGRESOS.map((fuente, indice) => {
    const chip = ficha(fuente.etiqueta);
    filas[Math.floor(indice / 3)]?.append(chip);
    return chip;
  });
  fichas.append(...filas);
  q3.append(fichas);

  const acciones = elemento("div", "acciones");
  const atras = botonTexto("Back", "arrow-left");
  const continuar = botonContinuar("Continue");
  acciones.append(atras, continuar);

  columna.append(q1, q2, q3, acciones);
  raiz.replaceChildren(pantalla);

  const cambiar = (siguiente: EstadoPerfil): void => {
    estado = siguiente;
    pintar();
  };

  atras.addEventListener("click", () => navegar("login"));
  opciones.forEach((opcion, indice) => {
    const meta = METAS[indice];
    if (meta === undefined) return;
    opcion.addEventListener("click", () => cambiar(elegirMeta(estado, meta.id)));
  });
  niveles.botones.forEach((boton, indice) => {
    const riesgo = RIESGOS[indice];
    if (riesgo === undefined) return;
    boton.addEventListener("click", () => cambiar(elegirRiesgo(estado, riesgo.id)));
  });
  chips.forEach((chip, indice) => {
    const fuente = INGRESOS[indice];
    if (fuente === undefined) return;
    chip.addEventListener("click", () => cambiar(alternarIngreso(estado, fuente.id)));
  });
  continuar.addEventListener("click", () => navegar("conoceme"));

  function pintar(): void {
    opciones.forEach((opcion, indice) => {
      opcion.setAttribute("aria-checked", String(METAS[indice]?.id === estado.meta));
    });
    niveles.botones.forEach((boton, indice) => {
      boton.setAttribute("aria-pressed", String(RIESGOS[indice]?.id === estado.riesgo));
    });
    descriptor.textContent = descriptorDeRiesgo(estado);
    chips.forEach((chip, indice) => {
      const fuente = INGRESOS[indice];
      const marcada = fuente !== undefined && estado.ingresos.includes(fuente.id);
      chip.setAttribute("aria-checked", String(marcada));
    });
    continuar.disabled = !puedeContinuar(estado);
  }

  pintar();
}
