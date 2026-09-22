import { describe, expect, it } from "vitest";
import { autenticar } from "./autenticar";
import type { Configuracion } from "./configuracion";

// Ninguna prueba de este archivo abre una conexion (NF2). El `fetch` entra por
// parametro (design.md D4), asi que no hace falta parchear nada global ni
// sumar una libreria de dobles: el doble ES el parametro.

const CONFIG: Configuracion = { url: "http://127.0.0.1:54321", llave: "llave-de-prueba" };

type Llamada = { readonly url: string; readonly init: RequestInit | undefined };

function espia(responder: () => Promise<Response>) {
  const llamadas: Llamada[] = [];
  const peticion = (entrada: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    llamadas.push({ url: String(entrada), init });
    return responder();
  };
  return { peticion: peticion as typeof fetch, llamadas };
}

const responde = (estado: number, cuerpo: unknown) => () =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }));

const explota = () => () => Promise.reject(new TypeError("Failed to fetch"));

// La sesion completa que GoTrue devuelve al aceptar. Se usa entera a proposito:
// CP14 tiene que demostrar que NADA de esto sobrevive a la llamada (BR1).
const SESION = {
  access_token: "eyJhbGciOiJFUzI1NiJ9.token",
  refresh_token: "hrl4z7l2rl5h",
  expires_in: 3600,
  user: { id: "f9b18af4", email: "sofia@correo.com" },
};

function cuerpoDe(llamada: Llamada): Record<string, unknown> {
  return JSON.parse(String(llamada.init?.body)) as Record<string, unknown>;
}

describe("autenticar", () => {
  it("CP11 · entrar golpea el endpoint de token con apikey y JSON", async () => {
    const { peticion, llamadas } = espia(responde(200, SESION));

    await autenticar("entrar", { correo: "sofia@correo.com", clave: "supersecret123" }, {
      peticion,
      config: CONFIG,
    });

    expect(llamadas.length).toBe(1);
    const [llamada] = llamadas;
    expect(llamada?.url).toBe("http://127.0.0.1:54321/auth/v1/token?grant_type=password");
    expect(llamada?.init?.method).toBe("POST");
    const cabeceras = llamada?.init?.headers as Record<string, string>;
    expect(cabeceras["apikey"]).toBe("llave-de-prueba");
    expect(cabeceras["Content-Type"]).toBe("application/json");
  });

  it("CP12 · registrar golpea el endpoint de signup con las mismas cabeceras", async () => {
    const { peticion, llamadas } = espia(responde(200, SESION));

    await autenticar("registrar", { correo: "sofia@correo.com", clave: "supersecret123" }, {
      peticion,
      config: CONFIG,
    });

    const [llamada] = llamadas;
    expect(llamada?.url).toBe("http://127.0.0.1:54321/auth/v1/signup");
    expect(llamada?.init?.method).toBe("POST");
    const cabeceras = llamada?.init?.headers as Record<string, string>;
    expect(cabeceras["apikey"]).toBe("llave-de-prueba");
  });

  it("CP13 · recorta el correo y deja la clave tal cual", async () => {
    const { peticion, llamadas } = espia(responde(200, SESION));

    await autenticar("entrar", { correo: "  sofia@correo.com  ", clave: " con espacios " }, {
      peticion,
      config: CONFIG,
    });

    const [llamada] = llamadas;
    expect(llamada && cuerpoDe(llamada)).toEqual({
      email: "sofia@correo.com",
      password: " con espacios ",
    });
  });

  it("CP14 · el exito no transporta la sesion: solo `ok`", async () => {
    const { peticion } = espia(responde(200, SESION));

    const resultado = await autenticar(
      "entrar",
      { correo: "sofia@correo.com", clave: "supersecret123" },
      { peticion, config: CONFIG },
    );

    expect(resultado).toEqual({ ok: true });
    // No basta con `toEqual`: lo que BR1 pide es que no haya DONDE poner el
    // token, asi que se comprueba la forma exacta del objeto.
    expect(Object.keys(resultado)).toEqual(["ok"]);
  });

  it("CP15 · un 400 con invalid_credentials vuelve como ese codigo", async () => {
    const { peticion } = espia(
      responde(400, {
        code: 400,
        error_code: "invalid_credentials",
        msg: "Invalid login credentials",
      }),
    );

    const resultado = await autenticar(
      "entrar",
      { correo: "sofia@correo.com", clave: "malamala" },
      { peticion, config: CONFIG },
    );

    expect(resultado).toEqual({ ok: false, codigo: "invalid_credentials" });
  });

  it("CP15 · un 422 con user_already_exists vuelve como ese codigo", async () => {
    const { peticion } = espia(
      responde(422, {
        code: 422,
        error_code: "user_already_exists",
        msg: "User already registered",
      }),
    );

    const resultado = await autenticar(
      "registrar",
      { correo: "sofia@correo.com", clave: "supersecret123" },
      { peticion, config: CONFIG },
    );

    expect(resultado).toEqual({ ok: false, codigo: "user_already_exists" });
  });

  it("CP16 · si el fetch lanza, vuelve sin-red y la promesa no se rechaza", async () => {
    const { peticion } = espia(explota());

    const resultado = await autenticar(
      "entrar",
      { correo: "sofia@correo.com", clave: "supersecret123" },
      { peticion, config: CONFIG },
    );

    expect(resultado).toEqual({ ok: false, codigo: "sin-red" });
  });

  it("CP16 · un cuerpo ilegible es desconocido, no sin-red", async () => {
    // La distincion importa: "no llegue al servidor" y "el servidor contesto
    // algo que no entiendo" son fallos distintos y el usuario lee mensajes
    // distintos. Si el parseo del cuerpo viviera en el mismo try que el fetch,
    // los dos dirian "Can't reach the server".
    const { peticion } = espia(() =>
      Promise.resolve(new Response("<html>502 Bad Gateway</html>", { status: 502 })),
    );

    const resultado = await autenticar(
      "entrar",
      { correo: "sofia@correo.com", clave: "supersecret123" },
      { peticion, config: CONFIG },
    );

    expect(resultado).toEqual({ ok: false, codigo: "desconocido" });
  });

  it("CP17 · sin configuracion no sale ninguna peticion", async () => {
    const { peticion, llamadas } = espia(responde(200, SESION));

    const resultado = await autenticar(
      "entrar",
      { correo: "sofia@correo.com", clave: "supersecret123" },
      { peticion, config: null },
    );

    expect(resultado).toEqual({ ok: false, codigo: "sin-configurar" });
    expect(llamadas.length).toBe(0);
  });
});
