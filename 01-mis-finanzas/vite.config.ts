import { defineConfig } from "vite";

export default defineConfig({
  root: "web",
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
