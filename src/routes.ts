import { route, type RouteConfig } from "@react-router/dev/routes";

const proxy = "./routes/bff-proxy.tsx";

export default [
  // Same-origin BFF proxy — auth transaction + API. The BFF owns OIDC,
  // session cookie and tokens; the browser never leaves this origin.
  route("auth/login", proxy, { id: "bff-auth-login" }),
  route("auth/callback", proxy, { id: "bff-auth-callback" }),
  route("auth/session", proxy, { id: "bff-auth-session" }),
  route("auth/me", proxy, { id: "bff-auth-me" }),
  route("api/v1/*", proxy, { id: "bff-api" }),
  // Frontend logout page/action (server-side BFF logout + CSRF).
  route("auth/sign-out", "./routes/sign-out.tsx"),
  // All application routes render inside the splat route (App shell).
  route("*", "./App.tsx"),
] satisfies RouteConfig;
