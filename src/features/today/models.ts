/**
 * Agent Today (F-02) contract models.
 * Mirrors AGENA_FRONTEND_API_CONTRACT_V1 envelope: { data, meta }.
 * Synthetic/mock data only — no production PII.
 */

export type LifecycleStatus =
  | "CANDIDATE"
  | "ONBOARDING"
  | "LEARNING"
  | "CERTIFICATION_PENDING"
  | "ACTIVE_ELIGIBLE"
  | "ACTIVE_INELIGIBLE"
  | "SUSPENDED"
  | "OFFBOARDING";

export type SellingEligibility = "ELIGIBLE" | "INELIGIBLE" | "NOT_APPLICABLE";

export type TaskStatus = "OPEN" | "COMPLETED" | "BLOCKED";
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

export interface DisplayPermissions {
  canSell: boolean;
  canUpdateTasks: boolean;
  canViewEarnings: boolean;
  canViewTeam: boolean;
}

export interface TodayView {
  lifecycle: LifecycleStatus;
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
  action: "complete" | "reopen";
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
