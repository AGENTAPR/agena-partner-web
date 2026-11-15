/**
 * Shared authentication types — isomorphic (client + server safe).
 * No secrets, no tokens: only presentation-safe identity context.
 */

export type AuthState =
  "ANONYMOUS" | "AUTHENTICATING" | "AUTHENTICATED" | "SESSION_EXPIRED" | "FORBIDDEN" | "UNAVAILABLE";

export interface PartnerContext {
  /** Stable subject identifier — never an OAuth token or session id. */
  subject: string;
  displayName: string;
  /** Agent domain linkage — null/unset when the Keycloak account is unlinked. */
  agentId?: string;
  agentCode?: string;
  /** BFF lifecycleStatus, or "UNLINKED" when no agent record exists. */
  lifecycle: string;
  /** Today scenario derived from lifecycle; "unaffiliated" when unlinked. */
  scenarioId: string;
  /** Verified permission scopes from the BFF. */
  roles: string[];
  /** Active workspace id from the BFF. */
  workspace: string;
  /** Selling eligibility — only from explicit permission scopes, never inferred. */
  canSell: boolean;
  locale?: string;
  timezone?: string;
  sessionExpiresAt?: string;
  /** True when the BFF marked sections of /me as unavailable. */
  partial?: boolean;
}

export interface AuthContextValue {
  state: AuthState;
  partner: PartnerContext | null;
}
