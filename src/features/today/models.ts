/**
 * Agent Today (F-02) contract models.
 * Mirrors AGENA_FRONTEND_API_CONTRACT_V1 envelope: { data, meta }.
 * Synthetic/mock data only — no production PII.
 */

/** Normalized agent lifecycle — independent of selling eligibility. */
export type AgentLifecycle =
  "CANDIDATE" | "ONBOARDING" | "PENDING_ACTIVATION" | "ACTIVE" | "SUSPENDED" | "OFFBOARDING" | "TERMINATED";

/** Journey phases are presentation states, not lifecycle enum values. */
export type JourneyPhase = "LEARNING" | "CERTIFICATION_PENDING" | "READY";

/** Eight experience scenarios — UI-level, not lifecycle enums. */
export type TodayScenarioId =
  | "candidate"
  | "onboarding"
  | "learning"
  | "certification-pending"
  | "active-eligible"
  | "active-ineligible"
  | "suspended"
  | "offboarding";

export type SellingEligibility = "ELIGIBLE" | "INELIGIBLE" | "NOT_APPLICABLE";

/** Contract-level lifecycle strings (pre-normalization values). */
export type LifecycleStatus =
  | "CANDIDATE"
  | "ONBOARDING"
  | "LEARNING"
  | "CERTIFICATION_PENDING"
  | "ACTIVE_ELIGIBLE"
  | "ACTIVE_INELIGIBLE"
  | "SUSPENDED"
  | "OFFBOARDING";

export type TaskStatus = "OPEN" | "COMPLETED" | "BLOCKED" | "IN_REVIEW";
export type TaskPriority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";

export interface TodayTask {
  id: string;
  titleKey: string;
  descriptionKey?: string;
  kind: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string;
  /** Optimistic-concurrency token; required on mutations. */
  expectedVersion: number;
  /** In-app destination when the task is actionable. */
  actionTo?: string;
  actionLabelKey?: string;
  /** When true the task may be marked complete by the agent. */
  completable: boolean;
}

export interface TodayBlocker {
  id: string;
  titleKey: string;
  descriptionKey: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
}

export type JourneyState = "DONE" | "CURRENT" | "UPCOMING" | "BLOCKED";

export interface JourneyMilestone {
  id: string;
  labelKey: string;
  state: JourneyState;
}

export interface AgendaItem {
  id: string;
  titleKey: string;
  kind: "APPOINTMENT" | "DEADLINE" | "REMINDER";
  at?: string;
}

export interface ActivityItem {
  id: string;
  titleKey: string;
  at?: string;
}

export interface BusinessInsight {
  id: string;
  labelKey: string;
  valueKey: string;
  to?: string;
  /** NextureIcon component name for the stat tile. */
  iconKey?: string;
}

/** Today-scoped contextual action — a mock interaction completed inside Today. */
export interface TodayActionStep {
  id: string;
  labelKey: string;
  descriptionKey?: string;
}

export interface TodayActionPanel {
  titleKey: string;
  descriptionKey: string;
  steps: TodayActionStep[];
  /** Task completed when the panel action succeeds. */
  taskId: string;
  submitLabelKey: string;
  /** Result copy shown after success — honest, not authoritative. */
  resultKey: string;
}

export interface TodayHeroCta {
  labelKey: string;
  /** In-app route destination. */
  to?: string;
  /** Or a task command handled by the mock service. */
  taskId?: string;
}

export interface TodayHero {
  titleKey: string;
  descriptionKey: string;
  statusKey?: string;
  cta: TodayHeroCta;
  progressLabelKey?: string;
}

/** Immutable hero model — title, description, CTA all from one source. */
export interface NextBestActionView {
  id: string;
  titleKey: string;
  descriptionKey: string;
  ctaLabelKey: string;
  taskId?: string;
  to?: string;
  priority: TaskPriority;
  taskStatus?: TaskStatus;
  dueAt?: string;
  /** True when the action opens the contextual panel instead of a route/task toggle. */
  opensPanel?: boolean;
}

export interface DisplayPermissions {
  canSell: boolean;
  canUpdateTasks: boolean;
  canViewEarnings: boolean;
  canViewTeam: boolean;
}

export interface TodayView {
  /** Normalized lifecycle derived from the scenario. */
  agentLifecycle: AgentLifecycle;
  /** Journey phase within onboarding/activation. */
  journeyPhase?: JourneyPhase;
  /** Original contract lifecycle string kept for adapter mapping. */
  lifecycle: LifecycleStatus;
  /** Today-scoped contextual action panel (mock interactions). */
  actionPanel?: TodayActionPanel;
  /** Recomputed next-best-action — complete immutable presentation model. */
  nextBestAction?: NextBestActionView;
  /** Synthetic display identity for the mock actor (dev scenarios). */
  agentNameKey?: string;
  eligibility: SellingEligibility;
  hero: TodayHero;
  blockers: TodayBlocker[];
  journey: JourneyMilestone[];
  tasks: TodayTask[];
  agenda: AgendaItem[];
  activity: ActivityItem[];
  insights: BusinessInsight[];
  permissions: DisplayPermissions;
  meta: { generatedAt: string; partial?: boolean; scenarioId: string };
}

export interface TaskPage {
  items: TodayTask[];
  nextCursor?: string;
}

export interface AgendaPage {
  items: AgendaItem[];
}

export interface UpdateTaskCommand {
  action: "complete" | "reopen" | "resubmit";
  expectedVersion: number;
}

export type OperationStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "REQUIRES_REVIEW";

export interface OperationReceipt {
  operationId: string;
  status: OperationStatus;
}

/** Normalized error envelope shared by mock and live adapters. */
export class TodayApiError extends Error {
  constructor(
    public readonly code:
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION_ERROR"
      | "VERSION_CONFLICT"
      | "DEPENDENCY_UNAVAILABLE"
      | "UNKNOWN_OUTCOME",
    message: string,
    public readonly status = 500,
  ) {
    super(message);
    this.name = "TodayApiError";
  }
}

export interface RequestContext {
  /** Synthetic actor id — never a real credential. */
  actorId: string;
  scenarioId: string;
  variant: string;
  requestId: string;
}
