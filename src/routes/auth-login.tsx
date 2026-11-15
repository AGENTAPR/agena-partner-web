import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { getAuthMode, liveLoginUrl, safeRedirectPath } from "@/server/auth.server";

/**
 * GET /auth/login?return_to=<path>
 * Live mode: 302 → Agent BFF OIDC authorize endpoint (BFF owns Keycloak).
 * Mock mode: mock login happens via the sign-in form POST — bounce back.
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const returnTo = safeRedirectPath(url.searchParams.get("return_to"));
  if (getAuthMode(context) === "live") {
    throw redirect(liveLoginUrl(returnTo, context));
  }
  throw redirect(`/auth/sign-in?redirectTo=${encodeURIComponent(returnTo)}`);
}
