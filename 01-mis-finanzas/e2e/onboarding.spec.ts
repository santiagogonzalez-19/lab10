// Recorrido E2E del onboarding: las cuatro pantallas, su validacion y sus
// controles. Se apoya en roles y texto accesible, no en clases de CSS, para
// que el test siga la interfaz y no su hoja de estilos.

import { expect, test, type Page } from "@playwright/test";

const CREDENCIALES = { email: "santiago@example.com", clave: "supersecret123" };

// Entra al perfil sin pasar por el acceso. Antes rellenaba el formulario y
// hacia clic en "Sign in", lo cual funcionaba solo porque el login era una
// maqueta que navegaba con cualquier dato; desde que consulta a Supabase, esa
// cuenta no existe y el recorrido entero se caia.
//
// Se navega directo en vez de registrar un usuario real en cada beforeEach:
// estos ocho tests son sobre perfil, movimientos y plan, y hacerlos depender
// de la red los volveria lentos y fragiles por un motivo ajeno a lo que
// prueban. REG7 existe justamente para que esto sea legitimo: la feature no
// agrega guardia de rutas, asi que llegar directo a #/perfil tiene que seguir
// funcionando. La autenticacion de verdad la prueban los tres casos del loop.
async function ingresar(page: Page): Promise<void> {
  await page.goto("/#/perfil");
  await expect(page).toHaveURL(/#\/perfil$/);
}

test.describe("Acceso", () => {
  test("el email invalido se avisa y bloquea el ingreso", async ({ page }) => {
    await page.goto("/#/login");

    const ingresarBtn = page.getByRole("button", { name: "Sign in" });
    await expect(ingresarBtn).toBeDisabled();

    await page.getByRole("textbox", { name: "Email" }).fill("not-an-email");
    await page.getByRole("textbox", { name: "Password" }).fill("123");
    await page.getByRole("textbox", { name: "Password" }).blur();

    await expect(page.getByText("That email doesn't look valid.")).toBeVisible();
    await expect(ingresarBtn).toBeDisabled();
  });

  // Este test era "se limpia el error y se pasa al perfil". Lo segundo ya no
  // le corresponde: que un correo bien formado abra la aplicacion era cierto
  // cuando el login era una maqueta, y ahora depende de que exista la cuenta.
  // Queda con la mitad que sigue siendo suya —la validacion de forma, que es
  // del cliente y no consulta a nadie— y la navegacion se prueba en el loop,
  // contra credenciales de verdad.
  test("corregir el email limpia su error y habilita el envio", async ({ page }) => {
    await page.goto("/#/login");
    await page.getByRole("textbox", { name: "Email" }).fill("not-an-email");
    await page.getByRole("textbox", { name: "Password" }).fill(CREDENCIALES.clave);
    await page.getByRole("textbox", { name: "Password" }).blur();
    await expect(page.getByText("That email doesn't look valid.")).toBeVisible();

    await page.getByRole("textbox", { name: "Email" }).fill(CREDENCIALES.email);

    await expect(page.getByText("That email doesn't look valid.")).toBeHidden();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  // El acceso arranca sin ningun mensaje de servidor: el nodo de alerta existe
  // pero esta oculto, asi que getByRole("alert") no lo encuentra (D9).
  test("el acceso no muestra ningun mensaje de servidor al abrirse", async ({ page }) => {
    await page.goto("/#/login");
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});

test.describe("Perfil", () => {
  test.beforeEach(async ({ page }) => {
    await ingresar(page);
  });

  test("el objetivo elegido reemplaza al anterior", async ({ page }) => {
    const fondo = page.getByRole("radio", { name: "Build an emergency fund" });
    const deuda = page.getByRole("radio", { name: "Pay off debt" });
    await expect(fondo).toBeChecked();

    await deuda.click();

    await expect(deuda).toBeChecked();
    await expect(fondo).not.toBeChecked();
  });

  test("el riesgo elegido actualiza su descripcion", async ({ page }) => {
    const agresivo = page.getByRole("button", { name: "Aggressive" });
    await expect(page.getByRole("button", { name: "Balanced" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await agresivo.click();

    await expect(agresivo).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/^Aggressive —/)).toBeVisible();
  });

  test("sin fuentes de ingreso no se puede continuar", async ({ page }) => {
    const continuar = page.getByRole("button", { name: "Continue" });
    await expect(continuar).toBeEnabled();

    await page.getByRole("checkbox", { name: "Salary" }).uncheck();
    await page.getByRole("checkbox", { name: "Investments" }).uncheck();

    await expect(continuar).toBeDisabled();

    // Alcanza con una sola fuente para volver a habilitar el paso.
    await page.getByRole("checkbox", { name: "Freelance" }).check();

    await expect(continuar).toBeEnabled();
    await continuar.click();
    await expect(page).toHaveURL(/#\/conoceme$/);
  });
});

test.describe("Conoceme", () => {
  test.beforeEach(async ({ page }) => {
    await ingresar(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/#\/conoceme$/);
  });

  test("el movimiento cargado aparece en la lista y el formulario queda limpio", async ({
    page,
  }) => {
    const agregar = page.getByRole("button", { name: "Add", exact: true });
    const descripcion = page.getByRole("textbox", { name: "Description" });
    const valor = page.getByRole("textbox", { name: "Value" });
    await expect(agregar).toBeDisabled();

    await descripcion.fill("Gym membership");
    await valor.fill("58.50");
    await page.getByLabel("Category").selectOption("Subscriptions");

    await expect(agregar).toBeEnabled();
    await agregar.click();

    // El gasto se muestra en negativo y con su moneda; asi se distingue de un ingreso.
    const cargado = page.getByText("Gym membership").locator("xpath=ancestor::*[3]");
    await expect(cargado).toContainText("-$58.50");
    await expect(cargado).toContainText("Expense · USD");

    await expect(descripcion).toHaveValue("");
    await expect(valor).toHaveValue("");
    await expect(agregar).toBeDisabled();
  });

  test("borrar un archivo lo saca de la lista y baja el conteo", async ({ page }) => {
    await expect(page.getByText("Uploaded (3)")).toBeVisible();

    await page.getByRole("button", { name: "Remove Amex_Statement_Q2.csv" }).click();

    await expect(page.getByText("Uploaded (2)")).toBeVisible();
    await expect(page.getByText("Amex_Statement_Q2.csv")).toBeHidden();
  });

  test("el resumen financiero se muestra con sus cifras", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Your financial snapshot" })).toBeVisible();
    await expect(page.getByText("$48,920")).toBeVisible();
    await expect(page.getByText("Total balance")).toBeVisible();

    // "Housing" tambien aparece en los highlights y en el select de categoria,
    // asi que se busca la fila del desglose por su monto.
    const gastoPorCategoria = page
      .getByText("Spending by category")
      .locator("xpath=following-sibling::*[1]");
    await expect(gastoPorCategoria).toContainText("Housing");
    await expect(gastoPorCategoria).toContainText("$2,180");
  });
});

test.describe("Plan", () => {
  test("cierra el recorrido con el plan y sus doce meses", async ({ page }) => {
    await ingresar(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue to plan" }).click();

    await expect(page).toHaveURL(/#\/plan$/);
    await expect(page.getByRole("heading", { name: "Your personalized plan" })).toBeVisible();

    // Las tres cifras del reparto mensual y las doce barras del grafico.
    await expect(page.getByText("$1,650")).toBeVisible();
    await expect(page.getByText("$930")).toBeVisible();
    await expect(page.getByText("$420").first()).toBeVisible();
    await expect(page.getByRole("img", { name: /^Jan:/ })).toBeVisible();
    await expect(page.getByRole("img", { name: /^Dec:/ })).toBeVisible();

    await expect(page.getByRole("button", { name: "Finish & go to dashboard" })).toBeEnabled();
  });
});

test.describe("Ruteo", () => {
  test("un fragmento desconocido cae en el acceso", async ({ page }) => {
    await page.goto("/#/no-existe");

    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("se puede volver atras desde el perfil", async ({ page }) => {
    await ingresar(page);

    await page.getByRole("button", { name: "Back" }).click();

    await expect(page).toHaveURL(/#\/login$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });
});
