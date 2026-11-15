import { getMockIdentity, MOCK_IDENTITIES, partnerFromMockSubject } from "./mock-identities";
import { safeRedirectPath } from "./safe-redirect";
import { describe, expect, it } from "vitest";

import { isPublicPath } from "@/server/auth.server";
import { mapMeDto, scenarioIdForLifecycle } from "@/server/auth.server";
import { isSessionExpired, type SessionData } from "@/server/session.server";

describe("safeRedirectPath", () => {
  it("allows first-party app paths", () => {
    expect(safeRedirectPath("/today")).toBe("/today");
    expect(safeRedirectPath("/today?scenario=suspended")).toBe("/today?scenario=suspended");
    expect(safeRedirectPath("/portfolio/policies")).toBe("/portfolio/policies");
    expect(safeRedirectPath("/me/preferences")).toBe("/me/preferences");
  });

  it("rejects external and unsafe destinations", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/today");
    expect(safeRedirectPath("//evil.com")).toBe("/today");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/today");
    expect(safeRedirectPath("")).toBe("/today");
    expect(safeRedirectPath(null)).toBe("/today");
    expect(safeRedirectPath("/auth/sign-in")).toBe("/today");
    expect(safeRedirectPath("/%2f%2fevil.com")).toBe("/today");
    expect(safeRedirectPath("/unknown-module/x")).toBe("/today");
  });
});

describe("mock identities", () => {
  it("covers all eight today scenarios plus agency leader", () => {
    const scenarios = MOCK_IDENTITIES.map((i) => i.scenarioId);
    for (const s of [
      "candidate",
      "onboarding",
      "learning",
      "certification-pending",
      "active-eligible",
      "active-ineligible",
      "suspended",
      "offboarding",
    ]) {
      expect(scenarios).toContain(s);
    }
    expect(MOCK_IDENTITIES.some((i) => i.roles.includes("AGENCY_LEADER"))).toBe(true);
  });

  it("maps subject back to a consistent partner context", () => {
    const identity = getMockIdentity("agent-suspended")!;
    const partner = partnerFromMockSubject(identity.subject);
    expect(partner?.displayName).toBe(identity.displayName);
    expect(partner?.scenarioId).toBe("suspended");
    expect(partner?.canSell).toBe(false);
    expect(partnerFromMockSubject("unknown")).toBeNull();
  });

  it("keeps selling eligibility separate from lifecycle", () => {
    const eligible = partnerFromMockSubject(getMockIdentity("agent-eligible")!.subject)!;
    const ineligible = partnerFromMockSubject(getMockIdentity("agent-ineligible")!.subject)!;
    expect(eligible.lifecycle).toBe(ineligible.lifecycle);
    expect(eligible.canSell).toBe(true);
    expect(ineligible.canSell).toBe(false);
  });
});

describe("scenarioIdForLifecycle", () => {
  it("maps lifecycle + eligibility to today scenarios", () => {
    expect(scenarioIdForLifecycle("ACTIVE", true)).toBe("active-eligible");
    expect(scenarioIdForLifecycle("ACTIVE", false)).toBe("active-ineligible");
    expect(scenarioIdForLifecycle("SUSPENDED", false)).toBe("suspended");
    expect(scenarioIdForLifecycle("CANDIDATE", false)).toBe("candidate");
    expect(scenarioIdForLifecycle("UNKNOWN", false)).toBe("candidate");
  });
});

describe("mapMeDto", () => {
  it("validates and maps a well-formed BFF /me response", () => {
    const partner = mapMeDto({
      sub: "bff-user-1",
      name: "Nadia Agent",
      email: "nadia@example.com",
      lifecycle: "ACTIVE",
      eligible: true,
      roles: ["AGENT"],
      workspace: "partner",
    });
    expect(partner?.subject).toBe("bff-user-1");
    expect(partner?.displayName).toBe("Nadia Agent");
    expect(partner?.scenarioId).toBe("active-eligible");
    expect(partner?.canSell).toBe(true);
  });

  it("supports nested agent DTO shape", () => {
    const partner = mapMeDto({
      subject: "u2",
      agent: { lifecycle: "SUSPENDED", sellingEligible: false },
    });
    expect(partner?.scenarioId).toBe("suspended");
    expect(partner?.canSell).toBe(false);
  });

  it("rejects malformed payloads", () => {
    expect(mapMeDto(null)).toBeNull();
    expect(mapMeDto({})).toBeNull();
    expect(mapMeDto({ name: "no subject" })).toBeNull();
  });
});

describe("session expiry", () => {
  it("detects expired sessions", () => {
    const expired: SessionData = { subject: "x", expiresAt: Date.now() - 1 };
    const valid: SessionData = { subject: "x", expiresAt: Date.now() + 10000 };
    const noExpiry: SessionData = { subject: "x" };
    expect(isSessionExpired(expired)).toBe(true);
    expect(isSessionExpired(valid)).toBe(false);
    expect(isSessionExpired(noExpiry)).toBe(false);
  });
});

describe("public paths", () => {
  it("allows auth routes, blocks app routes", () => {
    expect(isPublicPath("/auth/sign-in")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/today")).toBe(false);
    expect(isPublicPath("/dashboard")).toBe(false);
  });
});
