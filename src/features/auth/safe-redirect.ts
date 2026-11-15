/**
 * Safe same-origin redirect validation.
 * Rejects external URLs, protocol-relative URLs, and encoded bypasses.
 */

const DEFAULT_DESTINATION = "/today";

/** Paths that are always safe post-auth destinations. */
const ALLOWED_PREFIXES = ["/today", "/dashboard", "/app"];

export function safeRedirectPath(value: unknown, fallback: string = DEFAULT_DESTINATION): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  // Must start with a single "/" — rejects "//evil.com", "https://…", "javascript:…"
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  // Reject encoded traversal / scheme smuggling
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (decoded.startsWith("//") || decoded.includes("://") || decoded.startsWith("/\\")) {
    return fallback;
  }
  // Restrict to application paths — auth pages must never be redirect targets
  if (decoded.startsWith("/auth/")) return fallback;
  if (
    !ALLOWED_PREFIXES.some(
      (p) => decoded === p || decoded.startsWith(`${p}/`) || decoded.startsWith(`${p}?`) || decoded.startsWith(`${p}#`),
    )
  ) {
    // Allow other first-party app paths under known modules too
    const firstSegment = decoded.split(/[/?#]/)[1] ?? "";
    const knownModules = [
      "prospects",
      "customers",
      "sales",
      "portfolio",
      "development",
      "earnings",
      "performance",
      "agency",
      "support",
      "resources",
      "me",
    ];
    if (!knownModules.includes(firstSegment)) return fallback;
  }
  return value;
}
