import type { RequestContext } from "./models";
import { TODAY_SCENARIOS } from "./scenarios";
import { MockTodayExperienceService } from "./service";
import { toTodayViewModel } from "./view-model";
import { beforeEach, describe, expect, it } from "vitest";

const svc = new MockTodayExperienceService();

function ctx(scenarioId: string, variant = "normal", actorId = "agent-demo-001"): RequestContext {
  return { actorId, scenarioId, variant, requestId: `r-${scenarioId}` };
}

describe("today scenarios", () => {
  it("covers all eight lifecycle scenarios", () => {
    expect(TODAY_SCENARIOS).toHaveLength(8);
    const lifecycles = new Set(TODAY_SCENARIOS.map((s) => s.view.lifecycle));
    for (const l of [
      "CANDIDATE",
      "ONBOARDING",
      "LEARNING",
      "CERTIFICATION_PENDING",
      "ACTIVE_ELIGIBLE",
      "SUSPENDED",
      "OFFBOARDING",
    ]) {
      expect(lifecycles.has(l as never)).toBe(true);
    }
    // ACTIVE_INELIGIBLE is expressed as lifecycle ACTIVE_ELIGIBLE + eligibility INELIGIBLE
    const ineligible = TODAY_SCENARIOS.find((s) => s.id === "active-ineligible");
    expect(ineligible?.view.eligibility).toBe("INELIGIBLE");
    expect(ineligible?.view.permissions.canSell).toBe(false);
  });

  it("each scenario returns a hero with a valid in-app CTA destination", async () => {
    for (const s of TODAY_SCENARIOS) {
      const view = await svc.getToday(ctx(s.id));
      expect(view.hero.cta.labelKey).toBeTruthy();
      if (view.hero.cta.to) expect(view.hero.cta.to.startsWith("/")).toBe(true);
      expect(view.tasks.length).toBeGreaterThan(0);
    }
  });
});

