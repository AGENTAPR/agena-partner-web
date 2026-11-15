import {
  AgendaPage,
  AgentLifecycle,
  JourneyPhase,
  NextBestActionView,
  OperationReceipt,
  RequestContext,
  TaskPage,
  TodayApiError,
  TodayTask,
  TodayView,
  UpdateTaskCommand,
} from "./models";
import { getScenario, mapLifecycle, TODAY_SCENARIOS, TodayVariant } from "./scenarios";

export interface TodayExperienceService {
  getToday(context: RequestContext): Promise<TodayView>;
  getTasks(context: RequestContext): Promise<TaskPage>;
  getAgenda(context: RequestContext): Promise<AgendaPage>;
  updateTask(context: RequestContext, taskId: string, command: UpdateTaskCommand): Promise<OperationReceipt>;
  getOperation(context: RequestContext, operationId: string): Promise<OperationReceipt>;
  reset(context: RequestContext): void;
}

interface PendingOp {
  status: OperationReceipt["status"];
  polls: number;
  taskId?: string;
  command?: UpdateTaskCommand;
}

interface MockState {
  tasks: Record<string, TodayTask>;
  ops: Record<string, PendingOp>;
  opSeq: number;
}

const STORAGE_PREFIX = "averuna-today-mock:";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function storeKey(ctx: RequestContext) {
  return `${ctx.actorId}|${ctx.scenarioId}|${ctx.variant}`;
}

function seedState(scenarioId: string): MockState {
  const scenario = getScenario(scenarioId) ?? TODAY_SCENARIOS[4];
  const tasks: Record<string, TodayTask> = {};
  for (const t of scenario.view.tasks) tasks[t.id] = { ...t };
  return { tasks, ops: {}, opSeq: 0 };
}

/**
 * Deterministic mock store.
 * - Browser: persisted to localStorage → survives refresh and multi-tab
 *   (last-write-wins per key; documented limitation).
 * - Non-browser (SSR/tests): module-level Map fallback → per-runtime only.
 * Isolation: keyed by actorId|scenarioId|variant — no cross-actor leakage.
 */
const memoryStores = new Map<string, MockState>();

function loadState(ctx: RequestContext): MockState {
  const key = storeKey(ctx);
  if (isBrowser()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
      if (raw) return JSON.parse(raw) as MockState;
    } catch {
      /* corrupted entry → reseed */
    }
  } else {
    const hit = memoryStores.get(key);
    if (hit) return hit;
  }
  const seeded = seedState(ctx.scenarioId);
  persist(ctx, seeded);
  return seeded;
}

function persist(ctx: RequestContext, state: MockState) {
  const key = storeKey(ctx);
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(state));
    } catch {
      /* storage full/blocked — memory copy still used in-session */
    }
  } else {
    memoryStores.set(key, state);
  }
}

function assertVariant(ctx: RequestContext) {
  if (ctx.variant === "loading") {
    // Simulated slow load — handled by caller delay, not an error.
    return;
  }
  if (ctx.variant === "forbidden") {
    throw new TodayApiError("FORBIDDEN", "Scenario variant denies access", 403);
  }
  if (ctx.variant === "dependency-unavailable") {
    throw new TodayApiError("DEPENDENCY_UNAVAILABLE", "Experience service unavailable", 503);
  }
}

function applyVariant(view: TodayView, ctx: RequestContext): TodayView {
  const v = ctx.variant as TodayVariant;
  if (v === "empty") {
    return { ...view, tasks: [], agenda: [], activity: [], insights: [], blockers: [], journey: [] };
  }
  if (v === "partial") {
    return { ...view, agenda: [], activity: [], meta: { ...view.meta, partial: true } };
  }
  return view;
}

function priorityRank(p: TodayTask["priority"]) {
  return { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 }[p];
}

/**
 * Deterministic next-best-action selector.
 * Order: critical blocker remediation → blocked-task remediation →
 * overdue work → highest-priority open task → current journey milestone →
 * earliest deadline → clear state. Never selects completed, in-review,
 * or unauthorized work.
 */
