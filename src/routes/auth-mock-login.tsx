import type { ActionFunctionArgs } from "react-router";

import { safeRedirectPath } from "@/features/auth/safe-redirect";
import { getAuthMode, mockLogin, verifySameOrigin } from "@/server/auth.server";

/**
 * POST /auth/mock-login — development/test only.
 * In live mode this endpoint does not exist as a credential path:
 * it always rejects, so mock identities can never authenticate
 * against a production deployment.
 */
export async function action({ request, context }: ActionFunctionArgs) {
  if (getAuthMode(context) !== "mock") {
    return new Response("Not found", { status: 404 });
  }
  if (!verifySameOrigin(request)) {
    return new Response("Forbidden", { status: 403 });
  }
  const formData = await request.formData();
  const identity = String(formData.get("identity") ?? "");
  const returnTo = safeRedirectPath(String(formData.get("returnTo") ?? ""));
  return mockLogin(identity, returnTo, request, context);
}
