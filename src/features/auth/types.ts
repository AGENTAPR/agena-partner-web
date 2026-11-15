/**
 * Shared authentication types — isomorphic (client + server safe).
 * No secrets, no tokens: only presentation-safe identity context.
 */

export type AuthMode = "mock" | "live";

export type AuthState =
  "ANONYMOUS" | "AUTHENTICATING" | "AUTHENTICATED" | "SESSION_EXPIRED" | "FORBIDDEN" | "UNAVAILABLE";

export interface PartnerContext {
  /** Stable subject identifier — never an OAuth token or session id. */
  subject: string;
  displayName: string;
  email?: string;
  /** Today scenario this identity maps to (mock) or BFF-resolved lifecycle. */
  scenarioId: string;
  lifecycle: string;
  roles: string[];
  workspace: string;
  canSell: boolean;
  locale?: string;
}

export interface AuthContextValue {
  mode: AuthMode;
  state: AuthState;
  partner: PartnerContext | null;
}
