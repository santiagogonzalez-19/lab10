// Pantalla "4 · Plan": presentacion del plan que Northstar propone. No tiene
// estado: todas las cifras son las del mockup, porque se derivarian de los
// archivos y del perfil, y aqui no hay nada que los procese.

import { botonTexto, cabeceraDePasos, elemento, type Paso } from "../ds/componentes";
import { icono } from "../ds/iconos";
import type { Pantalla } from "../rutas";

const PASOS: readonly Paso[] = [
  { etiqueta: "Account", estado: "hecho" },
  { etiqueta: "Profile", estado: "hecho" },
  { etiqueta: "Know Me", estado: "hecho" },
  { etiqueta: "Plan", estado: "actual" },
];

type Franja = "needs" | "wants" | "savings";

// Alturas en pixeles sobre una barra de 300, tal como las fija el mockup.
const MESES: readonly { mes: string; savings: number; wants: number; needs: number }[] = [
  { mes: "Jan", savings: 42, wants: 93, needs: 165 },
  { mes: "Feb", savings: 45, wants: 90, needs: 165 },
  { mes: "Mar", savings: 48, wants: 87, needs: 165 },
  { mes: "Apr", savings: 51, wants: 84, needs: 165 },
  { mes: "May", savings: 54, wants: 81, needs: 165 },
  { mes: "Jun", savings: 57, wants: 78, needs: 165 },
  { mes: "Jul", savings: 60, wants: 75, needs: 165 },
  { mes: "Aug", savings: 60, wants: 75, needs: 165 },
  { mes: "Sep", savings: 63, wants: 72, needs: 165 },
  { mes: "Oct", savings: 63, wants: 72, needs: 165 },
  { mes: "Nov", savings: 66, wants: 69, needs: 165 },
  { mes: "Dec", savings: 66, wants: 69, needs: 165 },
];

const LEYENDA: readonly { franja: Franja; etiqueta: string }[] = [
  { franja: "needs", etiqueta: "Needs" },
  { franja: "wants", etiqueta: "Wants" },
  { franja: "savings", etiqueta: "Savings" },
];

// Los anchos del mockup (182 / 102 / 48 sobre 332) se reparten con flex-grow.
const ASIGNACION: readonly {
  franja: Franja;
  nombre: string;
  monto: string;
  pct: string;
  parte: number;
}[] = [
  { franja: "needs", nombre: "Needs", monto: "$1,650", pct: "55%", parte: 182 },
  { franja: "wants", nombre: "Wants", monto: "$930", pct: "31%", parte: 102 },
  { franja: "savings", nombre: "Savings", monto: "$420", pct: "14%", parte: 48 },
];

const CONSEJOS: readonly string[] = [
  "Automate a $420 transfer to savings each payday.",
  "Trim discretionary spending by ~$180 vs. last quarter.",
  "We recheck your plan every 6 months and adjust.",
];

export function montarPlan(raiz: HTMLElement, navegar: (p: Pantalla) => void): void {
  const pantalla = elemento("div", "pantalla-plan");
  const cuerpo = elemento("div", "cuerpo");
  pantalla.append(
    cabeceraDePasos({
      marca: "Northstar",
      icono: "compass",
      tamanoIcono: 24,
      variante: "plan",
      pasos: PASOS,
    }),
    cuerpo,
  );

  const titular = elemento("div", "titular titular--plan");
  titular.append(
    elemento("h1", "titular__titulo", "Your personalized plan"),
    elemento(
      "p",
      "titular__subtitulo",
      "Here is how to allocate your income each month so you reach your goal on schedule.",
    ),
  );

  cuerpo.append(titular, heroe(), grid(), pie(navegar));
  raiz.replaceChildren(pantalla);
}

function heroe(): HTMLElement {
  const raiz = elemento("section", "heroe");

  const info = elemento("div", "heroe__info");
  info.append(
    elemento("p", "heroe__cejilla", "YOUR GOAL"),
    elemento("h2", "heroe__nombre", "Build an emergency fund"),
    elemento("p", "heroe__meta", "Target $15,000  ·  by December 2027"),
  );

  const cifras = elemento("div", "heroe__cifras");
  for (const [valor, etiqueta] of [
    ["$420", "Monthly target"],
    ["30", "Months to goal"],
  ]) {
    const cifra = elemento("div", "cifra");
    cifra.append(
      elemento("span", "cifra__valor", valor),
      elemento("span", "cifra__etiqueta", etiqueta),
    );
    cifras.append(cifra);
  }
  const pildora = elemento("span", "pildora-estado");
  pildora.append(icono("trending-up", 15), elemento("span", undefined, "On track"));
  cifras.append(pildora);

  raiz.append(info, cifras);
  return raiz;
}

