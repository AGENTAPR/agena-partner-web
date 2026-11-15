import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { proxyBffRequest } from "@/server/bff-proxy.server";

/**
 * Same-origin BFF proxy resource route.
 * Mounted for /auth/login, /auth/callback, /auth/session, /auth/me and
 * /api/v1/* — the BFF owns the OIDC transaction and session lifecycle.
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  return proxyBffRequest(request, context);
}

export async function action({ request, context }: ActionFunctionArgs) {
  return proxyBffRequest(request, context);
}
