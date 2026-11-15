import { route, type RouteConfig } from "@react-router/dev/routes";

export default [
  // Auth endpoints — server route modules (actions/loaders only,
  // server-only code never enters the client bundle).
  route("auth/login", "./routes/auth-login.tsx"),
  route("auth/mock-login", "./routes/auth-mock-login.tsx"),
  route("auth/callback", "./routes/auth-callback.tsx"),
  route("auth/sign-out", "./routes/sign-out.tsx"),
  // All application routes render inside the splat route (App shell).
  route("*", "./App.tsx"),
] satisfies RouteConfig;