function grid(): HTMLElement {
  const raiz = elemento("div", "grid-plan");

  // --- Grafico de barras apiladas ---
  const grafico = elemento("section", "bloque bloque--grafico");
  const encabezado = elemento("div", "grafico__encabezado");
  const titulos = elemento("div", "grafico__titulos");
  titulos.append(
    elemento("h2", "grafico__titulo", "Month-over-month spending plan"),
    elemento(
      "p",
      "grafico__sub",
      "As your goal nears, savings rise while discretionary spending eases.",
    ),
  );
  const leyenda = elemento("div", "leyenda");
  for (const item of LEYENDA) {
    const fila = elemento("div", "leyenda__item");
    fila.append(
      elemento("span", `muestra muestra--${item.franja}`),
      elemento("span", undefined, item.etiqueta),
    );
    leyenda.append(fila);
  }
  encabezado.append(titulos, leyenda);

  const area = elemento("div", "grafico__area");
  const barras = elemento("div", "grafico__barras");
  const meses = elemento("div", "grafico__meses");
  for (const dato of MESES) {
    const barra = elemento("div", "grafico__barra");
    barra.setAttribute("role", "img");
    barra.setAttribute(
      "aria-label",
      `${dato.mes}: savings ${dato.savings}, wants ${dato.wants}, needs ${dato.needs}`,
    );
    for (const franja of ["savings", "wants", "needs"] as const) {
      const segmento = elemento("span", `segmento-barra segmento-barra--${franja}`);
      segmento.style.height = `${dato[franja]}px`;
      barra.append(segmento);
    }
    barras.append(barra);
    meses.append(elemento("span", "grafico__mes", dato.mes));
  }
  area.append(barras, meses);
  grafico.append(encabezado, area);

  // --- Asignacion del mes y consejos ---
  const lado = elemento("div", "lado");

  const asignacion = elemento("section", "bloque bloque--asignacion");
  const asigEnc = elemento("div", "asignacion__encabezado");
  asigEnc.append(
    elemento("h2", "asignacion__titulo", "This month's allocation"),
    elemento("p", "asignacion__sub", "Based on $3,000 monthly income"),
  );
  const barra = elemento("div", "asignacion__barra");
  for (const parte of ASIGNACION) {
    const segmento = elemento("span", `segmento-barra--${parte.franja}`);
    segmento.style.flex = `${parte.parte} 0 0`;
    barra.append(segmento);
  }
  const lista = elemento("div", "asignacion__lista");
  for (const parte of ASIGNACION) {
    const fila = elemento("div", "asignacion__fila");
    const nombre = elemento("div", "asignacion__nombre");
    nombre.append(
      elemento("span", `muestra muestra--${parte.franja}`),
      elemento("span", undefined, parte.nombre),
    );
    fila.append(
      nombre,
      elemento("span", "asignacion__monto", parte.monto),
      elemento("span", "asignacion__pct", parte.pct),
    );
    lista.append(fila);
  }
  asignacion.append(asigEnc, barra, lista);

  const consejos = elemento("section", "consejos");
  consejos.append(elemento("h2", "consejos__titulo", "How to stay on track"));
  for (const texto of CONSEJOS) {
    const consejo = elemento("div", "consejo");
    consejo.append(icono("circle-check", 18), elemento("span", undefined, texto));
    consejos.append(consejo);
  }

  lado.append(asignacion, consejos);
  raiz.append(grafico, lado);
  return raiz;
}

function pie(navegar: (p: Pantalla) => void): HTMLElement {
  const raiz = elemento("div", "acciones");

  const atras = botonTexto("Back", "arrow-left");
  atras.addEventListener("click", () => navegar("conoceme"));

  // El panel al que llevaria este boton esta fuera del onboarding y no existe.
  const terminar = elemento("button", "boton-final");
  terminar.type = "button";
  terminar.append(
    elemento("span", undefined, "Finish & go to dashboard"),
    icono("arrow-right", 17),
  );

  raiz.append(atras, terminar);
  return raiz;
}
