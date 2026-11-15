import { cloudflareContext } from "./cloudflare-context";
import type { AppLoadContext } from "react-router";

export interface AgentBffEnv {
  AGENT_BFF_BASE_URL?: string;
  AGENT_BFF_INTERNAL_TOKEN?: string;
  AGENT_BFF_TIMEOUT_MS?: string;
  SESSION_SECRET?: string;
}

function getCloudflareEnv(context: AppLoadContext): AgentBffEnv | undefined {
  const provider = context as { get?: (key: unknown) => unknown };
  if (typeof provider.get === "function") {
    const value = provider.get(cloudflareContext) as { env?: AgentBffEnv } | undefined;
    return value?.env;
  }
  const direct = (context as { cloudflare?: { env?: AgentBffEnv } }).cloudflare;
  return direct?.env;
}

export function getBffConfig(context: AppLoadContext): {
  baseUrl: string;
  token?: string;
  timeoutMs: number;
} {
  const env = getCloudflareEnv(context);
  const baseUrl = env?.AGENT_BFF_BASE_URL;
  if (!baseUrl) {
    throw new Error("AGENT_BFF_BASE_URL binding is not configured");
  }
  const timeoutMs = Number(env?.AGENT_BFF_TIMEOUT_MS ?? "10000");
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    token: env?.AGENT_BFF_INTERNAL_TOKEN,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10000,
  };
}

export function getEnv(context: AppLoadContext): AgentBffEnv | undefined {
  return getCloudflareEnv(context);
}
