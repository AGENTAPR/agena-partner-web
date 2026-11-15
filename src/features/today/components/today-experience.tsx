import type { OperationReceipt, RequestContext, TaskStatus, TodayTask, TodayView } from "../models";
import type { TodayVariant } from "../scenarios";
import { createTodayService, type TodayExperienceService } from "../service";
import { type TodayUiState, toTodayViewModel } from "../view-model";
import { ScenarioSwitcher } from "./scenario-switcher";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";

import NiCheckFull from "@/icons/nexture/ni-check-full";
import NiClock from "@/icons/nexture/ni-clock";
import NiCalendar from "@/icons/nexture/ni-calendar";
import NiDocumentFull from "@/icons/nexture/ni-document-full";
import NiFlag from "@/icons/nexture/ni-flag";
import NiShield from "@/icons/nexture/ni-shield";
import NiShieldCheck from "@/icons/nexture/ni-shield-check";
import NiUser from "@/icons/nexture/ni-user";

const service: TodayExperienceService = createTodayService();

function useTodayData() {
  const [params] = useSearchParams();
  const scenarioId = params.get("scenario") ?? "active-eligible";
  const variant = (params.get("variant") ?? "normal") as TodayVariant;

  const context = useMemo<RequestContext>(
    () => ({
      actorId: "agent-demo-001",
      scenarioId,
      variant,
      requestId: `req-${scenarioId}-${variant}`,
    }),
    [scenarioId, variant],
  );

  const [view, setView] = useState<TodayView | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string>();
  const [actionError, setActionError] = useState<TodayUiState>();
  const [actionNotice, setActionNotice] = useState<string>();
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelResult, setPanelResult] = useState<string>();
  const [panelBusy, setPanelBusy] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string>();
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const mounted = useRef(true);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      if (mounted.current) fn();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorCode(undefined);
    try {
      const data = await service.getToday(context);
      if (mounted.current) setView(data);
    } catch (e) {
      if (mounted.current) {
        setErrorCode((e as { code?: string }).code);
        setView(null);
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [context]);

  // Initial + reload on scenario/variant change; cancelled flag drops stale responses.
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    setLoading(true);
    setErrorCode(undefined);
    service
      .getToday(context)
      .then((data) => {
        if (!cancelled && mounted.current) setView(data);
      })
      .catch((e) => {
        if (!cancelled && mounted.current) {
          setErrorCode((e as { code?: string }).code);
          setView(null);
        }
      })
      .finally(() => {
        if (!cancelled && mounted.current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [context]);

  // Timer + mounted cleanup
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    };
  }, []);

  const pollOperation = useCallback(
    (receipt: OperationReceipt) => {
      const tick = async () => {
        try {
          const op = await service.getOperation(context, receipt.operationId);
          if (!mounted.current) return;
          if (op.status === "PENDING") {
            later(() => void tick(), 600);
          } else {
            setActionNotice(op.status === "CONFIRMED" ? "today-op-confirmed" : "today-op-pending");
            void load();
          }
        } catch {
          if (mounted.current) later(() => void tick(), 600);
        }
      };
      later(() => void tick(), 600);
    },
    [context, later, load],
  );

  const mutateTask = useCallback(
    async (taskId: string, action: "complete" | "reopen" | "resubmit") => {
      if (!view) return;
      const task = view.tasks.find((t) => t.id === taskId);
      if (!task || !view.permissions.canUpdateTasks) return;
      setActionError(undefined);
      setActionNotice(undefined);
      setBusyTaskId(taskId);
      try {
        const receipt = await service.updateTask(context, taskId, {
          action,
          expectedVersion: task.expectedVersion,
        });
        if (receipt.status === "PENDING") {
          setActionNotice("today-op-pending");
          pollOperation(receipt);
        } else {
          setActionNotice("today-op-confirmed");
          void load();
        }
      } catch (e) {
        const code = (e as { code?: string }).code;
        setActionError(
          code === "VERSION_CONFLICT"
            ? "VERSION_CONFLICT"
            : code === "VALIDATION_ERROR"
              ? "VALIDATION_ERROR"
              : "DEPENDENCY_UNAVAILABLE",
        );
        void load();
      } finally {
        if (mounted.current) setBusyTaskId(undefined);
      }
    },
    [view, context, load, pollOperation],
  );

  const toggleTask = useCallback(
    (task: TodayTask) => {
      if (task.status === "BLOCKED") return; // blocked tasks remediate via panel, never complete
      void mutateTask(task.id, task.status === "COMPLETED" ? "reopen" : "complete");
    },
    [mutateTask],
  );

  const runPanelAction = useCallback(async () => {
    if (!view?.actionPanel) return;
    const task = view.tasks.find((t) => t.id === view.actionPanel!.taskId);
    if (!task) return;
    setPanelBusy(true);
    setPanelResult(undefined);
    try {
      const action = task.status === "BLOCKED" ? "resubmit" : "complete";
      const receipt = await service.updateTask(context, task.id, {
        action,
        expectedVersion: task.expectedVersion,
      });
      if (receipt.status === "PENDING") {
        setPanelResult("today-op-pending");
        pollOperation(receipt);
      } else {
        setPanelResult(view.actionPanel.resultKey);
        void load();
      }
    } catch (e) {
      const code = (e as { code?: string }).code;
      setPanelResult(code === "VERSION_CONFLICT" ? "today-error-version-conflict" : "today-error-validation-error");
      void load();
    } finally {
      if (mounted.current) setPanelBusy(false);
    }
  }, [view, context, load, pollOperation]);

  return {
    view,
    loading,
    errorCode,
    actionError,
    actionNotice,
    busyTaskId,
    updateTask: toggleTask,
    panelOpen,
    setPanelOpen,
    panelResult,
    panelBusy,
    runPanelAction,
    reload: load,
  };
}

