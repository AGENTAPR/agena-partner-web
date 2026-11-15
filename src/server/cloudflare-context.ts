import { createContext } from "react-router";

export interface CloudflareWorkerContext {
  env: {
    AGENT_BFF_BASE_URL?: string;
    AGENT_BFF_INTERNAL_TOKEN?: string;
    AGENT_BFF_TIMEOUT_MS?: string;
    SESSION_SECRET?: string;
    AUTH_MODE?: string;
  };
  ctx: unknown;
}

// The Worker entry and the React Router server bundle are separate module
// graphs. `createContext` keys are identity-based, so the context object must
// be shared through globalThis to survive the bundle boundary.
const globalStore = globalThis as {
  __averunaCloudflareContext?: ReturnType<typeof createContext<CloudflareWorkerContext>>;
};

export const cloudflareContext = (globalStore.__averunaCloudflareContext ??= createContext<CloudflareWorkerContext>());
