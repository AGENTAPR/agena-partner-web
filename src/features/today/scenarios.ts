import type { AgentLifecycle, JourneyPhase, LifecycleStatus, TodayView } from "./models";

export interface TodayScenario {
  id: string;
  lifecycle: LifecycleStatus;
  labelKey: string;
  /** Base fixture; the mock store clones it per actor+variant. */
  view: ScenarioView;
}

const basePermissions = {
  canSell: false,
  canUpdateTasks: true,
  canViewEarnings: false,
  canViewTeam: false,
};

type ScenarioView = Omit<TodayView, "meta" | "agentLifecycle" | "journeyPhase" | "nextBestAction">;

function mk(partial: ScenarioView): ScenarioView {
  return partial;
}

/** Map contract lifecycle string → normalized lifecycle + journey phase. */
export function mapLifecycle(status: LifecycleStatus): {
  agentLifecycle: AgentLifecycle;
  journeyPhase?: JourneyPhase;
} {
  switch (status) {
    case "CANDIDATE":
      return { agentLifecycle: "CANDIDATE" };
    case "ONBOARDING":
      return { agentLifecycle: "ONBOARDING" };
    case "LEARNING":
      return { agentLifecycle: "ONBOARDING", journeyPhase: "LEARNING" };
    case "CERTIFICATION_PENDING":
      return { agentLifecycle: "PENDING_ACTIVATION", journeyPhase: "CERTIFICATION_PENDING" };
    case "ACTIVE_ELIGIBLE":
    case "ACTIVE_INELIGIBLE":
      return { agentLifecycle: "ACTIVE" };
    case "SUSPENDED":
      return { agentLifecycle: "SUSPENDED" };
    case "OFFBOARDING":
      return { agentLifecycle: "OFFBOARDING" };
  }
}

const JOURNEY_BASE = [
  { id: "apply", labelKey: "today-journey-apply", state: "DONE" as const },
  { id: "learn", labelKey: "today-journey-learn", state: "UPCOMING" as const },
  { id: "certify", labelKey: "today-journey-certify", state: "UPCOMING" as const },
  { id: "activate", labelKey: "today-journey-activate", state: "UPCOMING" as const },
];

const JOURNEY_ACTIVE = [
  { id: "apply", labelKey: "today-journey-apply", state: "DONE" as const },
  { id: "learn", labelKey: "today-journey-learn", state: "DONE" as const },
  { id: "certify", labelKey: "today-journey-certify", state: "DONE" as const },
  { id: "activate", labelKey: "today-journey-activate", state: "DONE" as const },
];