const INSIGHT_ICONS: Record<string, typeof NiCalendar> = {
  NiDocumentFull,
  NiCalendar,
  NiShieldCheck,
};

const SEVERITY_COLOR = { CRITICAL: "error", WARNING: "warning", INFO: "info" } as const;

const TASK_STATUS_META: Record<
  TaskStatus,
  { color: "success" | "info" | "warning" | "error" | "default"; icon: typeof NiClock }
> = {
  COMPLETED: { color: "success", icon: NiCheckFull },
  IN_REVIEW: { color: "info", icon: NiClock },
  OPEN: { color: "default", icon: NiClock },
  BLOCKED: { color: "error", icon: NiShield },
};

function formatWhen(value: string | undefined, language: string): string | undefined {
  if (!value) return undefined;
  // Date-only (YYYY-MM-DD) → format without timezone shift.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (Number.isNaN(date.getTime())) return undefined;
    return new Intl.DateTimeFormat(language, { day: "numeric", month: "short", year: "numeric" }).format(date);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Responsive task row — no absolute-positioned overlap at any width. */
function TodayTaskItem({
  task,
  busy,
  canUpdate,
  onToggle,
}: {
  task: TodayTask;
  busy: boolean;
  canUpdate: boolean;
  onToggle: (t: TodayTask) => void;
}) {
  const { t, i18n } = useTranslation();
  const status = TASK_STATUS_META[task.status];
  const StatusIcon = status.icon;
  const due = formatWhen(task.dueAt, i18n.language);

  const actionButton =
    task.completable && canUpdate ? (
      <Button
        size="small"
        variant={task.status === "COMPLETED" ? "outlined" : "contained"}
        disabled={busy || task.status === "BLOCKED" || task.status === "IN_REVIEW"}
        onClick={() => onToggle(task)}
      >
        {task.status === "COMPLETED" ? t("today-task-reopen") : t("today-task-complete")}
      </Button>
    ) : task.actionTo ? (
      <Button size="small" component={Link} to={task.actionTo} disabled={busy}>
        {t(task.actionLabelKey ?? "today-cta-open")}
      </Button>
    ) : null;

  return (
    <Box className="border-grey-300/60 flex flex-col gap-2 rounded-lg border p-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-3">
      <Box className="flex min-w-0 flex-1 items-start gap-3">
        <StatusIcon size={20} className="text-text-secondary mt-0.5 shrink-0" />
        <Box className="min-w-0 flex-1">
          <Typography variant="body2" className="font-medium break-words">
            {t(task.titleKey)}
          </Typography>
          {task.descriptionKey ? (
            <Typography variant="caption" color="text.secondary" className="break-words">
              {t(task.descriptionKey)}
            </Typography>
          ) : null}
          <Box className="mt-1 flex flex-wrap items-center gap-2">
            <Chip
              size="small"
              color={status.color}
              variant="filled"
              label={t(`today-status-${task.status.toLowerCase()}`)}
              icon={<StatusIcon size={14} />}
            />
            {due ? (
              <Typography variant="caption" color="text.secondary">
                {t("today-due")}: {due}
              </Typography>
            ) : null}
            {task.priority === "CRITICAL" ? (
              <Chip size="small" color="error" label={t("today-priority-critical")} />
            ) : null}
          </Box>
        </Box>
      </Box>
      {actionButton ? <Box className="flex shrink-0 justify-end">{actionButton}</Box> : null}
    </Box>
  );
}

function StatePanel({
  icon,
  titleKey,
  bodyKey,
  actionLabelKey,
  onAction,
}: {
  icon: React.ReactNode;
  titleKey: string;
  bodyKey: string;
  actionLabelKey?: string;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <Box className="text-text-secondary">{icon}</Box>
        <Typography variant="h6">{t(titleKey)}</Typography>
        <Typography variant="body2" color="text.secondary" className="max-w-md">
          {t(bodyKey)}
        </Typography>
        {actionLabelKey && onAction ? (
          <Button variant="contained" onClick={onAction}>
            {t(actionLabelKey)}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function TodayExperience() {
  const { t } = useTranslation();
  const {
    view,
    loading,
    errorCode,
    actionError,
    actionNotice,
    busyTaskId,
    updateTask,
    panelOpen,
    setPanelOpen,
    panelResult,
    panelBusy,
    runPanelAction,
    reload,
  } = useTodayData();
  const vm = toTodayViewModel(view, loading, errorCode);
  const isDev = import.meta.env.DEV;

  const nba = vm.nextBestAction;
  // Hero derives entirely from the NBA model — never mixes sources.
  const heroTitleKey = nba?.titleKey ?? vm.hero.titleKey;
  const heroDescKey = nba?.descriptionKey ?? vm.hero.descriptionKey;
  const heroCtaLabel = nba?.ctaLabelKey ?? vm.hero.cta.labelKey;

  const handleHeroAction = () => {
    if (!nba) return;
    if (view?.actionPanel && nba.taskId === view.actionPanel.taskId) {
      setPanelOpen(true);
      return;
    }
    if (nba.taskId) {
      const task = view?.tasks.find((t) => t.id === nba.taskId);
      if (task) {
        toggleViaUpdate(task);
        return;
      }
    }
    if (nba.to) {
      // route navigation handled by Link below
    }
  };

  const toggleViaUpdate = (task: TodayTask) => {
    if (task.status === "BLOCKED") {
      if (view?.actionPanel) setPanelOpen(true);
      return;
    }
    updateTask(task);
  };

  return (
    <Box className="flex flex-col gap-10">
      {isDev ? <ScenarioSwitcher /> : null}

      <div aria-live="polite" className="sr-only">
        {actionNotice ? t(actionNotice) : ""}
      </div>

      {actionError ? (
        <Alert severity="error" onClose={() => {}}>
          {t(`today-error-${actionError.toLowerCase().replace(/_/g, "-")}`)}
        </Alert>
      ) : null}
      {actionNotice === "today-op-confirmed" ? (
        <Alert severity="success" onClose={() => {}}>
          {t(actionNotice)}
        </Alert>
      ) : null}

      {/* Page heading */}
      <Box>
        <Typography variant="h4" component="h1" className="font-bold">
          {t("today-page-title")}
        </Typography>
        {view?.agentNameKey ? (
          <Typography variant="body2" color="text.secondary">
            {t(view.agentNameKey)}
          </Typography>
        ) : null}
      </Box>

      {vm.state === "LOADING" ? (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <Skeleton variant="text" width="40%" height={40} />
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" height={120} />
          </CardContent>
        </Card>
      ) : null}

      {vm.state === "PERMISSION_DENIED" ? (
        <StatePanel
          icon={<NiShield size={40} />}
          titleKey="today-state-forbidden-title"
          bodyKey="today-error-permission-denied"
          actionLabelKey="today-cta-retry"
          onAction={() => void reload()}
        />
      ) : null}
      {vm.state === "DEPENDENCY_UNAVAILABLE" ? (
        <StatePanel
          icon={<NiClock size={40} />}
          titleKey="today-state-unavailable-title"
          bodyKey="today-error-dependency-unavailable"
          actionLabelKey="today-cta-retry"
          onAction={() => void reload()}
        />
      ) : null}
      {vm.state === "VERSION_CONFLICT" ? (
        <StatePanel
          icon={<NiClock size={40} />}
          titleKey="today-state-conflict-title"
          bodyKey="today-error-version-conflict"
          actionLabelKey="today-cta-retry"
          onAction={() => void reload()}
        />
      ) : null}
      {vm.state === "EMPTY" ? (
        <StatePanel icon={<NiCheckFull size={40} />} titleKey="today-state-empty-title" bodyKey="today-empty" />
      ) : null}

      {view &&
      !["LOADING", "PERMISSION_DENIED", "DEPENDENCY_UNAVAILABLE", "VERSION_CONFLICT", "EMPTY"].includes(vm.state) ? (
        <>
          {vm.criticalBlockers.map((b) => (
            <Alert key={b.id} severity={SEVERITY_COLOR[b.severity]} icon={<NiShield size={20} />}>
              <strong>{t(b.titleKey)}</strong> — {t(b.descriptionKey)}
            </Alert>
          ))}
          {vm.state === "PARTIAL" ? <Alert severity="info">{t("today-partial")}</Alert> : null}

          {/* Hero: single most important next action — one consistent model */}
          <Card className="bg-primary/5">
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Box className="flex flex-col gap-1">
                <Typography variant="overline" color="primary">
                  {t("today-hero-eyebrow")}
                </Typography>
                <Typography variant="h5" component="h2" className="font-bold">
                  {t(heroTitleKey)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(heroDescKey)}
                </Typography>
                {vm.hero.statusKey ? (
                  <Chip size="small" color="warning" variant="filled" label={t(vm.hero.statusKey)} />
                ) : null}
                {vm.hero.progressLabelKey ? (
                  <Typography variant="caption" color="text.secondary">
                    {t(vm.hero.progressLabelKey)}
                  </Typography>
                ) : null}
                {nba?.dueAt ? (
                  <Typography variant="caption" color="text.secondary">
                    {t("today-due")}: {formatWhen(nba.dueAt, "en") ?? nba.dueAt}
                  </Typography>
                ) : null}
              </Box>
              {nba?.to && !nba.taskId ? (
                <Button component={Link} to={nba.to} variant="contained" size="large">
                  {t(heroCtaLabel)}
                </Button>
              ) : nba?.taskId ? (
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleHeroAction}
                  disabled={busyTaskId === nba.taskId}
                >
                  {t(heroCtaLabel)}
                </Button>
              ) : (
                <Button component={Link} to={vm.hero.cta.to ?? "/today"} variant="contained" size="large">
                  {t(heroCtaLabel)}
                </Button>
              )}
            </CardContent>
          </Card>

          <Grid container spacing={2.5}>
            {vm.journey.length > 0 ? (
              <Grid size={{ xs: 12, lg: 5 }}>
                <Card className="h-full">
                  <CardContent>
                    <Typography variant="h6" className="mb-3">
                      {t("today-journey-title")}
                    </Typography>
                    <Stepper orientation="vertical" nonLinear>
                      {vm.journey.map((m) => (
                        <Step key={m.id} active={m.state === "CURRENT"} completed={m.state === "DONE"}>
                          <StepLabel error={m.state === "BLOCKED"}>{t(m.labelKey)}</StepLabel>
                        </Step>
                      ))}
                    </Stepper>
                  </CardContent>
                </Card>
              </Grid>
            ) : null}

            <Grid size={{ xs: 12, lg: vm.journey.length > 0 ? 7 : 12 }}>
              <Card>
                <CardContent className="flex flex-col gap-2">
                  <Typography variant="h6">{t("today-tasks-title")}</Typography>
                  {vm.primaryTasks.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {t("today-tasks-empty")}
                    </Typography>
                  ) : (
                    <List dense disablePadding className="flex flex-col">
                      {vm.primaryTasks.map((task) => (
                        <TodayTaskItem
                          key={task.id}
                          task={task}
                          busy={busyTaskId === task.id}
                          canUpdate={view.permissions.canUpdateTasks}
                          onToggle={toggleViaUpdate}
                        />
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {vm.agenda.length > 0 ? (
              <Grid size={{ xs: 12, md: 6 }}>
                <Card className="h-full">
                  <CardContent>
                    <Typography variant="h6" className="mb-2">
                      {t("today-agenda-title")}
                    </Typography>
                    <List dense disablePadding>
                      {vm.agenda.map((a) => (
                        <ListItem key={a.id} disableGutters>
                          <ListItemIcon>
                            <NiFlag size={18} />
                          </ListItemIcon>
                          <ListItemText
                            primary={t(a.titleKey)}
                            secondary={formatWhen(a.at, "en") ?? a.at ?? undefined}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ) : null}

            {vm.showInsights && vm.insights.length > 0 ? (
              <Grid size={{ xs: 12, md: 6 }}>
                <Card className="h-full">
                  <CardContent>
                    <Typography variant="h6" className="mb-3">
                      {t("today-insights-title")}
                    </Typography>
                    <Grid container spacing={2}>
                      {vm.insights.map((i, idx) => {
                        const Icon = i.iconKey ? INSIGHT_ICONS[i.iconKey] : undefined;
                        const content = (
                          <Box className="flex items-center gap-3">
                            <Box
                              className={`flex h-14 w-14 flex-none items-center justify-center rounded-xl ${
                                idx % 2 === 0 ? "bg-primary-light/10" : "bg-secondary-light/10"
                              }`}
                            >
                              {Icon ? (
                                <Icon className={idx % 2 === 0 ? "text-primary" : "text-secondary"} size="medium" />
                              ) : null}
                            </Box>
                            <Box className="min-w-0">
                              <Typography variant="h5" className="leading-5">
                                {i.valueKey}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" className="leading-4">
                                {t(i.labelKey)}
                              </Typography>
                            </Box>
                          </Box>
                        );
                        return (
                          <Grid key={i.id} size={12}>
                            {i.to ? (
                              <Card
                                component={Link}
                                to={i.to}
                                className="flex p-2 transition-transform hover:scale-[1.02]"
                              >
                                {content}
                              </Card>
                            ) : (
                              <Card className="flex p-2">{content}</Card>
                            )}
                          </Grid>
                        );
                      })}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ) : null}

            {vm.activity.length > 0 ? (
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" className="mb-2">
                      {t("today-activity-title")}
                    </Typography>
                    <List dense disablePadding>
                      {vm.activity.map((a) => (
                        <ListItem key={a.id} disableGutters>
                          <ListItemIcon>
                            <NiUser size={18} />
                          </ListItemIcon>
                          <ListItemText primary={t(a.titleKey)} secondary={formatWhen(a.at, "en")} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ) : null}
          </Grid>
        </>
      ) : null}

      {/* Today-scoped contextual action panel */}
      <Dialog open={panelOpen} onClose={() => setPanelOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{vm.actionPanel ? t(vm.actionPanel.titleKey) : ""}</DialogTitle>
        <DialogContent className="flex flex-col gap-3">
          {vm.actionPanel ? (
            <>
              <Typography variant="body2" color="text.secondary">
                {t(vm.actionPanel.descriptionKey)}
              </Typography>
              <List dense disablePadding>
                {vm.actionPanel.steps.map((s) => (
                  <ListItem key={s.id} disableGutters>
                    <ListItemIcon>
                      <NiCheckFull size={18} />
                    </ListItemIcon>
                    <ListItemText
                      primary={t(s.labelKey)}
                      secondary={s.descriptionKey ? t(s.descriptionKey) : undefined}
                    />
                  </ListItem>
                ))}
              </List>
              {panelResult ? (
                <Alert severity={panelResult.startsWith("today-error") ? "error" : "success"}>{t(panelResult)}</Alert>
              ) : null}
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPanelOpen(false)}>{t("today-panel-close")}</Button>
          <Button variant="contained" onClick={() => void runPanelAction()} disabled={panelBusy}>
            {panelBusy ? t("today-panel-working") : t(vm.actionPanel?.submitLabelKey ?? "today-panel-submit")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
