// Los tres casos del loop E2E del acceso: el panel hablando de verdad con
// Supabase local, y lo que el usuario ve de cada respuesta. Lo que NO esta aca
// —el mapeo de cada cuerpo de error, el endpoint de cada modo, las
// transiciones del estado— ya lo cubren los 34 unitarios contra dobles.
// Plan: docs/specs/2026-09-22-login-supabase-local/e2e-tests-plan.md

import { expect, test, type Page } from "@playwright/test";

const CLAVE = "supersecret123";

// Los tres casos corren en paralelo y ninguno siembra datos: cada uno se
// fabrica su correo, unico por corrida, para no pisarse entre si ni depender
// del estado que dejo una corrida anterior en la base local.
function correoUnico(prefijo: string): string {
  return `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.com`;
}

// El boton de envio se ubica por su clase y no por rol+nombre a proposito: su
// texto cambia entre modos ("Sign in" / "Create account"), asi que el nombre
// accesible obligaria a un selector distinto por modo. La clase no cambia.
function botonEnviar(page: Page) {
  return page.locator(".formulario .boton--primario");
}

// Los espacios de error de los campos son spans vacios sin rol: no hay forma
// accesible de ubicarlos cuando no dicen nada, que es justo lo que se afirma.
function erroresDeCampo(page: Page) {
  return page.locator(".campo__error");
}

async function completar(page: Page, correo: string, clave: string): Promise<void> {
  await page.getByRole("textbox", { name: "Email" }).fill(correo);
  await page.getByRole("textbox", { name: "Password" }).fill(clave);
}

test.describe("Acceso contra Supabase local", () => {
  // E1 — Me creo una cuenta y entro · happy path · R2.1, R1.4, R3.1
  test("me creo una cuenta desde el acceso y quedo adentro sin sesion guardada", async ({
    page,
  }) => {
    await page.goto("/#/login");

    await page.getByRole("button", { name: "Create an account" }).click();

    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(botonEnviar(page)).toHaveText("Create account");

    await completar(page, correoUnico("e2e"), CLAVE);
    await botonEnviar(page).click();

    // El efecto real de haber entrado es la pantalla, no el fragmento: si el
    // boton navegara sin consultar al servidor, la URL sola pasaria igual.
    await expect(page).toHaveURL(/#\/perfil$/);
    await expect(page.getByRole("heading", { name: "Tell us about your finances" })).toBeVisible();

    // R1.4: la sesion que Supabase devolvio se leyo y se descarto. Persistirla
    // "por conveniencia" dejaria una clave sb-…-auth-token en localStorage.
    const almacenamientos = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    }));
    expect(almacenamientos.local).toEqual([]);
    expect(almacenamientos.session).toEqual([]);
    expect(await page.context().cookies()).toEqual([]);
  });

  // E2 — Me equivoco de clave y la pantalla me lo dice sin culpar a un campo · error · R1.2, R4.1, R4.6
  test("unas credenciales que no existen avisan en el mensaje de formulario y no culpan a ningun campo", async ({
    page,
  }) => {
    await page.goto("/#/login");

    await completar(page, correoUnico("e2e-nadie"), "claveIncorrecta999");
    await botonEnviar(page).click();

    // El nodo de alerta lleva `hidden` mientras esta vacio, asi que esperar a
    // que el rol sea visible es a la vez esperar a que llegue la respuesta.
    const alerta = page.getByRole("alert");
    await expect(alerta).toBeVisible();
    await expect(alerta).toHaveText("That email and password don't match an account.");

    // El aviso no alcanza: el intento tampoco tiene que haber abierto la app.
    await expect(page).toHaveURL(/#\/login$/);

    // R4.6: el servidor no sabe cual de los dos campos esta mal, asi que
    // ninguno de los dos espacios de error puede decir nada.
    await expect(erroresDeCampo(page)).toHaveText(["", ""]);
  });

  // E3 — Intento registrarme con un correo que ya use y me mandan a entrar · error · R2.2, R4.1
  test("registrarme con un correo que ya tiene cuenta me lo dice y me deja en registrar", async ({
    page,
  }) => {
    const correo = correoUnico("e2e-dup");

    // Precondicion hecha por la interfaz: la cuenta previa la crea el propio
    // caso, porque la suite no siembra datos y corre en paralelo.
    await page.goto("/#/login");
    await page.getByRole("button", { name: "Create an account" }).click();
    await completar(page, correo, CLAVE);
    await botonEnviar(page).click();
    await expect(page).toHaveURL(/#\/perfil$/);

    // Volver al acceso y RECARGAR: navegar al mismo fragmento es una
    // navegacion same-document que no remonta el panel, y el modo del paso
    // anterior sobreviviria. La recarga garantiza el panel recien montado.
    await page.goto("/#/login");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

    await page.getByRole("button", { name: "Create an account" }).click();
    await completar(page, correo, CLAVE);
    await botonEnviar(page).click();

    const alerta = page.getByRole("alert");
    await expect(alerta).toBeVisible();
    await expect(alerta).toHaveText("That email already has an account. Sign in instead.");

    // El duplicado no entro: si el cliente ignorara el 422 estariamos en perfil.
    await expect(page).toHaveURL(/#\/login$/);

    // Y el fallo no voltea el panel por su cuenta: sigue en modo registrar.
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  });
});
