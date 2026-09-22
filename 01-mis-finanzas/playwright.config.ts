import { defineConfig, devices } from "@playwright/test";

// Los E2E viven en e2e/ y no en web/src/, porque vitest.config.ts toma
// todo lo que sea *.test.ts bajo src: separarlos evita que vitest intente
// correr los specs de navegador.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  reporter: process.env["CI"] ? "line" : [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Dos servicios, no uno. El segundo es Supabase local: los casos de
  // autenticacion le hablan de verdad, y sin el fallan con un error de red que
  // se lee como un bug de la aplicacion en vez de como "falta levantar algo".
  // Treinta segundos de arranque cuestan menos que ese diagnostico.
  //
  // `supabase start` termina cuando los contenedores estan listos, en vez de
  // quedarse en primer plano: por eso lo que marca que esta arriba es la `url`
  // del health de auth y no el proceso. Necesita Docker corriendo.
  webServer: [
    {
      command: "npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env["CI"],
    },
    {
      command: "supabase start",
      url: "http://127.0.0.1:54321/auth/v1/health",
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
