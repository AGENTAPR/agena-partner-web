import { route, type RouteConfig } from "@react-router/dev/routes";

export default [
  // Dedicated sign-out route — server action lives in a route module so
  // server-only code never enters the client bundle.
  route("auth/sign-out", "./routes/sign-out.tsx"),
  // All application routes render inside the splat route (App shell).
  route("*", "./App.tsx"),
] satisfies RouteConfig;
