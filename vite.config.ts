import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Expose non-VITE_* server bindings (e.g. AGENT_BFF_BASE_URL) to the SSR
  // process.env during `react-router dev` — they are never shipped to the
  // client bundle.
  const proc = (globalThis as { process?: { cwd: () => string; env?: Record<string, string | undefined> } })
    .process;
  const fileEnv = loadEnv(mode, proc?.cwd() ?? ".", "");
  for (const [key, value] of Object.entries(fileEnv)) {
    if (proc?.env && proc.env[key] === undefined) proc.env[key] = value;
  }

  return {
    plugins: [reactRouter(), tsconfigPaths(), tailwindcss()],
    server: {
      port: 3001,
    },
    test: {
      exclude: ["e2e/**", "node_modules/**", "build/**"],
    },
  };
});