export const TODAY_SCENARIOS: TodayScenario[] = [
  {
    id: "candidate",
    lifecycle: "CANDIDATE",
    labelKey: "today-scenario-candidate",
    view: mk({
      lifecycle: "CANDIDATE",
      eligibility: "NOT_APPLICABLE",
      agentNameKey: "today-agent-candidate",
      hero: {
        titleKey: "today-hero-candidate-title",
        descriptionKey: "today-hero-candidate-desc",
        cta: { labelKey: "today-cta-continue-application", to: "/development/onboarding" },
        progressLabelKey: "today-hero-candidate-progress",
      },
      blockers: [],
      journey: JOURNEY_BASE.map((m) => (m.id === "apply" ? { ...m, state: "CURRENT" as const } : m)),
      tasks: [
        {
          id: "t-apply-1",
          descriptionKey: "today-task-app-form-desc",
          titleKey: "today-task-application-form",
          kind: "APPLICATION",
          status: "OPEN",
          priority: "CRITICAL",
          expectedVersion: 1,
          completable: true,
          actionTo: "/development/onboarding",
          actionLabelKey: "today-cta-continue",
        },
        {
          id: "t-apply-2",
          titleKey: "today-task-upload-id",
          kind: "DOCUMENT",
          status: "OPEN",
          priority: "HIGH",
          expectedVersion: 1,
          completable: false,
        },
      ],
      agenda: [],
      activity: [{ id: "a-1", titleKey: "today-activity-application-created" }],
      insights: [],
      permissions: { ...basePermissions, canUpdateTasks: true },
      actionPanel: {
        titleKey: "today-panel-candidate-title",
        descriptionKey: "today-panel-candidate-desc",
        steps: [
          { id: "s1", labelKey: "today-panel-candidate-s1" },
          { id: "s2", labelKey: "today-panel-candidate-s2" },
        ],
        taskId: "t-apply-1",
        submitLabelKey: "today-panel-submit",
        resultKey: "today-panel-candidate-result",
      },
    }),
  },
  {
    id: "onboarding",
    lifecycle: "ONBOARDING",
    labelKey: "today-scenario-onboarding",
    view: mk({
      lifecycle: "ONBOARDING",
      eligibility: "NOT_APPLICABLE",
      agentNameKey: "today-agent-onboarding",
      hero: {
        titleKey: "today-hero-onboarding-title",
        descriptionKey: "today-hero-onboarding-desc",
        statusKey: "today-hero-onboarding-status",
        cta: { labelKey: "today-cta-replace-document", to: "/development/onboarding" },
      },
      blockers: [
        {
          id: "b-1",
          titleKey: "today-blocker-doc-rejected",
          descriptionKey: "today-blocker-doc-rejected-desc",
          severity: "WARNING",
        },
      ],
      journey: JOURNEY_BASE.map((m) => (m.id === "apply" ? { ...m, state: "CURRENT" as const } : m)),
      tasks: [
        {
          id: "t-onb-1",
          descriptionKey: "today-task-replace-cert-desc",
          titleKey: "today-task-replace-cert",
          kind: "DOCUMENT",
          status: "BLOCKED",
          priority: "CRITICAL",
          expectedVersion: 2,
          completable: false,
          actionTo: "/development/onboarding",
          actionLabelKey: "today-cta-replace-document",
        },
        {
          id: "t-onb-2",
          titleKey: "today-task-sign-agreement",
          kind: "ADMIN",
          status: "OPEN",
          priority: "HIGH",
          expectedVersion: 1,
          completable: true,
        },
      ],
      agenda: [{ id: "g-1", titleKey: "today-agenda-orientation", kind: "APPOINTMENT" }],
      activity: [{ id: "a-1", titleKey: "today-activity-doc-submitted" }],
      insights: [],
      permissions: { ...basePermissions },
      actionPanel: {
        titleKey: "today-panel-onboarding-title",
        descriptionKey: "today-panel-onboarding-desc",
        steps: [
          { id: "s1", labelKey: "today-panel-onboarding-s1" },
          { id: "s2", labelKey: "today-panel-onboarding-s2" },
        ],
        taskId: "t-onb-1",
        submitLabelKey: "today-panel-submit",
        resultKey: "today-panel-onboarding-result",
      },
    }),
  },
  {
    id: "learning",
    lifecycle: "LEARNING",
    labelKey: "today-scenario-learning",
    view: mk({
      lifecycle: "LEARNING",
      eligibility: "NOT_APPLICABLE",
      agentNameKey: "today-agent-learning",
      hero: {
        titleKey: "today-hero-learning-title",
        descriptionKey: "today-hero-learning-desc",
        cta: { labelKey: "today-cta-resume-lesson", to: "/development/learning" },
        progressLabelKey: "today-hero-learning-progress",
      },
      blockers: [],
      journey: [
        { id: "apply", labelKey: "today-journey-apply", state: "DONE" },
        { id: "learn", labelKey: "today-journey-learn", state: "CURRENT" },
        { id: "certify", labelKey: "today-journey-certify", state: "UPCOMING" },
        { id: "activate", labelKey: "today-journey-activate", state: "UPCOMING" },
      ],
      tasks: [
        {
          id: "t-learn-1",
          descriptionKey: "today-task-module-desc",
          titleKey: "today-task-mandatory-module",
          kind: "LEARNING",
          status: "OPEN",
          priority: "HIGH",
          expectedVersion: 1,
          completable: true,
          actionTo: "/development/learning",
          actionLabelKey: "today-cta-resume",
        },
        {
          id: "t-learn-2",
          titleKey: "today-task-quiz",
          kind: "ASSESSMENT",
          status: "OPEN",
          priority: "NORMAL",
          expectedVersion: 1,
          completable: false,
          actionTo: "/development/learning",
        },
      ],
      agenda: [],
      activity: [{ id: "a-1", titleKey: "today-activity-course-enrolled" }],
      insights: [],
      permissions: { ...basePermissions },
      actionPanel: {
        titleKey: "today-panel-learning-title",
        descriptionKey: "today-panel-learning-desc",
        steps: [
          { id: "s1", labelKey: "today-panel-learning-s1" },
          { id: "s2", labelKey: "today-panel-learning-s2" },
        ],
        taskId: "t-learn-1",
        submitLabelKey: "today-panel-submit",
        resultKey: "today-panel-learning-result",
      },
    }),
  },
  {
    id: "certification-pending",
    lifecycle: "CERTIFICATION_PENDING",
    labelKey: "today-scenario-cert-pending",
    view: mk({
      lifecycle: "CERTIFICATION_PENDING",
      eligibility: "NOT_APPLICABLE",
      agentNameKey: "today-agent-cert",
      hero: {
        titleKey: "today-hero-cert-title",
        descriptionKey: "today-hero-cert-desc",
        statusKey: "today-hero-cert-status",
        cta: { labelKey: "today-cta-view-verification", to: "/development/certifications" },
      },
      blockers: [],
      journey: [
        { id: "apply", labelKey: "today-journey-apply", state: "DONE" },
        { id: "learn", labelKey: "today-journey-learn", state: "DONE" },
        { id: "certify", labelKey: "today-journey-certify", state: "CURRENT" },
        { id: "activate", labelKey: "today-journey-activate", state: "UPCOMING" },
      ],
      tasks: [
        {
          id: "t-cert-1",
          titleKey: "today-task-cert-verification",
          kind: "CERTIFICATION",
          status: "OPEN",
          priority: "HIGH",
          expectedVersion: 1,
          completable: false,
          actionTo: "/development/certifications",
        },
      ],
      agenda: [],
      activity: [{ id: "a-1", titleKey: "today-activity-assessment-passed" }],
      insights: [],
      permissions: { ...basePermissions },
      actionPanel: {
        titleKey: "today-panel-cert-title",
        descriptionKey: "today-panel-cert-desc",
        steps: [{ id: "s1", labelKey: "today-panel-cert-s1" }],
        taskId: "t-cert-1",
        submitLabelKey: "today-panel-submit",
        resultKey: "today-panel-cert-result",
      },
    }),
  },
  {
    id: "active-eligible",
    lifecycle: "ACTIVE_ELIGIBLE",
    labelKey: "today-scenario-active-eligible",
    view: mk({
      lifecycle: "ACTIVE_ELIGIBLE",
      agentNameKey: "today-agent-active",
      eligibility: "ELIGIBLE",
      hero: {
        titleKey: "today-hero-active-title",
        descriptionKey: "today-hero-active-desc",
        cta: { labelKey: "today-cta-urgent-proposal", to: "/sales/proposals" },
      },
      blockers: [],
      journey: JOURNEY_ACTIVE,
      tasks: [
        {
          id: "t-act-1",
          descriptionKey: "today-task-urgent-desc",
          titleKey: "today-task-urgent-proposal",
          kind: "PROPOSAL",
          status: "OPEN",
          priority: "CRITICAL",
          dueAt: "2026-11-20",
          expectedVersion: 3,
          completable: true,
          actionTo: "/sales/proposals",
          actionLabelKey: "today-cta-open",
        },
        {
          id: "t-act-2",
          descriptionKey: "today-task-followup-desc",
          titleKey: "today-task-customer-followup",
          kind: "FOLLOW_UP",
          status: "OPEN",
          priority: "HIGH",
          expectedVersion: 1,
          completable: true,
          actionTo: "/customers",
        },
        {
          id: "t-act-3",
          titleKey: "today-task-app-docs",
          kind: "DOCUMENT",
          status: "OPEN",
          priority: "NORMAL",
          expectedVersion: 1,
          completable: false,
          actionTo: "/sales/applications",
        },
      ],
      agenda: [
        { id: "g-1", titleKey: "today-agenda-client-meeting", kind: "APPOINTMENT", at: "2026-11-18T09:00:00Z" },
        { id: "g-2", titleKey: "today-agenda-renewal-deadline", kind: "DEADLINE", at: "2026-11-25" },
      ],
      activity: [
        { id: "a-1", titleKey: "today-activity-policy-issued" },
        { id: "a-2", titleKey: "today-activity-commission-posted" },
      ],
      insights: [
        { id: "i-1", labelKey: "today-insight-pending-proposals", valueKey: "3", to: "/sales/proposals" },
        { id: "i-2", labelKey: "today-insight-upcoming-renewals", valueKey: "2", to: "/portfolio/renewals" },
        { id: "i-3", labelKey: "today-insight-claims-docs", valueKey: "1", to: "/portfolio/claims" },
      ],
      permissions: { ...basePermissions, canSell: true, canViewEarnings: true },
      actionPanel: {
        titleKey: "today-panel-active-title",
        descriptionKey: "today-panel-active-desc",
        steps: [{ id: "s1", labelKey: "today-panel-active-s1" }],
        taskId: "t-act-2",
        submitLabelKey: "today-panel-submit",
        resultKey: "today-panel-active-result",
      },
    }),
  },
  {
    id: "active-ineligible",
    lifecycle: "ACTIVE_ELIGIBLE",
    labelKey: "today-scenario-active-ineligible",
    view: mk({
      lifecycle: "ACTIVE_ELIGIBLE",
      agentNameKey: "today-agent-active",
      eligibility: "INELIGIBLE",
      hero: {
        titleKey: "today-hero-ineligible-title",
        descriptionKey: "today-hero-ineligible-desc",
        statusKey: "today-hero-ineligible-status",
        cta: { labelKey: "today-cta-view-eligibility", to: "/development/eligibility" },
      },
      blockers: [
        {
          id: "b-1",
          titleKey: "today-blocker-cpd-shortfall",
          descriptionKey: "today-blocker-cpd-desc",
          severity: "CRITICAL",
        },
        {
          id: "b-2",
          titleKey: "today-blocker-cert-expiry",
          descriptionKey: "today-blocker-cert-desc",
          severity: "WARNING",
        },
      ],
      journey: JOURNEY_ACTIVE,
      tasks: [
        {
          id: "t-inel-1",
          descriptionKey: "today-task-cpd-desc",
          titleKey: "today-task-complete-cpd",
          kind: "CPD",
          status: "OPEN",
          priority: "CRITICAL",
          expectedVersion: 1,
          completable: true,
          actionTo: "/development/cpd",
        },
        {
          id: "t-inel-2",
          titleKey: "today-task-renew-cert",
          kind: "CERTIFICATION",
          status: "OPEN",
          priority: "HIGH",
          expectedVersion: 1,
          completable: false,
          actionTo: "/development/certifications",
        },
      ],
      agenda: [],
      activity: [{ id: "a-1", titleKey: "today-activity-eligibility-changed" }],
      insights: [],
      permissions: { ...basePermissions, canSell: false, canViewEarnings: true },
      actionPanel: {
        titleKey: "today-panel-ineligible-title",
        descriptionKey: "today-panel-ineligible-desc",
        steps: [
          { id: "s1", labelKey: "today-panel-ineligible-s1" },
          { id: "s2", labelKey: "today-panel-ineligible-s2" },
        ],
        taskId: "t-inel-1",
        submitLabelKey: "today-panel-submit",
        resultKey: "today-panel-ineligible-result",
      },
    }),
  },
  {
    id: "suspended",
    lifecycle: "SUSPENDED",
    labelKey: "today-scenario-suspended",
    view: mk({
      lifecycle: "SUSPENDED",
      eligibility: "NOT_APPLICABLE",
      agentNameKey: "today-agent-suspended",
      hero: {
        titleKey: "today-hero-suspended-title",
        descriptionKey: "today-hero-suspended-desc",
        statusKey: "today-hero-suspended-status",
        cta: { labelKey: "today-cta-review-case", to: "/support/tickets" },
      },
      blockers: [
        {
          id: "b-1",
          titleKey: "today-blocker-suspension",
          descriptionKey: "today-blocker-suspension-desc",
          severity: "CRITICAL",
        },
      ],
      journey: JOURNEY_ACTIVE,
      tasks: [
        {
          id: "t-sus-1",
          descriptionKey: "today-task-respond-desc",
          titleKey: "today-task-respond-case",
          kind: "CASE",
          status: "OPEN",
          priority: "CRITICAL",
          expectedVersion: 1,
          completable: true,
          actionTo: "/support/tickets",
        },
        {
          id: "t-sus-2",
          titleKey: "today-task-handover-notes",
          kind: "HANDOVER",
          status: "OPEN",
          priority: "NORMAL",
          expectedVersion: 1,
          completable: true,
        },
      ],
      agenda: [],
      activity: [{ id: "a-1", titleKey: "today-activity-status-changed" }],
      insights: [],
      permissions: { ...basePermissions, canViewEarnings: true },
      actionPanel: {
        titleKey: "today-panel-suspended-title",
        descriptionKey: "today-panel-suspended-desc",
        steps: [{ id: "s1", labelKey: "today-panel-suspended-s1" }],
        taskId: "t-sus-1",
        submitLabelKey: "today-panel-submit",
        resultKey: "today-panel-suspended-result",
      },
    }),
  },
  {
    id: "offboarding",
    lifecycle: "OFFBOARDING",
    labelKey: "today-scenario-offboarding",
    view: mk({
      lifecycle: "OFFBOARDING",
      eligibility: "NOT_APPLICABLE",
      agentNameKey: "today-agent-offboard",
      hero: {
        titleKey: "today-hero-offboard-title",
        descriptionKey: "today-hero-offboard-desc",
        cta: { labelKey: "today-cta-continue-handover", to: "/portfolio/servicing" },
      },
      blockers: [],
      journey: JOURNEY_ACTIVE.map((m) => ({ ...m, state: "DONE" as const })),
      tasks: [
        {
          id: "t-off-1",
          descriptionKey: "today-task-handover-desc",
          titleKey: "today-task-handover-customers",
          kind: "HANDOVER",
          status: "OPEN",
          priority: "HIGH",
          expectedVersion: 1,
          completable: true,
        },
        {
          id: "t-off-2",
          titleKey: "today-task-final-commission",
          kind: "EARNINGS",
          status: "OPEN",
          priority: "NORMAL",
          expectedVersion: 1,
          completable: false,
          actionTo: "/earnings",
        },
      ],
      agenda: [],
      activity: [{ id: "a-1", titleKey: "today-activity-offboard-started" }],
      insights: [],
      permissions: { ...basePermissions, canViewEarnings: true },
      actionPanel: {
        titleKey: "today-panel-offboard-title",
        descriptionKey: "today-panel-offboard-desc",
        steps: [{ id: "s1", labelKey: "today-panel-offboard-s1" }],
        taskId: "t-off-1",
        submitLabelKey: "today-panel-submit",
        resultKey: "today-panel-offboard-result",
      },
    }),
  },
];

export const TODAY_VARIANTS = [
  "normal",
  "empty",
  "partial",
  "loading",
  "validation-error",
  "version-conflict",
  "forbidden",
  "dependency-unavailable",
  "unknown-outcome",
] as const;

export type TodayVariant = (typeof TODAY_VARIANTS)[number];

export function getScenario(id: string): TodayScenario | undefined {
  return TODAY_SCENARIOS.find((s) => s.id === id);
}
