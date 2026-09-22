import { describe, expect, it } from "vitest";
import { codigoDeRespuesta, mensajeDe, type CodigoAuth } from "./errores";

// GoTrue cambio la forma del cuerpo de error entre versiones del CLI, asi que
// el mapeo tiene que reconocer las tres y no solo la que este corriendo hoy
// (R4.7). Si solo leyera la actual, una actualizacion del CLI degradaria todo
// a "desconocido" en silencio, que es exactamente lo que D6 existe para evitar.

describe("codigoDeRespuesta", () => {
  // --- La forma que devuelve el servidor local de verdad -------------------
  // Sondeada contra GoTrue v2.196.0 en T1. Notar que `code` es el NUMERO del
  // status, no el slug: el slug vive en `error_code`.

  it("CP2 · lee error_code cuando code trae el numero del status", () => {
    expect(
      codigoDeRespuesta(400, {
        code: 400,
        error_code: "invalid_credentials",
        msg: "Invalid login credentials",
      }),
    ).toBe("invalid_credentials");
  });

  it("CP4 · reconoce el registro duplicado en la forma real del servidor", () => {
    expect(
      codigoDeRespuesta(422, {
        code: 422,
        error_code: "user_already_exists",
        msg: "User already registered",
      }),
    ).toBe("user_already_exists");
  });

  it("CP6 · reconoce la clave debil en la forma real del servidor", () => {
    expect(
      codigoDeRespuesta(422, {
        code: 422,
        error_code: "weak_password",
        msg: "Password should be at least 6 characters.",
        weak_password: { reasons: ["length"] },
      }),
    ).toBe("weak_password");
  });

  // --- La forma de las versiones que ponen el slug en `code` ---------------

  it("CP1 · lee code cuando trae el slug", () => {
    expect(codigoDeRespuesta(400, { code: "invalid_credentials" })).toBe(
      "invalid_credentials",
    );
  });

  it("CP4 · lee code con el slug del correo ya registrado", () => {
    expect(codigoDeRespuesta(422, { code: "user_already_exists" })).toBe(
      "user_already_exists",
    );
  });

  it("CP6 · lee code con el slug de la clave debil", () => {
    expect(codigoDeRespuesta(422, { code: "weak_password" })).toBe("weak_password");
  });

  // --- La forma OAuth antigua de /token ------------------------------------

  it("CP3 · traduce invalid_grant de la respuesta OAuth vieja", () => {
    expect(
      codigoDeRespuesta(400, {
        error: "invalid_grant",
        error_description: "Invalid login credentials",
      }),
    ).toBe("invalid_credentials");
  });

  // --- Sin codigo: heuristica sobre el texto, ultimo recurso antes de caer --

  it("CP5 · deduce el correo ya registrado del texto cuando no hay codigo", () => {
    expect(codigoDeRespuesta(422, { msg: "User already registered" })).toBe(
      "user_already_exists",
    );
  });

  it("CP7 · deduce la clave debil del texto cuando no hay codigo", () => {
    expect(
      codigoDeRespuesta(422, { message: "Password should be at least 6 characters" }),
    ).toBe("weak_password");
  });

  // --- Todo lo demas cae en desconocido, nunca en undefined (BR5) ----------

  it("CP8 · el limite de tasa no tiene mensaje propio y cae en desconocido", () => {
    expect(
      codigoDeRespuesta(429, { code: 429, error_code: "over_request_rate_limit" }),
    ).toBe("desconocido");
  });

  it("CP9 · un cuerpo nulo cae en desconocido", () => {
    expect(codigoDeRespuesta(500, null)).toBe("desconocido");
  });

  it("CP9 · un cuerpo que no es objeto cae en desconocido", () => {
    expect(codigoDeRespuesta(500, "<html>502 Bad Gateway</html>")).toBe("desconocido");
  });

  it("CP9 · un objeto sin ninguna clave conocida cae en desconocido", () => {
    expect(codigoDeRespuesta(500, { cualquier: "cosa" })).toBe("desconocido");
  });

  it("CP9 · un correo con formato invalido cae en desconocido", () => {
    // validation_failed no esta en el mapa: correoValido lo ataja antes de
    // llegar al servidor, asi que no merece mensaje propio.
    expect(
      codigoDeRespuesta(400, {
        code: 400,
        error_code: "validation_failed",
        msg: "Unable to validate email address: invalid format",
      }),
    ).toBe("desconocido");
  });
});

describe("mensajeDe", () => {
  // CP10 — los seis textos de design.md §6, caracter a caracter. Se escriben
  // literales y no derivados de una constante: si alguien edita el mensaje del
  // codigo, este test tiene que romperse, no acompañarlo.
  const ESPERADOS: ReadonlyArray<readonly [CodigoAuth, string]> = [
    ["invalid_credentials", "That email and password don't match an account."],
    ["user_already_exists", "That email already has an account. Sign in instead."],
    ["weak_password", "Use at least 6 characters."],
    ["sin-red", "Can't reach the server. Is Supabase running?"],
    ["sin-configurar", "Auth isn't configured — see .env.example."],
    ["desconocido", "Something went wrong. Try again."],
  ];

  for (const [codigo, texto] of ESPERADOS) {
    it(`CP10 · ${codigo}`, () => {
      expect(mensajeDe(codigo)).toBe(texto);
    });
  }

  it("CP10 · todo codigo tiene mensaje: ninguno devuelve vacio (BR5)", () => {
    for (const [codigo] of ESPERADOS) {
      expect(mensajeDe(codigo).length).toBeGreaterThan(0);
    }
  });
});
