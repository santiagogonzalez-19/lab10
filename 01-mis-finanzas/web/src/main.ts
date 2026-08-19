// Conecta los eventos de la pantalla con la API y la vista.

import {
  copiarLimites,
  fijarLimites,
  registrarGasto,
  verMes,
  type EntradaGasto,
  type VistaMes,
} from "./api";
import {
  dibujarAvisoDeGasto,
  dibujarEditor,
  dibujarError,
  dibujarErrorDeEditor,
  dibujarErrorDeGasto,
  dibujarFormularioGasto,
  dibujarMes,
} from "./vista";

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
    alEditar: () => abrirEditor(mes, resultado.valor),
  });
  if (resultado.valor.categorias.length > 0) {
    dibujarFormularioGasto(
      raiz,
      resultado.valor.categorias.map((c) => c.categoria),
      { alRegistrar: (entrada) => void registrar(mes, entrada) },
    );
  }
}

async function registrar(mesEnPantalla: string, entrada: EntradaGasto): Promise<void> {
  const resultado = await registrarGasto(entrada);
  if (!resultado.ok) {
    // «Defínelo primero»: el 400 de R3.3 enlaza a la pantalla de límites (T23)
    // del MES DE LA FECHA del gasto, que es donde falta el límite.
    const mesDeLaFecha = entrada.fecha.slice(0, 7);
    dibujarErrorDeGasto(raiz, resultado.error, () => void editarLimitesDe(mesDeLaFecha));
    return;
  }
  await cargarMes(mesEnPantalla); // las barras se actualizan
  dibujarAvisoDeGasto(raiz, resultado.valor.consumo); // el aviso, de la respuesta del POST
}

async function editarLimitesDe(mes: string): Promise<void> {
  const resultado = await verMes(mes);
  if (!resultado.ok) {
    raiz.replaceChildren();
    dibujarError(raiz, resultado.error);
    return;
  }
  if (selector) selector.value = mes;
  abrirEditor(mes, resultado.valor);
}

function abrirEditor(mes: string, vista: VistaMes): void {
  // El editor parte de los límites actuales: la vista del mes ya los trae.
  const actuales = vista.categorias.map((c) => ({ nombre: c.categoria, limite: c.limite }));
  dibujarEditor(raiz, mes, actuales, {
    alGuardar: (categorias) => void guardarLimites(mes, categorias),
    alCancelar: () => void cargarMes(mes),
  });
}

async function guardarLimites(
  mes: string,
  categorias: { nombre: string; limite: number }[],
): Promise<void> {
  const resultado = await fijarLimites(mes, categorias);
  if (!resultado.ok) {
    // 400: se corrige el formulario, que queda en pantalla con el mensaje.
    // 409: el conflicto es con los gastos guardados; se ofrece revisarlos.
    dibujarErrorDeEditor(raiz, resultado.error, () => void cargarMes(mes));
    return;
  }
  await cargarMes(mes);
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
