import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

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
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import NiCheckFull from "@/icons/nexture/ni-check-full";
import NiClock from "@/icons/nexture/ni-clock";
import NiFlag from "@/icons/nexture/ni-flag";
import NiShield from "@/icons/nexture/ni-shield";

import type { OperationReceipt, RequestContext, TodayView } from "../models";
import type { TodayVariant } from "../scenarios";
import { createTodayService, type TodayExperienceService } from "../service";
import { toTodayViewModel, type TodayUiState } from "../view-model";
import { ScenarioSwitcher } from "./scenario-switcher";

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
  const [pendingOps, setPendingOps] = useState<Record<string, OperationReceipt>>({});
  const [actionError, setActionError] = useState<TodayUiState>();
  const [actionNotice, setActionNotice] = useState<string>();
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelResult, setPanelResult] = useState<string>();
  const [panelBusy, setPanelBusy] = useState(false);
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

  // Initial + reload on scenario/variant change; stale responses are dropped
  // because context identity changes and only the latest load writes state.
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
      setPendingOps((p) => ({ ...p, [receipt.operationId]: receipt }));
      const tick = async () => {
        try {
          const op = await service.getOperation(context, receipt.operationId);
          if (!mounted.current) return;
          setPendingOps((p) => {
            const next = { ...p };
            if (op.status === "PENDING") next[receipt.operationId] = op;
            else delete next[receipt.operationId];
            return next;
          });
          if (op.status === "PENDING") {
            later(() => void tick(), 600);
          } else {
            void load();
          }
        } catch {
          if (mounted.current) setPendingOps((p) => ({ ...p, [receipt.operationId]: receipt }));
        }
      };
      later(() => void tick(), 600);
    },
    [context, later, load],
  );

  const updateTask = useCallback(
    async (taskId: string) => {
      if (!view) return;
      const task = view.tasks.find((t) => t.id === taskId);
      if (!task || !view.permissions.canUpdateTasks) return;
      setActionError(undefined);
      setActionNotice(undefined);
      try {
        const receipt = await service.updateTask(context, taskId, {
          action: task.status === "COMPLETED" ? "reopen" : "complete",
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
      }
    },
    [view, context, load, pollOperation],
  );

  const runPanelAction = useCallback(async () => {
    if (!view?.actionPanel) return;
    setPanelBusy(true);
    setPanelResult(undefined);
    try {
      const receipt = await service.updateTask(context, view.actionPanel.taskId, {
        action: "complete",
        expectedVersion:
          view.tasks.find((t) => t.id === view.actionPanel!.taskId)?.expectedVersion ?? 0,
      });
      if (receipt.status === "PENDING") {
        pollOperation(receipt);
        setPanelResult("today-op-pending");
      } else {
        setPanelResult(view.actionPanel.resultKey);
        void load();
      }
    } catch (e) {
      const code = (e as { code?: string }).code;
      setPanelResult(
        code === "VERSION_CONFLICT" ? "today-error-version-conflict" : "today-error-validation-error",
      );
      void load();
    } finally {
      setPanelBusy(false);
    }
  }, [view, context, load, pollOperation]);

  return {
    view,
    loading,
    errorCode,
    actionError,
    actionNotice,
    pendingOps,
    updateTask,
    panelOpen,
    setPanelOpen,
    panelResult,
    panelBusy,
    runPanelAction,
    reload: load,
  };
}

const SEVERITY_COLOR = { CRITICAL: "error", WARNING: "warning", INFO: "info" } as const;

export function TodayExperience() {
  const { t } = useTranslation();
  const {
    view,
    loading,
    errorCode,
    actionError,
    actionNotice,
    pendingOps,
    updateTask,
    panelOpen,
    setPanelOpen,
    panelResult,
    panelBusy,
    runPanelAction,
  } = useTodayData();
  const vm = toTodayViewModel(view, loading, errorCode);
  const isDev = import.meta.env.DEV;

  const nba = vm.nextBestAction;

  return (
    <Box className="flex flex-col gap-6 p-4 sm:p-6">
      {isDev ? <ScenarioSwitcher /> : null}

      <div aria-live="polite" className="sr-only">
        {actionNotice ? t(actionNotice) : ""}
      </div>

      {actionError ? (
        <Alert severity="error" onClose={() => {}}>
          {t(`today-error-${actionError.toLowerCase().replace(/_/g, "-")}`)}
        </Alert>
      ) : null}
      {actionNotice && actionNotice !== "today-op-pending" ? (
        <Alert severity="success" onClose={() => {}}>
          {t(actionNotice)}
        </Alert>
      ) : null}

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
        <Alert severity="error">{t("today-error-permission-denied")}</Alert>
      ) : null}
      {vm.state === "DEPENDENCY_UNAVAILABLE" ? (
        <Alert severity="warning">{t("today-error-dependency-unavailable")}</Alert>
      ) : null}
      {vm.state === "VERSION_CONFLICT" ? (
        <Alert severity="warning">{t("today-error-version-conflict")}</Alert>
      ) : null}
      {vm.state === "EMPTY" ? (
        <Alert severity="info">{t("today-empty")}</Alert>
      ) : null}
      {vm.state === "PARTIAL" ? (
        <Alert severity="info">{t("today-partial")}</Alert>
      ) : null}

      {view && vm.state !== "LOADING" ? (
        <>
          {vm.criticalBlockers.map((b) => (
            <Alert key={b.id} severity={SEVERITY_COLOR[b.severity]} icon={<NiShield size={20} />}>
              <strong>{t(b.titleKey)}</strong> — {t(b.descriptionKey)}
            </Alert>
          ))}

          <Card className="bg-primary/5">
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Box className="flex flex-col gap-1">
                <Typography variant="h5" component="h1" className="font-bold">
                  {nba ? t(nba.titleKey) : t(vm.hero.titleKey)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(vm.hero.descriptionKey)}
                </Typography>
                {vm.hero.statusKey ? (
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={t(vm.hero.statusKey)}
                  />
                ) : null}
                {vm.hero.progressLabelKey ? (
                  <Typography variant="caption" color="text.secondary">
                    {t(vm.hero.progressLabelKey)}
                  </Typography>
                ) : null}
              </Box>
              {nba?.to ? (
                <Button component={Link} to={nba.to} variant="contained" size="large">
                  {t(nba.ctaLabelKey)}
                </Button>
              ) : nba?.taskId && view.permissions.canUpdateTasks ? (
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => {
                    if (view.actionPanel && nba.taskId === view.actionPanel.taskId) {
                      setPanelOpen(true);
                    } else {
                      void updateTask(nba.taskId!);
                    }
                  }}
                >
                  {t(nba.ctaLabelKey)}
                </Button>
              ) : (
                <Button component={Link} to={vm.hero.cta.to ?? "/today"} variant="contained" size="large">
                  {t(vm.hero.cta.labelKey)}
                </Button>
              )}
            </CardContent>
          </Card>

          <Grid container spacing={3}>
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
                    <List dense disablePadding>
                      {vm.primaryTasks.map((task) => (
                        <ListItem
                          key={task.id}
                          disableGutters
                          secondaryAction={
                            task.completable && view.permissions.canUpdateTasks ? (
                              <Button
                                size="small"
                                variant={task.status === "COMPLETED" ? "outlined" : "contained"}
                                disabled={task.status === "BLOCKED"}
                                onClick={() => void updateTask(task.id)}
                              >
                                {task.status === "COMPLETED"
                                  ? t("today-task-reopen")
                                  : t("today-task-complete")}
                              </Button>
                            ) : task.actionTo ? (
                              <Button size="small" component={Link} to={task.actionTo}>
                                {t(task.actionLabelKey ?? "today-cta-open")}
                              </Button>
                            ) : null
                          }
                        >
                          <ListItemIcon className="min-w-8">
                            {task.status === "COMPLETED" ? (
                              <NiCheckFull size={18} />
                            ) : (
                              <NiClock size={18} />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={t(task.titleKey)}
                            secondary={task.descriptionKey ? t(task.descriptionKey) : undefined}
                          />
                          {task.priority === "CRITICAL" ? (
                            <Chip size="small" color="error" label={t("today-priority-critical")} />
                          ) : null}
                        </ListItem>
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
                          <ListItemText primary={t(a.titleKey)} secondary={a.at ?? undefined} />
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
                    <Typography variant="h6" className="mb-2">
                      {t("today-insights-title")}
                    </Typography>
                    <Grid container spacing={2}>
                      {vm.insights.map((i) => (
                        <Grid key={i.id} size={4}>
                          {i.to ? (
                            <Button
                              component={Link}
                              to={i.to}
                              className="flex-col! h-auto! w-full!"
                            >
                              <Typography variant="h5">{i.valueKey}</Typography>
                              <Typography variant="caption">{t(i.labelKey)}</Typography>
                            </Button>
                          ) : (
                            <Box className="text-center">
                              <Typography variant="h5">{i.valueKey}</Typography>
                              <Typography variant="caption">{t(i.labelKey)}</Typography>
                            </Box>
                          )}
                        </Grid>
                      ))}
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
                          <ListItemText primary={t(a.titleKey)} secondary={a.at} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ) : null}
          </Grid>

          {Object.keys(pendingOps).length > 0 ? (
            <Alert severity="info">{t("today-op-pending")}</Alert>
          ) : null}
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
                <Alert severity={panelResult.startsWith("today-error") ? "error" : "success"}>
                  {t(panelResult)}
                </Alert>
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
