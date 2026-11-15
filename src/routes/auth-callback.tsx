import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { getAuthMode, liveCallback } from "@/server/auth.server";

/**
 * GET /auth/callback?code=…&state=…
 * Live mode only — the BFF redeems the code and issues the opaque
 * session reference. Mock mode never reaches this route.
 */
export async function loader(args: LoaderFunctionArgs) {
  if (getAuthMode(args.context) !== "live") {
    throw redirect("/auth/sign-in");
  }
  return liveCallback(args.request, args.context);
}
