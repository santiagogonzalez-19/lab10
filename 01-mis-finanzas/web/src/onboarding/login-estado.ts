// Todo lo que el formulario de acceso DECIDE: que es un correo valido, que
// mensaje corresponde y cuando se habilita el boton. Sin DOM: es lo que se
// prueba, y por eso vive separado de login.ts, que solo pinta.

export type CampoLogin = "correo" | "clave";

export type EstadoLogin = {
  readonly correo: string;
  readonly clave: string;
  readonly claveVisible: boolean;
  readonly recordarme: boolean;
  readonly errores: Readonly<Partial<Record<CampoLogin, string>>>;
};

export const LOGIN_INICIAL: EstadoLogin = {
  correo: "",
  clave: "",
  claveVisible: false,
  // Sin marcar, como en el mockup; no tiene efecto porque no hay sesion.
  recordarme: false,
  errores: {},
};

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
