// Pantalla "1 · Login": panel de marca a la izquierda, formulario a la derecha.
// Arma el DOM una sola vez y despues solo parcha las hojas que dependen del
// estado: nunca reemplaza el campo mientras se escribe.

import {
  botonGoogle,
  botonPrimario,
  campoTexto,
  casilla,
  elemento,
  enlace,
  type CampoTexto,
} from "../ds/componentes";
import { icono } from "../ds/iconos";
import type { Pantalla } from "../rutas";
import {
  abandonar,
  alternarClaveVisible,
  alternarModo,
  alternarRecordarme,
  escribir,
  LOGIN_INICIAL,
  puedeEnviar,
  textosDe,
  type EstadoLogin,
} from "./login-estado";

const GARANTIAS: readonly string[] = [
  "Bank-level encryption on every connection",
  "No hidden fees, ever",
  "Cancel anytime — your data stays yours",
];

export function montarLogin(raiz: HTMLElement, navegar: (p: Pantalla) => void): void {
  let estado = LOGIN_INICIAL;

  const pantalla = elemento("div", "pantalla-login");
  const grid = elemento("div", "login-grid");
  grid.append(panelDeMarca(), panelDeFormulario());
  pantalla.append(grid);
  raiz.replaceChildren(pantalla);

  const correo = campoTexto({
    etiqueta: "Email",
    tipo: "email",
    placeholder: "you@example.com",
  });
  const clave = campoTexto({
    etiqueta: "Password",
    tipo: "password",
    placeholder: "Enter your password",
    conToggle: true,
  });
  const recordarme = casilla("Remember me");
  const entrar = botonPrimario("Sign in");

  const campos = elemento("div", "campos");
  campos.append(correo.raiz, clave.raiz);

  const opciones = elemento("div", "opciones");
  opciones.append(recordarme.raiz, enlace("Forgot password?"));

  const pie = elemento("div", "pie");
  const pieTexto = elemento("span", undefined, "New here?");
  const crear = enlace("Create an account");
  pie.append(pieTexto, crear);

  // El titulo y el subtitulo los arma panelDeFormulario; se buscan una sola vez
  // aca para que pintar() no consulte el DOM en cada cambio de estado.
  const titulo = pantalla.querySelector<HTMLElement>(".formulario__titulo");
  const subtitulo = pantalla.querySelector<HTMLElement>(".formulario__subtitulo");

  const formulario = pantalla.querySelector(".formulario");
  formulario?.append(
    campos,
    opciones,
    entrar,
    elemento("div", "divisor", "or"),
    botonGoogle("Continue with Google"),
    pie,
  );

  const cambiar = (siguiente: EstadoLogin): void => {
    estado = siguiente;
    pintar();
  };

  correo.entrada.addEventListener("input", () =>
    cambiar(escribir(estado, "correo", correo.entrada.value)),
  );
  correo.entrada.addEventListener("blur", () => cambiar(abandonar(estado, "correo")));
  clave.entrada.addEventListener("input", () =>
    cambiar(escribir(estado, "clave", clave.entrada.value)),
  );
  clave.entrada.addEventListener("blur", () => cambiar(abandonar(estado, "clave")));
  clave.toggle?.addEventListener("click", () => cambiar(alternarClaveVisible(estado)));
  recordarme.raiz.addEventListener("click", () => cambiar(alternarRecordarme(estado)));
  // El mismo enlace voltea en los dos sentidos: su texto lo decide el modo.
  // alternarModo se encarga de ignorarlo si hay un intento en vuelo (R5.2), asi
  // que aca no hay ninguna condicion que mantener sincronizada.
  crear.addEventListener("click", () => cambiar(alternarModo(estado)));
  entrar.addEventListener("click", () => navegar("perfil"));

  // Una sola funcion escribe TODO lo que se deriva del estado. Si algo
  // depende del estado y no esta aca, no se actualiza nunca.
  function pintar(): void {
    const textos = textosDe(estado.modo);
    if (titulo !== null) titulo.textContent = textos.titulo;
    if (subtitulo !== null) subtitulo.textContent = textos.subtitulo;
    entrar.textContent = textos.boton;
    pieTexto.textContent = textos.pieTexto;
    crear.textContent = textos.pieEnlace;

    pintarCampo(correo, estado.errores.correo);
    pintarCampo(clave, estado.errores.clave);
    clave.entrada.type = estado.claveVisible ? "text" : "password";
    if (clave.toggle !== null) {
      if (estado.claveVisible) clave.toggle.dataset["visible"] = "";
      else delete clave.toggle.dataset["visible"];
    }
    if (clave.toggleEtiqueta !== null) {
      clave.toggleEtiqueta.textContent = estado.claveVisible ? "Hide" : "Show";
    }
    recordarme.raiz.setAttribute("aria-checked", String(estado.recordarme));
    entrar.disabled = !puedeEnviar(estado);
  }

  pintar();
}

function pintarCampo(campo: CampoTexto, mensaje: string | undefined): void {
  campo.error.textContent = mensaje ?? "";
  if (mensaje === undefined) delete campo.raiz.dataset["error"];
  else campo.raiz.dataset["error"] = "";
}

function panelDeMarca(): HTMLElement {
  const raiz = elemento("aside", "panel-marca");

  const marca = elemento("div", "marca");
  marca.append(icono("compass", 28), elemento("span", "marca__nombre", "Northstar"));

  const propuesta = elemento("div", "propuesta");
  propuesta.append(
    elemento("h1", "propuesta__titulo", "Build the financial future you deserve."),
    elemento(
      "p",
      "propuesta__texto",
      "Northstar turns everyday money decisions into a clear, guided plan — so you always know your next step.",
    ),
  );

  const garantias = elemento("div", "garantias");
  for (const texto of GARANTIAS) {
    const punto = elemento("div", "garantia");
    const circulo = elemento("span", "garantia__punto");
    circulo.append(icono("check", 14));
    punto.append(circulo, elemento("span", undefined, texto));
    garantias.append(punto);
  }

  raiz.append(marca, propuesta, garantias);
  return raiz;
}

function panelDeFormulario(): HTMLElement {
  const raiz = elemento("div", "panel-formulario");
  const formulario = elemento("div", "formulario");

  const encabezado = elemento("div", "formulario__encabezado");
  encabezado.append(
    elemento("h2", "formulario__titulo", "Welcome back"),
    elemento(
      "p",
      "formulario__subtitulo",
      "Sign in to continue building your Northstar plan.",
    ),
  );

  formulario.append(encabezado);
  raiz.append(formulario);
  return raiz;
}
