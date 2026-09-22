// Todo lo que el formulario de acceso DECIDE: que es un correo valido, que
// mensaje corresponde y cuando se habilita el boton. Sin DOM: es lo que se
// prueba, y por eso vive separado de login.ts, que solo pinta.

import type { ModoAuth } from "../auth/autenticar";

export type CampoLogin = "correo" | "clave";

// El modo del panel y el de la peticion son el mismo concepto, asi que son el
// mismo tipo (design.md §4). Si algun dia divergen, que sea una decision y no
// el descuido de dos uniones copiadas.
export type ModoLogin = ModoAuth;

export type EstadoLogin = {
  readonly modo: ModoLogin;
  readonly correo: string;
  readonly clave: string;
  readonly claveVisible: boolean;
  readonly recordarme: boolean;
  // Hay un intento en vuelo. Aca solo existe; quien lo enciende es T5.
  readonly enviando: boolean;
  // El unico fallo del servidor visible, sin dueño entre los campos.
  readonly mensaje: string | undefined;
  readonly errores: Readonly<Partial<Record<CampoLogin, string>>>;
};

export const LOGIN_INICIAL: EstadoLogin = {
  // Siempre se entra por "entrar", aunque la visita anterior haya terminado en
  // "registrar": cada pantalla se monta de cero y no hay donde recordarlo.
  modo: "entrar",
  correo: "",
  clave: "",
  claveVisible: false,
  // Sin marcar, como en el mockup; no tiene efecto porque no hay sesion.
  recordarme: false,
  enviando: false,
  mensaje: undefined,
  errores: {},
};

export type TextosLogin = {
  readonly titulo: string;
  readonly subtitulo: string;
  readonly boton: string;
  readonly pieTexto: string;
  readonly pieEnlace: string;
};

// Todo lo que cambia entre los dos modos, junto y sin DOM: asi el panel no
// termina con condicionales repartidos y la diferencia se prueba sin montar
// nada. El subtitulo es el unico de los cinco que ningun criterio fija.
const TEXTOS: Readonly<Record<ModoLogin, TextosLogin>> = {
  entrar: {
    titulo: "Welcome back",
    subtitulo: "Sign in to continue building your Northstar plan.",
    boton: "Sign in",
    pieTexto: "New here?",
    pieEnlace: "Create an account",
  },
  registrar: {
    titulo: "Create your account",
    subtitulo: "Start building your Northstar plan in a minute.",
    boton: "Create account",
    pieTexto: "Already have an account?",
    pieEnlace: "Sign in",
  },
};

export function textosDe(modo: ModoLogin): TextosLogin {
  return TEXTOS[modo];
}

// Voltea el panel conservando lo tecleado: quien fallo al entrar y decide
// registrarse no tiene por que volver a escribir su correo. Lo que si se va
// son los mensajes, porque hablaban del otro modo.
export function alternarModo(estado: EstadoLogin): EstadoLogin {
  return {
    ...estado,
    modo: estado.modo === "entrar" ? "registrar" : "entrar",
    mensaje: undefined,
    errores: {},
  };
}

const MENSAJES = {
  correoVacio: "Enter your email.",
  correoInvalido: "That email doesn't look valid.",
  claveVacia: "Enter your password.",
} as const;

// Sin espacios, una sola arroba, algo antes, y despues un punto con al menos
// un caracter a cada lado. No se comprueba contra ningun servidor.
export function correoValido(valor: string): boolean {
  const limpio = valor.trim();
  if (limpio === "" || /\s/.test(limpio)) return false;
  const partes = limpio.split("@");
  if (partes.length !== 2) return false;
  const [usuario, dominio] = partes;
  if (usuario === undefined || dominio === undefined) return false;
  if (usuario === "") return false;
  return /^[^.]+(\.[^.]+)+$/.test(dominio);
}

// La clave solo tiene que existir: un espacio es un caracter valido, asi que
// aqui no se recorta nada.
function claveValida(valor: string): boolean {
  return valor !== "";
}

function sinError(
  errores: EstadoLogin["errores"],
  campo: CampoLogin,
): EstadoLogin["errores"] {
  const { [campo]: _, ...resto } = errores;
  return resto;
}

// Escribir NO evalua el campo: solo retira el mensaje que estuviera visible,
// para no gritarle a alguien que esta a mitad de corregir.
export function escribir(
  estado: EstadoLogin,
  campo: CampoLogin,
  valor: string,
): EstadoLogin {
  return {
    ...estado,
    [campo]: valor,
    errores: sinError(estado.errores, campo),
  };
}

// Al salir del campo si se evalua, y es el unico momento en que aparece un error.
export function abandonar(estado: EstadoLogin, campo: CampoLogin): EstadoLogin {
  const mensaje = mensajeDe(estado, campo);
  if (mensaje === undefined) {
    return { ...estado, errores: sinError(estado.errores, campo) };
  }
  return { ...estado, errores: { ...estado.errores, [campo]: mensaje } };
}

function mensajeDe(estado: EstadoLogin, campo: CampoLogin): string | undefined {
  if (campo === "clave") {
    return claveValida(estado.clave) ? undefined : MENSAJES.claveVacia;
  }
  if (estado.correo.trim() === "") return MENSAJES.correoVacio;
  return correoValido(estado.correo) ? undefined : MENSAJES.correoInvalido;
}

export function alternarClaveVisible(estado: EstadoLogin): EstadoLogin {
  return { ...estado, claveVisible: !estado.claveVisible };
}

export function alternarRecordarme(estado: EstadoLogin): EstadoLogin {
  return { ...estado, recordarme: !estado.recordarme };
}

// El boton depende de la validez, no de si ya se mostro un error: con los
// campos vacios arranca deshabilitado y sin ningun mensaje en pantalla.
export function puedeEntrar(estado: EstadoLogin): boolean {
  return correoValido(estado.correo) && claveValida(estado.clave);
}
