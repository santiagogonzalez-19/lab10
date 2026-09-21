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
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env["CI"],
  },
});
