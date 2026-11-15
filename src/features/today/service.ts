import {
  AgendaPage,
  OperationReceipt,
  RequestContext,
  TaskPage,
  TodayApiError,
  TodayTask,
  TodayView,
  UpdateTaskCommand,
} from "./models";
import { getScenario, TODAY_SCENARIOS, TodayVariant } from "./scenarios";

export interface TodayExperienceService {
  getToday(context: RequestContext): Promise<TodayView>;
  getTasks(context: RequestContext): Promise<TaskPage>;
  getAgenda(context: RequestContext): Promise<AgendaPage>;
  updateTask(context: RequestContext, taskId: string, command: UpdateTaskCommand): Promise<OperationReceipt>;
  getOperation(context: RequestContext, operationId: string): Promise<OperationReceipt>;
  reset(context: RequestContext): void;
}

interface MockState {
  tasks: Map<string, TodayTask>;
  ops: Map<string, { status: OperationReceipt["status"]; polls: number }>;
  opSeq: number;
}

/**
 * Deterministic, in-memory mock store.
 * Persistence: module-level Map keyed by actor+scenario+variant — survives
 * SPA navigation and HMR within the same runtime, resets on reload/Worker
 * isolate recycle. Suitable for dev/tests; NOT durable across deploys.
 */
const stores = new Map<string, MockState>();

function storeKey(ctx: RequestContext) {
  return `${ctx.actorId}|${ctx.scenarioId}|${ctx.variant}`;
}

function getStore(ctx: RequestContext, scenarioId = ctx.scenarioId): MockState {
  const key = `${ctx.actorId}|${scenarioId}|${ctx.variant}`;
  let s = stores.get(key);
  if (!s) {
    const scenario = getScenario(scenarioId) ?? TODAY_SCENARIOS[4];
    s = {
      tasks: new Map(scenario.view.tasks.map((t) => [t.id, { ...t }])),
      ops: new Map(),
      opSeq: 0,
    };
    stores.set(key, s);
  }
  return s;
}

function assertVariant(ctx: RequestContext, variant: TodayVariant) {
  if (ctx.variant === "forbidden") {
    throw new TodayApiError("FORBIDDEN", "Scenario variant denies access", 403);
  }
  if (ctx.variant === "dependency-unavailable") {
    throw new TodayApiError("DEPENDENCY_UNAVAILABLE", "Experience service unavailable", 503);
  }
  void variant;
}

function applyVariant(view: TodayView, ctx: RequestContext): TodayView {
  const v = ctx.variant as TodayVariant;
  if (v === "empty") {
    return { ...view, tasks: [], agenda: [], activity: [], insights: [], blockers: [], journey: [] };
  }
  if (v === "partial") {
    return { ...view, agenda: [], meta: { ...view.meta, partial: true } };
  }
  return view;
}

export class MockTodayExperienceService implements TodayExperienceService {
  async getToday(context: RequestContext): Promise<TodayView> {
    assertVariant(context, context.variant as TodayVariant);
    const scenario = getScenario(context.scenarioId) ?? TODAY_SCENARIOS[4];
    const store = getStore(context);
    const tasks = [...store.tasks.values()].map((t) => ({ ...t }));
    const view: TodayView = {
      ...scenario.view,
      tasks,
      meta: {
        generatedAt: new Date(0).toISOString(), // deterministic
        scenarioId: context.scenarioId,
        partial: context.variant === "partial" || undefined,
      },
    };
    return applyVariant(view, context);
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
    assertVariant(context, context.variant as TodayVariant);
    const store = getStore(context);
    const task = store.tasks.get(taskId);
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

    const operationId = `op-${context.scenarioId}-${++store.opSeq}`;

    if (context.variant === "unknown-outcome") {
      // Durable pending op — resolution happens via getOperation polling.
      store.ops.set(operationId, { status: "PENDING", polls: 0 });
      // Still apply the mutation so a later confirmed poll reflects it.
      this.applyMutation(store, task, command);
      return { operationId, status: "PENDING" };
    }

    if (context.variant === "version-conflict") {
      // Simulate a lost-update race: apply anyway? No — report conflict.
      throw new TodayApiError("VERSION_CONFLICT", "Concurrent modification detected", 409);
    }

    this.applyMutation(store, task, command);
    return { operationId, status: "CONFIRMED" };
  }

  private applyMutation(store: MockState, task: TodayTask, command: UpdateTaskCommand) {
    const next =
      command.action === "complete"
        ? { ...task, status: "COMPLETED" as const, expectedVersion: task.expectedVersion + 1 }
        : { ...task, status: "OPEN" as const, expectedVersion: task.expectedVersion + 1 };
    store.tasks.set(task.id, next);
  }

  async getOperation(context: RequestContext, operationId: string): Promise<OperationReceipt> {
    const store = getStore(context);
    const op = store.ops.get(operationId);
    if (!op) throw new TodayApiError("NOT_FOUND", "Operation not found", 404);
    op.polls += 1;
    // Deterministic resolution: confirmed on 2nd poll.
    if (op.status === "PENDING" && op.polls >= 2) {
      op.status = "CONFIRMED";
    }
    return { operationId, status: op.status };
  }

  reset(context: RequestContext) {
    stores.delete(storeKey(context));
  }
}

/**
 * Live adapter scaffold — typed boundary ready for Agent BFF integration.
 * Until the contract is deployed it reports DEPENDENCY_UNAVAILABLE rather
 * than fabricating data.
 */
export class LiveTodayExperienceService implements TodayExperienceService {
  private unavailable(): never {
    throw new TodayApiError("DEPENDENCY_UNAVAILABLE", "Agent BFF today endpoints are not yet available", 503);
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
  // Mock-first: live adapter activates once BFF contract ships.
  return new MockTodayExperienceService();
}