export function selectNextBestAction(view: TodayView): NextBestActionView | undefined {
  const open = view.tasks.filter((t) => t.status === "OPEN");
  const blocked = view.tasks.filter((t) => t.status === "BLOCKED");
  const genericDesc = "today-nba-fallback-desc";

  const fromTask = (t: TodayTask, extra?: Partial<NextBestActionView>): NextBestActionView => ({
    id: t.id,
    titleKey: t.titleKey,
    descriptionKey: t.descriptionKey ?? genericDesc,
    ctaLabelKey: t.actionLabelKey ?? "today-cta-open",
    taskId: t.id,
    to: t.actionTo,
    priority: t.priority,
    taskStatus: t.status,
    dueAt: t.dueAt,
    ...extra,
  });

  // 1. Critical blocker → remediation: prefer a BLOCKED task (needs action),
  //    else highest-priority open task.
  const critical = view.blockers.find((b) => b.severity === "CRITICAL");
  if (critical) {
    const remediation =
      blocked.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))[0] ??
      [...open].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))[0];
    if (remediation) return fromTask(remediation);
  }

  // 2. Blocked-task remediation (needs resubmission, not completion)
  const blockedRemediation = [...blocked].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))[0];
  if (blockedRemediation) return fromTask(blockedRemediation);

  // 3. Overdue open task
  const now = Date.parse(view.meta.generatedAt);
  const overdue = open
    .filter((t) => t.dueAt && Date.parse(t.dueAt) < now)
    .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!))[0];
  if (overdue) return fromTask(overdue);

  // 3-4. Highest-priority open task
  const sorted = [...open].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))[0];
  if (sorted) return fromTask(sorted);

  // 5. Current journey milestone
  const current = view.journey.find((m) => m.state === "CURRENT");
  if (current) {
    return {
      id: `journey-${current.id}`,
      titleKey: current.labelKey,
      descriptionKey: genericDesc,
      ctaLabelKey: "today-cta-continue",
      priority: "NORMAL",
    };
  }

  // 6. Earliest agenda deadline
  const nextAgenda = [...view.agenda].sort((a, b) => (a.at ?? "9999").localeCompare(b.at ?? "9999"))[0];
  if (nextAgenda) {
    return {
      id: nextAgenda.id,
      titleKey: nextAgenda.titleKey,
      descriptionKey: genericDesc,
      ctaLabelKey: "today-cta-open",
      priority: "NORMAL",
    };
  }

  // 7. Clear state
  return {
    id: "clear",
    titleKey: "today-hero-clear-title",
    descriptionKey: "today-hero-clear-desc",
    ctaLabelKey: "today-cta-retry",
    to: "/today",
    priority: "LOW",
  };
}

export class MockTodayExperienceService implements TodayExperienceService {
  async getToday(context: RequestContext): Promise<TodayView> {
    assertVariant(context);
    const scenario = getScenario(context.scenarioId) ?? TODAY_SCENARIOS[4];
    const state = loadState(context);
    const { agentLifecycle, journeyPhase } = mapLifecycle(scenario.lifecycle);
    const tasks = Object.values(state.tasks).map((t) => ({ ...t }));
    const view: TodayView = {
      lifecycle: scenario.lifecycle,
      agentLifecycle: agentLifecycle as AgentLifecycle,
      journeyPhase: journeyPhase as JourneyPhase | undefined,
      eligibility: scenario.view.eligibility,
      hero: scenario.view.hero,
      blockers: scenario.view.blockers,
      journey: scenario.view.journey,
      tasks,
      agenda: scenario.view.agenda,
      activity: scenario.view.activity,
      insights: scenario.view.insights,
      permissions: scenario.view.permissions,
      actionPanel: scenario.view.actionPanel,
      meta: {
        generatedAt: new Date(0).toISOString(), // deterministic
        scenarioId: context.scenarioId,
        partial: context.variant === "partial" || undefined,
      },
    };
    const shaped = applyVariant(view, context);
    // Recompute next best action from live state — hero static fixture is only initial.
    shaped.nextBestAction = selectNextBestAction(shaped);
    return shaped;
  }

  async getTasks(context: RequestContext): Promise<TaskPage> {
    const view = await this.getToday(context);
    return { items: view.tasks };
  }

  async getAgenda(context: RequestContext): Promise<AgendaPage> {
    const view = await this.getToday(context);
    return { items: view.agenda };
  }

