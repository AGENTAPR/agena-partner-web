import type { PartnerContext } from "./types";

/**
 * Synthetic mock identities for development/test.
 * No real user data. Deterministic: same id → same context everywhere.
 * Safe to import from client code (sign-in selector) — contains no secrets.
 */
export interface MockIdentity extends PartnerContext {
  id: string;
  descriptionKey: string;
}

const base = {
  email: undefined,
  locale: "id",
};

export const MOCK_IDENTITIES: MockIdentity[] = [
  {
    ...base,
    id: "candidate",
    subject: "mock-subject-candidate",
    displayName: "Calon Mitra",
    scenarioId: "candidate",
    lifecycle: "CANDIDATE",
    roles: ["CANDIDATE"],
    workspace: "partner",
    canSell: false,
    descriptionKey: "auth-mock-identity-candidate",
  },
  {
    ...base,
    id: "onboarding",
    subject: "mock-subject-onboarding",
    displayName: "Mitra Onboarding",
    scenarioId: "onboarding",
    lifecycle: "ONBOARDING",
    roles: ["AGENT"],
    workspace: "partner",
    canSell: false,
    descriptionKey: "auth-mock-identity-onboarding",
  },
  {
    ...base,
    id: "learning",
    subject: "mock-subject-learning",
    displayName: "Mitra Belajar",
    scenarioId: "learning",
    lifecycle: "LEARNING",
    roles: ["AGENT"],
    workspace: "partner",
    canSell: false,
    descriptionKey: "auth-mock-identity-learning",
  },
  {
    ...base,
    id: "certification-pending",
    subject: "mock-subject-cert-pending",
    displayName: "Mitra Sertifikasi",
    scenarioId: "certification-pending",
    lifecycle: "CERTIFICATION_PENDING",
    roles: ["AGENT"],
    workspace: "partner",
    canSell: false,
    descriptionKey: "auth-mock-identity-certification-pending",
  },
  {
    ...base,
    id: "agent-eligible",
    subject: "mock-subject-agent-eligible",
    displayName: "Mitra Aktif",
    scenarioId: "active-eligible",
    lifecycle: "ACTIVE",
    roles: ["AGENT"],
    workspace: "partner",
    canSell: true,
    descriptionKey: "auth-mock-identity-agent-eligible",
  },
  {
    ...base,
    id: "agent-ineligible",
    subject: "mock-subject-agent-ineligible",
    displayName: "Mitra Nonaktif",
    scenarioId: "active-ineligible",
    lifecycle: "ACTIVE",
    roles: ["AGENT"],
    workspace: "partner",
    canSell: false,
    descriptionKey: "auth-mock-identity-agent-ineligible",
  },
  {
    ...base,
    id: "agent-suspended",
    subject: "mock-subject-agent-suspended",
    displayName: "Mitra Suspensi",
    scenarioId: "suspended",
    lifecycle: "SUSPENDED",
    roles: ["AGENT"],
    workspace: "partner",
    canSell: false,
    descriptionKey: "auth-mock-identity-agent-suspended",
  },
  {
    ...base,
    id: "agent-offboarding",
    subject: "mock-subject-agent-offboarding",
    displayName: "Mitra Offboarding",
    scenarioId: "offboarding",
    lifecycle: "OFFBOARDING",
    roles: ["AGENT"],
    workspace: "partner",
    canSell: false,
    descriptionKey: "auth-mock-identity-agent-offboarding",
  },
  {
    ...base,
    id: "agency-leader",
    subject: "mock-subject-agency-leader",
    displayName: "Kepala Agensi",
    scenarioId: "active-eligible",
    lifecycle: "ACTIVE",
    roles: ["AGENCY_LEADER"],
    workspace: "agency",
    canSell: false,
    descriptionKey: "auth-mock-identity-agency-leader",
  },
];

export function getMockIdentity(id: string): MockIdentity | undefined {
  return MOCK_IDENTITIES.find((i) => i.id === id);
}

export function getMockIdentityBySubject(subject: string): MockIdentity | undefined {
  return MOCK_IDENTITIES.find((i) => i.subject === subject);
}

/** Partner context for a mock subject — null when unknown. */
export function partnerFromMockSubject(subject: string): PartnerContext | null {
  const identity = getMockIdentityBySubject(subject);
  if (!identity) return null;
  const partner: PartnerContext = {
    subject: identity.subject,
    displayName: identity.displayName,
    email: identity.email,
    scenarioId: identity.scenarioId,
    lifecycle: identity.lifecycle,
    roles: identity.roles,
    workspace: identity.workspace,
    canSell: identity.canSell,
    locale: identity.locale,
  };
  return partner;
}
