import { createContext } from "react-router";

export interface CloudflareWorkerContext {
  env: {
    AGENT_BFF_BASE_URL?: string;
    AGENT_BFF_INTERNAL_TOKEN?: string;
    AGENT_BFF_TIMEOUT_MS?: string;
    SESSION_SECRET?: string;
  };
  ctx: unknown;
}

export const cloudflareContext = createContext<CloudflareWorkerContext>();
