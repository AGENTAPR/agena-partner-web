import { safeRedirectPath } from "./safe-redirect";
import { describe, expect, it } from "vitest";

import { hasBffSessionCookie, isPublicPath, mapMeResponse, scenarioIdForLifecycle } from "@/server/auth.server";
import { buildBffUrl } from "@/server/bff-proxy.server";

const BFF = "https://bff.example.test";

describe("safeRedirectPath", () => {
  it("allows first-party app paths", () => {
    expect(safeRedirectPath("/today")).toBe("/today");
    expect(safeRedirectPath("/today?x=1")).toBe("/today?x=1");
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

describe("scenarioIdForLifecycle", () => {
  it("maps BFF lifecycle values to today scenarios", () => {
    expect(scenarioIdForLifecycle("ACTIVE")).toBe("active-eligible");
    expect(scenarioIdForLifecycle("SUSPENDED")).toBe("suspended");
    expect(scenarioIdForLifecycle("CANDIDATE")).toBe("candidate");
    expect(scenarioIdForLifecycle("ONBOARDING")).toBe("onboarding");
  });

  it("returns null for missing or unknown lifecycle — never fabricates", () => {
    expect(scenarioIdForLifecycle(null)).toBeNull();
    expect(scenarioIdForLifecycle("SOMETHING_NEW")).toBeNull();
  });
});

describe("mapMeResponse — live BFF /api/v1/me contract", () => {
  const linkedAgent = {
    data: {
      subject: "kc-subject-1",
      displayName: "Demo Agent One",
      agentId: "agent-1",
      agentCode: "AGT-001",
      lifecycleStatus: "ACTIVE",
      activeWorkspace: "workspace-branch-1",
      permissions: ["IAOP_AGENT", "agent:read"],
      locale: "id-ID",
      timezone: "Asia/Jakarta",
      sessionExpiresAt: "2026-11-16T00:00:00Z",
      partial: false,
      unavailableSections: [],
    },
  };

  it("maps a linked agent profile", () => {
    const partner = mapMeResponse(linkedAgent);
    expect(partner?.subject).toBe("kc-subject-1");
    expect(partner?.displayName).toBe("Demo Agent One");
    expect(partner?.agentCode).toBe("AGT-001");
    expect(partner?.lifecycle).toBe("ACTIVE");
    expect(partner?.scenarioId).toBe("active-eligible");
    expect(partner?.workspace).toBe("workspace-branch-1");
    expect(partner?.canSell).toBe(false);
  });

  it("handles unlinked Keycloak account with null agent fields", () => {
    const partner = mapMeResponse({
      data: {
        subject: "kc-subject-2",
        displayName: "Unlinked User",
        agentId: null,
        agentCode: null,
        lifecycleStatus: null,
        activeWorkspace: "workspace-candidate",
        permissions: ["IAOP_AGENT"],
        locale: "id-ID",
        timezone: "Asia/Jakarta",
        sessionExpiresAt: "2026-11-16T00:00:00Z",
        partial: false,
        unavailableSections: [],
      },
    });
    expect(partner?.lifecycle).toBe("UNLINKED");
    expect(partner?.scenarioId).toBe("unaffiliated");
    expect(partner?.agentId).toBeUndefined();
    expect(partner?.canSell).toBe(false);
  });

  it("grants canSell only from explicit sell-scoped permissions", () => {
    const partner = mapMeResponse({
      data: { ...linkedAgent.data, permissions: ["proposal:create", "agent:read"] },
    });
    expect(partner?.canSell).toBe(true);
  });

  it("rejects malformed payloads", () => {
    expect(mapMeResponse(null)).toBeNull();
    expect(mapMeResponse({})).toBeNull();
    expect(mapMeResponse({ data: {} })).toBeNull();
    expect(mapMeResponse({ data: { displayName: "no subject" } })).toBeNull();
  });
});

describe("hasBffSessionCookie", () => {
  it("detects the BFF session cookie only", () => {
    expect(
      hasBffSessionCookie(new Request("http://x/", { headers: { Cookie: "__Host-iaop_session=abc; other=1" } })),
    ).toBe(true);
    expect(hasBffSessionCookie(new Request("http://x/"))).toBe(false);
    expect(hasBffSessionCookie(new Request("http://x/", { headers: { Cookie: "iaop_session=abc" } }))).toBe(false);
  });
});

describe("buildBffUrl", () => {
  it("proxies path and query verbatim", () => {
    const u = buildBffUrl("http://localhost:3001/api/v1/me?x=1", BFF);
    expect(u.toString()).toBe(`${BFF}/api/v1/me?x=1`);
  });

  it("pins redirect_uri to the request origin for /auth/login", () => {
    const u = buildBffUrl("http://localhost:3001/auth/login?return_to=%2Ftoday", BFF);
    expect(u.searchParams.get("redirect_uri")).toBe("http://localhost:3001/auth/callback");
    expect(u.searchParams.get("return_to")).toBe("/today");
  });

  it("does not touch redirect_uri on other paths", () => {
    const u = buildBffUrl("http://localhost:3001/auth/callback?code=c&state=s", BFF);
    expect(u.searchParams.get("redirect_uri")).toBeNull();
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
