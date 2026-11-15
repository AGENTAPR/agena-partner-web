import type { TodayView } from "./models";

export type TodayUiState =
  | "INITIAL"
  | "LOADING"
  | "EMPTY"
  | "READY"
  | "PARTIAL"
  | "VALIDATION_ERROR"
  | "PERMISSION_DENIED"
  | "DEPENDENCY_UNAVAILABLE"
  | "VERSION_CONFLICT"
  | "SUCCESS"
  | "UNKNOWN_OUTCOME";

export interface TodayViewModel {
  state: TodayUiState;
  hero: TodayView["hero"];
  nextBestAction?: TodayView["nextBestAction"];
  criticalBlockers: TodayView["blockers"];
  journey: TodayView["journey"];
  primaryTasks: TodayView["tasks"];
  agenda: TodayView["agenda"];
  activity: TodayView["activity"];
  insights: TodayView["insights"];
  actionPanel?: TodayView["actionPanel"];
  showInsights: boolean;
}

/** Lifecycle-aware composition: restrictions first, hero action, then work. */
export function toTodayViewModel(
  view: TodayView | null,
  loading: boolean,
  errorCode?: string,
): TodayViewModel {
  if (loading) return empty("LOADING");
  if (!view) return empty(mapError(errorCode));

  const hasContent =
    view.tasks.length > 0 ||
    view.agenda.length > 0 ||
    view.journey.length > 0 ||
    view.activity.length > 0;
  const state: TodayUiState = !hasContent
    ? "EMPTY"
    : view.meta.partial
      ? "PARTIAL"
      : "READY";

  const isActive = view.agentLifecycle === "ACTIVE";
  const sortedTasks = [...view.tasks].sort(
    (a, b) =>
      ({ CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 })[a.priority] -
      ({ CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 })[b.priority],
  );

  return {
    state,
    hero: view.hero,
    nextBestAction: view.nextBestAction,
    criticalBlockers: view.blockers.filter((b) => b.severity === "CRITICAL"),
    journey: view.journey,
    primaryTasks: sortedTasks,
    agenda: view.agenda,
    activity: view.activity,
    insights: view.insights,
    actionPanel: view.actionPanel,
    // Production KPIs only for selling-eligible active agents.
    showInsights: isActive && view.eligibility === "ELIGIBLE",
  };
}

function mapError(code?: string): TodayUiState {
  switch (code) {
    case "FORBIDDEN":
    case "UNAUTHORIZED":
      return "PERMISSION_DENIED";
    case "DEPENDENCY_UNAVAILABLE":
      return "DEPENDENCY_UNAVAILABLE";
    case "VERSION_CONFLICT":
      return "VERSION_CONFLICT";
    case "VALIDATION_ERROR":
      return "VALIDATION_ERROR";
    default:
      return "DEPENDENCY_UNAVAILABLE";
  }
}

function empty(state: TodayUiState): TodayViewModel {
  return {
    state,
    hero: {
      titleKey: "today-hero-fallback-title",
      descriptionKey: "today-hero-fallback-desc",
      cta: { labelKey: "today-cta-retry", to: "/today" },
    },
    criticalBlockers: [],
    journey: [],
    primaryTasks: [],
    agenda: [],
    activity: [],
    insights: [],
    showInsights: false,
  };
}
