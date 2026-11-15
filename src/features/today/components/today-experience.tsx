import type { OperationReceipt, RequestContext, TodayView } from "../models";
import type { TodayVariant } from "../scenarios";
import { createTodayService, type TodayExperienceService } from "../service";
import { type TodayUiState, toTodayViewModel } from "../view-model";
import { ScenarioSwitcher } from "./scenario-switcher";
import { useMemo, useState } from "react";
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
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";

import NiCheckFull from "@/icons/nexture/ni-check-full";
import NiClock from "@/icons/nexture/ni-clock";
import NiFlag from "@/icons/nexture/ni-flag";
import NiShield from "@/icons/nexture/ni-shield";

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

  const load = async () => {
    setLoading(true);
    setErrorCode(undefined);
    try {
      const data = await service.getToday(context);
      setView(data);
    } catch (e) {
      setErrorCode((e as { code?: string }).code);
      setView(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial + reload on context change
  const [loadedKey, setLoadedKey] = useState("");
  const key = `${scenarioId}|${variant}`;
  if (loadedKey !== key) {
    setLoadedKey(key);
    void load();
  }

  const updateTask = async (taskId: string) => {
    if (!view) return;
    const task = view.tasks.find((t) => t.id === taskId);
    if (!task) return;
    setActionError(undefined);
    try {
      const receipt = await service.updateTask(context, taskId, {
        action: task.status === "COMPLETED" ? "reopen" : "complete",
        expectedVersion: task.expectedVersion,
      });
      if (receipt.status === "PENDING") {
        setPendingOps((p) => ({ ...p, [receipt.operationId]: receipt }));
        // Poll operation status deterministically.
        const poll = async () => {
          const op = await service.getOperation(context, receipt.operationId);
          setPendingOps((p) => ({ ...p, [receipt.operationId]: op }));
          if (op.status === "PENDING") setTimeout(poll, 600);
          else void load();
        };
        setTimeout(poll, 600);
      } else {
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
  };

  return { view, loading, errorCode, actionError, pendingOps, updateTask, reload: load, context };
}

const SEVERITY_COLOR = { CRITICAL: "error", WARNING: "warning", INFO: "info" } as const;

export function TodayExperience() {
  const { t } = useTranslation();
  const { view, loading, errorCode, actionError, pendingOps, updateTask } = useTodayData();
  const vm = toTodayViewModel(view, loading, errorCode);
  const isDev = import.meta.env.DEV;

  const heroCta = vm.hero.cta;
  const heroTo = heroCta.to;

  return (
    <Box className="flex flex-col gap-6 p-4 sm:p-6">
      {isDev ? <ScenarioSwitcher /> : null}

      {actionError ? (
        <Alert severity="error" onClose={() => {}}>
          {t(`today-error-${actionError.toLowerCase().replace(/_/g, "-")}`)}
        </Alert>
      ) : null}

      {vm.state === "LOADING" ? (
        <Card>
          <CardContent>
            <Typography>{t("today-loading")}</Typography>
          </CardContent>
        </Card>
      ) : null}

      {vm.state === "PERMISSION_DENIED" ? <Alert severity="error">{t("today-error-permission-denied")}</Alert> : null}

      {vm.state === "DEPENDENCY_UNAVAILABLE" ? (
        <Alert severity="warning">{t("today-error-dependency-unavailable")}</Alert>
      ) : null}

      {vm.state === "EMPTY" ? <Alert severity="info">{t("today-empty")}</Alert> : null}

      {view && vm.state !== "LOADING" ? (
        <>
          {/* Critical restrictions first */}
          {vm.criticalBlockers.map((b) => (
            <Alert key={b.id} severity={SEVERITY_COLOR[b.severity]} icon={<NiShield size={20} />}>
              <strong>{t(b.titleKey)}</strong> — {t(b.descriptionKey)}
            </Alert>
          ))}

          {/* Hero: single most important next action */}
          <Card className="bg-primary/5">
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Box className="flex flex-col gap-1">
                <Typography variant="h5" component="h1" className="font-bold">
                  {t(vm.hero.titleKey)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(vm.hero.descriptionKey)}
                </Typography>
                {vm.hero.statusKey ? (
                  <Chip size="small" color="warning" variant="outlined" label={t(vm.hero.statusKey)} />
                ) : null}
                {vm.hero.progressLabelKey ? (
                  <Typography variant="caption" color="text.secondary">
                    {t(vm.hero.progressLabelKey)}
                  </Typography>
                ) : null}
              </Box>
              {heroTo ? (
                <Button component={Link} to={heroTo} variant="contained" size="large">
                  {t(heroCta.labelKey)}
                </Button>
              ) : heroCta.taskId && view.permissions.canUpdateTasks ? (
                <Button variant="contained" size="large" onClick={() => void updateTask(heroCta.taskId!)}>
                  {t(heroCta.labelKey)}
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            {/* Journey progress */}
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

            {/* Tasks */}
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
                                onClick={() => void updateTask(task.id)}
                              >
                                {task.status === "COMPLETED" ? t("today-task-reopen") : t("today-task-complete")}
                              </Button>
                            ) : task.actionTo ? (
                              <Button size="small" component={Link} to={task.actionTo}>
                                {t(task.actionLabelKey ?? "today-cta-open")}
                              </Button>
                            ) : null
                          }
                        >
                          <ListItemIcon className="min-w-8">
                            {task.status === "COMPLETED" ? <NiCheckFull size={18} /> : <NiClock size={18} />}
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

            {/* Agenda */}
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

            {/* Insights — active eligible only */}
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
                            <Button component={Link} to={i.to} className="h-auto! w-full! flex-col!">
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

            {/* Recent activity */}
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

          {Object.keys(pendingOps).length > 0 ? <Alert severity="info">{t("today-op-pending")}</Alert> : null}
        </>
      ) : null}
    </Box>
  );
}
