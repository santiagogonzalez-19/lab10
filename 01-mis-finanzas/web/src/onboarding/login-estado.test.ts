import { describe, expect, it } from "vitest";
import {
  abandonar,
  alternarClaveVisible,
  alternarModo,
  alternarRecordarme,
  correoValido,
  escribir,
  LOGIN_INICIAL,
  puedeEntrar,
  textosDe,
} from "./login-estado";

describe("correoValido", () => {
  it("acepta un correo con dominio y punto", () => {
    expect(correoValido("sofia@correo.com")).toBe(true);
  });

  it("acepta el minimo con un caracter a cada lado del punto", () => {
    expect(correoValido("a@b.c")).toBe(true);
  });

  it("ignora los espacios de los extremos", () => {
    expect(correoValido("  sofia@correo.com  ")).toBe(true);
  });

  it("rechaza el vacio", () => {
    expect(correoValido("")).toBe(false);
  });

  it("rechaza un valor sin arroba", () => {
    expect(correoValido("sofia")).toBe(false);
  });

  it("rechaza espacios internos", () => {
    expect(correoValido("so fia@correo.com")).toBe(false);
  });

  it("rechaza un dominio sin punto", () => {
    expect(correoValido("sofia@correo")).toBe(false);
  });

  it("rechaza dos arrobas", () => {
    expect(correoValido("sofia@@correo.com")).toBe(false);
  });

  it("rechaza que no haya nada antes de la arroba", () => {
    expect(correoValido("@correo.com")).toBe(false);
  });

  it("rechaza que el punto no tenga nada a la derecha", () => {
    expect(correoValido("sofia@correo.")).toBe(false);
  });
});

describe("abandonar", () => {
  it("avisa que el correo es obligatorio cuando queda vacio", () => {
    const estado = abandonar(LOGIN_INICIAL, "correo");
    expect(estado.errores.correo).toMatch(/email/i);
  });

  it("avisa que el correo no es valido cuando esta mal escrito", () => {
    const estado = abandonar(escribir(LOGIN_INICIAL, "correo", "sofia"), "correo");
    expect(estado.errores.correo).toMatch(/valid/i);
  });

  it("no deja error cuando el correo es valido", () => {
    const estado = abandonar(escribir(LOGIN_INICIAL, "correo", "sofia@correo.com"), "correo");
    expect(estado.errores.correo).toBeUndefined();
  });

  it("avisa que la clave es obligatoria cuando queda vacia", () => {
    const estado = abandonar(LOGIN_INICIAL, "clave");
    expect(estado.errores.clave).toMatch(/password/i);
  });
});

describe("escribir", () => {
  it("borra el error del campo que se esta corrigiendo", () => {
    const conError = abandonar(LOGIN_INICIAL, "correo");
    expect(conError.errores.correo).toBeDefined();
    expect(escribir(conError, "correo", "s").errores.correo).toBeUndefined();
  });

  it("no evalua el campo mientras se escribe", () => {
    const estado = escribir(LOGIN_INICIAL, "correo", "sofia");
    expect(estado.errores.correo).toBeUndefined();
  });

  it("no toca el error del otro campo", () => {
    const conError = abandonar(LOGIN_INICIAL, "clave");
    expect(escribir(conError, "correo", "s").errores.clave).toBeDefined();
  });
});

describe("puedeEntrar", () => {
  it("arranca deshabilitado y sin errores visibles", () => {
    expect(puedeEntrar(LOGIN_INICIAL)).toBe(false);
    expect(LOGIN_INICIAL.errores).toEqual({});
  });

  it("no alcanza con el correo si la clave esta vacia", () => {
    const estado = escribir(LOGIN_INICIAL, "correo", "sofia@correo.com");
    expect(puedeEntrar(estado)).toBe(false);
  });

  it("no alcanza con la clave si el correo es invalido", () => {
    const estado = escribir(escribir(LOGIN_INICIAL, "correo", "sofia"), "clave", "secreta");
    expect(puedeEntrar(estado)).toBe(false);
  });

  it("habilita con correo valido y clave con contenido", () => {
    const estado = escribir(escribir(LOGIN_INICIAL, "correo", "sofia@correo.com"), "clave", "secreta");
    expect(puedeEntrar(estado)).toBe(true);
  });

  it("un espacio es un caracter de contrasena valido", () => {
    const estado = escribir(escribir(LOGIN_INICIAL, "correo", "sofia@correo.com"), "clave", " ");
    expect(puedeEntrar(estado)).toBe(true);
  });
});

