// Conecta los eventos de la pantalla con la API y la vista.

import { copiarLimites, verMes } from "./api";
import { dibujarError, dibujarMes } from "./vista";

const selector = document.querySelector<HTMLInputElement>("#selector-mes");
const contenido = document.querySelector<HTMLElement>("#contenido");
if (!selector || !contenido) throw new Error("Falta el andamiaje del index.html");
const raiz = contenido;

function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

async function cargarMes(mes: string): Promise<void> {
  const resultado = await verMes(mes);
  if (!resultado.ok) {
    raiz.replaceChildren();
    dibujarError(raiz, resultado.error);
    return;
  }
  dibujarMes(raiz, resultado.valor, {
    alCopiar: (origen) => void copiar(mes, origen),
  });
}

async function copiar(destino: string, origen: string): Promise<void> {
  const resultado = await copiarLimites(destino, origen);
  if (!resultado.ok) {
    // El 409 llega con su mensaje ("... ya tiene límites definidos" /
    // "... no tiene presupuesto que copiar"): se muestra tal cual.
    dibujarError(raiz, resultado.error);
    return;
  }
  await cargarMes(destino);
}

selector.value = mesActual();
selector.addEventListener("change", () => {
  if (selector.value) void cargarMes(selector.value);
});
void cargarMes(selector.value);