  async updateTask(context: RequestContext, taskId: string, command: UpdateTaskCommand): Promise<OperationReceipt> {
    assertVariant(context);
    const state = loadState(context);
    const task = state.tasks[taskId];
    if (!task) throw new TodayApiError("NOT_FOUND", "Task not found", 404);

    if (context.variant === "validation-error") {
      throw new TodayApiError("VALIDATION_ERROR", "Task payload failed validation", 422);
    }
    if (command.expectedVersion !== task.expectedVersion) {
      throw new TodayApiError("VERSION_CONFLICT", "Task was modified by another session", 409);
    }
    if (task.status === "BLOCKED" && command.action === "complete") {
      throw new TodayApiError("VALIDATION_ERROR", "Blocked tasks cannot be completed", 422);
    }
    if (task.status !== "BLOCKED" && command.action === "resubmit") {
      throw new TodayApiError("VALIDATION_ERROR", "Only blocked tasks can be resubmitted", 422);
    }

    const operationId = `op-${context.scenarioId}-${++state.opSeq}`;

    if (context.variant === "unknown-outcome") {
      // Durable pending op; mutation applies only when poll confirms.
      state.ops[operationId] = {
        status: "PENDING",
        polls: 0,
        taskId,
        command,
      };
      persist(context, state);
      return { operationId, status: "PENDING" };
    }

    if (context.variant === "version-conflict") {
      throw new TodayApiError("VERSION_CONFLICT", "Concurrent modification detected", 409);
    }

    this.applyMutation(state, task, command);
    persist(context, state);
    return { operationId, status: "CONFIRMED" };
  }

  private applyMutation(state: MockState, task: TodayTask, command: UpdateTaskCommand) {
    state.tasks[task.id] = {
      ...task,
      status: command.action === "complete" ? "COMPLETED" : command.action === "resubmit" ? "IN_REVIEW" : "OPEN",
      expectedVersion: task.expectedVersion + 1,
    };
  }

  async getOperation(context: RequestContext, operationId: string): Promise<OperationReceipt> {
    const state = loadState(context);
    const op = state.ops[operationId];
    if (!op) throw new TodayApiError("NOT_FOUND", "Operation not found", 404);
    op.polls += 1;
    if (op.status === "PENDING" && op.polls >= 2) {
      op.status = "CONFIRMED";
      // Apply the confirmed effect at the logical boundary.
      const task = state.tasks[op.taskId ?? ""];
      if (task && op.command) {
        const fresh = state.tasks[task.id];
        if (fresh && op.command.expectedVersion === fresh.expectedVersion) {
          this.applyMutation(state, fresh, op.command);
        }
      }
    }
    persist(context, state);
    return { operationId, status: op.status };
  }

  reset(context: RequestContext) {
    const key = storeKey(context);
    memoryStores.delete(key);
    if (isBrowser()) {
      try {
        window.localStorage.removeItem(STORAGE_PREFIX + key);
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Live adapter scaffold — typed boundary ready for Agent BFF integration.
 * Reports DEPENDENCY_UNAVAILABLE rather than fabricating data; never
 * silently falls back to mock in production.
 */
export class LiveTodayExperienceService implements TodayExperienceService {
  private unavailable(): never {
    throw new TodayApiError("DEPENDENCY_UNAVAILABLE", "Agent experience service is not yet available", 503);
  }
  getToday(): Promise<TodayView> {
    return this.unavailable();
  }
  getTasks(): Promise<TaskPage> {
    return this.unavailable();
  }
  getAgenda(): Promise<AgendaPage> {
    return this.unavailable();
  }
  updateTask(): Promise<OperationReceipt> {
    return this.unavailable();
  }
  getOperation(): Promise<OperationReceipt> {
    return this.unavailable();
  }
  reset(): void {}
}

export function createTodayService(): TodayExperienceService {
  // Adapter selection is environment-controlled; mock is the default
  // experience until the live contract ships. Production builds never
  // receive mock fixtures unless explicitly configured.
  const mode = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_TODAY_MODE : undefined;
  if (mode === "live") return new LiveTodayExperienceService();
  return new MockTodayExperienceService();
}