describe("alternar", () => {
  it("la visibilidad de la clave vuelve a su valor tras dos cambios", () => {
    const una = alternarClaveVisible(LOGIN_INICIAL);
    expect(una.claveVisible).toBe(!LOGIN_INICIAL.claveVisible);
    expect(alternarClaveVisible(una).claveVisible).toBe(LOGIN_INICIAL.claveVisible);
  });

  it("alternar la visibilidad no altera el valor de la clave", () => {
    const conClave = escribir(LOGIN_INICIAL, "clave", "secreta");
    expect(alternarClaveVisible(conClave).clave).toBe("secreta");
  });

  it("recordarme cambia solo su propia marca", () => {
    const estado = alternarRecordarme(LOGIN_INICIAL);
    expect(estado.recordarme).toBe(!LOGIN_INICIAL.recordarme);
    expect(estado.correo).toBe(LOGIN_INICIAL.correo);
    expect(estado.clave).toBe(LOGIN_INICIAL.clave);
  });
});

describe("modo del panel", () => {
  it("CP18 · el acceso arranca en modo entrar, sin envio y sin mensaje", () => {
    expect(LOGIN_INICIAL.modo).toBe("entrar");
    expect(LOGIN_INICIAL.enviando).toBe(false);
    expect(LOGIN_INICIAL.mensaje).toBeUndefined();
  });

  it("CP19 · alternar desde entrar deja el panel en registrar", () => {
    expect(alternarModo(LOGIN_INICIAL).modo).toBe("registrar");
  });

  it("CP20 · alternar desde registrar vuelve a entrar", () => {
    expect(alternarModo(alternarModo(LOGIN_INICIAL)).modo).toBe("entrar");
  });

  it("CP21 · cambiar de modo conserva el correo y la clave escritos", () => {
    // Es el sentido de que el registro sea un modo y no otra pantalla: quien
    // fallo al entrar y decide crearse la cuenta no deberia retipear nada.
    const escrito = escribir(
      escribir(LOGIN_INICIAL, "correo", "sofia@correo.com"),
      "clave",
      "secreta",
    );
    const otro = alternarModo(escrito);
    expect(otro.correo).toBe("sofia@correo.com");
    expect(otro.clave).toBe("secreta");
  });

  it("CP22 · cambiar de modo retira los errores de campo y el mensaje", () => {
    const conError = abandonar(escribir(LOGIN_INICIAL, "correo", "no-es-correo"), "correo");
    expect(conError.errores.correo).toBeDefined();

    const otro = alternarModo({ ...conError, mensaje: "un fallo viejo del servidor" });
    expect(otro.errores).toEqual({});
    expect(otro.mensaje).toBeUndefined();
  });

  it("CP24 · los textos de entrar son los de design.md §4", () => {
    expect(textosDe("entrar")).toEqual({
      titulo: "Welcome back",
      subtitulo: "Sign in to continue building your Northstar plan.",
      boton: "Sign in",
      pieTexto: "New here?",
      pieEnlace: "Create an account",
    });
  });

  it("CP24 · los textos de registrar son los de design.md §4", () => {
    expect(textosDe("registrar")).toEqual({
      titulo: "Create your account",
      subtitulo: "Start building your Northstar plan in a minute.",
      boton: "Create account",
      pieTexto: "Already have an account?",
      pieEnlace: "Sign in",
    });
  });
});
