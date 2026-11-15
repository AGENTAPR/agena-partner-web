import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths(), tailwindcss()],
  server: {
    port: 3001,
  },
  test: {
    exclude: ["e2e/**", "node_modules/**", "build/**"],
  },
});
