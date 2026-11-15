import { Link } from "react-router-dom";

import { Box, Button, Card, CardContent, Grid, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import NiMoon from "@/icons/nexture/ni-moon";
import NiScreen from "@/icons/nexture/ni-screen";
import NiSun from "@/icons/nexture/ni-sun";
import NiTriangleUp from "@/icons/nexture/ni-triangle-up";
import { ModeVariant } from "@/constants";
import { useThemeContext } from "@/theme/theme-provider";
import type { ReactNode } from "react";

interface StatItem {
  labelKey: string;
  value: string;
  change?: string;
  to?: string;
  subKey?: string;
}

const STATS: StatItem[] = [
  {
    labelKey: "dashboard-stat-active-customers",
    value: "248",
    change: "+8,7%",
    to: "/customers",
  },
  {
    labelKey: "dashboard-stat-proposals",
    value: "12",
    change: "+33%",
    to: "/sales/proposals",
  },
  {
    labelKey: "dashboard-stat-active-policies",
    value: "186",
    change: "+5,1%",
    subKey: "dashboard-stat-running-claims",
    to: "/portfolio/policies",
  },
  {
    labelKey: "dashboard-stat-commission-month",
    value: "Rp 24,8jt",
    change: "+18,4%",
    to: "/earnings",
  },
];

function StatCard({ stat }: { stat: StatItem }) {
  const { t } = useTranslation();
  const body = (
    <CardContent className="flex h-full flex-col gap-1">
      <Typography variant="body2" className="text-text-secondary leading-5">
        {t(stat.labelKey)}
      </Typography>
      <Typography variant="h5" className="text-leading-5">
        {stat.value}
      </Typography>
      <Box className="flex flex-row items-center gap-1">
        {stat.change ? (
          <>
            <NiTriangleUp className="text-success" size="small" />
            <Typography variant="body2" className="text-success">
              {stat.change}
            </Typography>
          </>
        ) : null}
      </Box>
      {stat.subKey ? (
        <Typography variant="caption" color="text.secondary" className="leading-4">
          {t(stat.subKey)}: 4
        </Typography>
      ) : null}
    </CardContent>
  );
  const cls = "flex flex-row items-center p-1 transition-transform hover:scale-[1.02]";
  return stat.to ? (
    <Card component={Link} to={stat.to} className={cls}>
      {body}
    </Card>
  ) : (
    <Card className={cls}>{body}</Card>
  );
}

const MODE_OPTIONS: { value: ModeVariant; icon: ReactNode; labelKey: string }[] = [
  { value: "system", icon: <NiScreen size="medium" />, labelKey: "mode-system" },
  { value: "light", icon: <NiSun size="medium" />, labelKey: "mode-light" },
  { value: "dark", icon: <NiMoon size="medium" />, labelKey: "mode-dark" },
];

function ConfigurationCard() {
  const { t } = useTranslation();
  const { mode, setMode } = useThemeContext();
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3">
        <Typography variant="h6" component="h6">
          {t("dashboard-configuration")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("dashboard-configuration-desc")}
        </Typography>
        <Box className="mt-auto flex flex-col gap-1">
          {MODE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="small"
              variant={mode === opt.value ? "contained" : "text"}
              color={mode === opt.value ? "primary" : "grey"}
              startIcon={opt.icon}
              onClick={() => setMode(opt.value)}
              className="justify-start"
            >
              {t(opt.labelKey)}
            </Button>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardStats() {
  const { t } = useTranslation();
  return (
    <>
      <Typography variant="h6" component="h6" className="mb-3">
        {t("dashboard-todays-stats")}
      </Typography>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 9 }}>
          <Grid container spacing={2.5}>
            {STATS.map((stat) => (
              <Grid key={stat.labelKey} size={{ xs: 12, sm: 6, lg: 3 }}>
                <StatCard stat={stat} />
              </Grid>
            ))}
          </Grid>
        </Grid>
        <Grid size={{ xs: 12, lg: 3 }}>
          <ConfigurationCard />
        </Grid>
      </Grid>
    </>
  );
}