describe("mock service", () => {
  beforeEach(() => {
    for (const s of TODAY_SCENARIOS) svc.reset(ctx(s.id, "normal", `a-${s.id}`));
    svc.reset(ctx("active-eligible", "normal"));
  });

  it("completing a task updates the Today view", async () => {
    const before = await svc.getToday(ctx("active-eligible"));
    const task = before.tasks.find((t) => t.completable)!;
    await svc.updateTask(ctx("active-eligible"), task.id, {
      action: "complete",
      expectedVersion: task.expectedVersion,
    });
    const after = await svc.getToday(ctx("active-eligible"));
    const updated = after.tasks.find((t) => t.id === task.id)!;
    expect(updated.status).toBe("COMPLETED");
    expect(updated.expectedVersion).toBe(task.expectedVersion + 1);
  });

  it("reopening restores an open task", async () => {
    const v1 = await svc.getToday(ctx("active-eligible"));
    const task = v1.tasks.find((t) => t.completable)!;
    await svc.updateTask(ctx("active-eligible"), task.id, {
      action: "complete",
      expectedVersion: task.expectedVersion,
    });
    await svc.updateTask(ctx("active-eligible"), task.id, {
      action: "reopen",
      expectedVersion: task.expectedVersion + 1,
    });
    const after = await svc.getToday(ctx("active-eligible"));
    expect(after.tasks.find((t) => t.id === task.id)!.status).toBe("OPEN");
  });

  it("rejects stale expectedVersion with VERSION_CONFLICT", async () => {
    const v = await svc.getToday(ctx("active-eligible"));
    const task = v.tasks.find((t) => t.completable)!;
    await expect(
      svc.updateTask(ctx("active-eligible"), task.id, { action: "complete", expectedVersion: 999 }),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  });

  it("validation-error variant rejects mutations", async () => {
    const v = await svc.getToday(ctx("active-eligible", "validation-error"));
    const task = v.tasks.find((t) => t.completable)!;
    await expect(
      svc.updateTask(ctx("active-eligible", "validation-error"), task.id, {
        action: "complete",
        expectedVersion: task.expectedVersion,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("forbidden and dependency-unavailable variants fail honestly", async () => {
    await expect(svc.getToday(ctx("active-eligible", "forbidden"))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(svc.getToday(ctx("active-eligible", "dependency-unavailable"))).rejects.toMatchObject({
      code: "DEPENDENCY_UNAVAILABLE",
    });
  });

  it("unknown-outcome returns durable PENDING op that resolves on poll", async () => {
    const c = ctx("active-eligible", "unknown-outcome");
    const v = await svc.getToday(c);
    const task = v.tasks.find((t) => t.completable)!;
    const receipt = await svc.updateTask(c, task.id, { action: "complete", expectedVersion: task.expectedVersion });
    expect(receipt.status).toBe("PENDING");
    const op1 = await svc.getOperation(c, receipt.operationId);
    expect(op1.status).toBe("PENDING");
    const op2 = await svc.getOperation(c, receipt.operationId);
    expect(op2.status).toBe("CONFIRMED");
    const after = await svc.getToday(c);
    expect(after.tasks.find((t) => t.id === task.id)!.status).toBe("COMPLETED");
  });

  it("empty and partial variants shape the view", async () => {
    const empty = await svc.getToday(ctx("active-eligible", "empty"));
    expect(empty.tasks).toHaveLength(0);
    const partial = await svc.getToday(ctx("active-eligible", "partial"));
    expect(partial.meta.partial).toBe(true);
  });

  it("state is isolated per actor boundary", async () => {
    const a = await svc.getToday(ctx("active-eligible", "normal", "actor-a"));
    const task = a.tasks.find((t) => t.completable)!;
    await svc.updateTask(ctx("active-eligible", "normal", "actor-a"), task.id, {
      action: "complete",
      expectedVersion: task.expectedVersion,
    });
    const aAfter = await svc.getToday(ctx("active-eligible", "normal", "actor-a"));
    const bAfter = await svc.getToday(ctx("active-eligible", "normal", "actor-b"));
    expect(aAfter.tasks.find((t) => t.id === task.id)!.status).toBe("COMPLETED");
    expect(bAfter.tasks.find((t) => t.id === task.id)!.status).toBe("OPEN");
  });
});

describe("view-model", () => {
  it("maps lifecycle+eligibility independently and hides insights when ineligible", async () => {
    const view = await svc.getToday(ctx("active-ineligible"));
    const vm = toTodayViewModel(view, false);
    expect(vm.showInsights).toBe(false);
    expect(vm.criticalBlockers.length).toBeGreaterThan(0);
  });

  it("shows insights only for active+eligible", async () => {
    const view = await svc.getToday(ctx("active-eligible"));
    const vm = toTodayViewModel(view, false);
    expect(vm.showInsights).toBe(true);
    expect(vm.state).toBe("READY");
  });

  it("maps loading/error states", () => {
    expect(toTodayViewModel(null, true).state).toBe("LOADING");
    expect(toTodayViewModel(null, false, "FORBIDDEN").state).toBe("PERMISSION_DENIED");
    expect(toTodayViewModel(null, false, "DEPENDENCY_UNAVAILABLE").state).toBe("DEPENDENCY_UNAVAILABLE");
  });
});

describe("lifecycle normalization + next best action", () => {
  it("mapLifecycle separates lifecycle from journey phase", async () => {
    const { mapLifecycle } = await import("./scenarios");
    expect(mapLifecycle("LEARNING")).toEqual({ agentLifecycle: "ONBOARDING", journeyPhase: "LEARNING" });
    expect(mapLifecycle("CERTIFICATION_PENDING").agentLifecycle).toBe("PENDING_ACTIVATION");
    expect(mapLifecycle("ACTIVE_INELIGIBLE").agentLifecycle).toBe("ACTIVE");
    expect(mapLifecycle("SUSPENDED").agentLifecycle).toBe("SUSPENDED");
  });

  it("nextBestAction recomputes after task completion", async () => {
    const { selectNextBestAction } = await import("./service");
    const view = await svc.getToday(ctx("active-eligible"));
    const first = view.nextBestAction;
    expect(first?.taskId).toBeTruthy();
    // Complete the NBA task, reload, expect a different or clear action
    const task = view.tasks.find((t) => t.id === first!.taskId)!;
    if (task.completable) {
      await svc.updateTask(ctx("active-eligible"), task.id, {
        action: "complete",
        expectedVersion: task.expectedVersion,
      });
    }
    const after = await svc.getToday(ctx("active-eligible"));
    const second = selectNextBestAction(after);
    expect(second?.taskId).not.toBe(first?.taskId);
  });

  it("critical blocker outranks regular tasks", async () => {
    const { selectNextBestAction } = await import("./service");
    const view = await svc.getToday(ctx("active-ineligible"));
    const nba = selectNextBestAction(view);
    expect(nba?.taskId).toBe("t-inel-1"); // CRITICAL remediation first
  });
});
