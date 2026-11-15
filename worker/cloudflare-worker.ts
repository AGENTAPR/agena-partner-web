import { cloudflareContext } from "../src/server/cloudflare-context";
import type { AppLoadContext, ServerBuild } from "react-router";
import { createRequestHandler, RouterContextProvider } from "react-router";

// The React Router server bundle produced by `react-router build`
// (virtual:react-router/server-build resolves to this file at build time).
const serverBuildModule = (await import("../build/server/index.js")) as {
  default?: ServerBuild;
} & ServerBuild;
const serverBuild: ServerBuild = serverBuildModule.default ?? serverBuildModule;

// `import.meta.env` is a Vite-ism; under wrangler/esbuild it may be absent.
const mode = (import.meta as ImportMeta & { env?: { MODE?: string } }).env?.MODE ?? "production";
const requestHandler = createRequestHandler(() => serverBuild, mode);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/healthz") {
      return Response.json({ status: "ok" });
    }

    const loadContext = new RouterContextProvider();
    loadContext.set(cloudflareContext, { env: env as Record<string, unknown>, ctx });

    const response = await requestHandler(request, loadContext as unknown as AppLoadContext);
    return withSecurityHeaders(response);
  },
} satisfies ExportedHandler<Env>;

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (!headers.has("Content-Security-Policy")) {
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'; connect-src 'self'",
    );
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
