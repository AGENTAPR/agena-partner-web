import { Link } from "react-router-dom";

import { Box, Button, Card, CardContent, Grid, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import NiDocumentCheck from "@/icons/nexture/ni-document-check";
import NiDocumentFull from "@/icons/nexture/ni-document-full";
import NiKnobs from "@/icons/nexture/ni-knobs";
import NiMoney from "@/icons/nexture/ni-money";
import NiMoon from "@/icons/nexture/ni-moon";
import NiScreen from "@/icons/nexture/ni-screen";
import NiShieldCheck from "@/icons/nexture/ni-shield-check";
import NiSun from "@/icons/nexture/ni-sun";
import NiTriangleUp from "@/icons/nexture/ni-triangle-up";
import NiUser from "@/icons/nexture/ni-user";
import { ModeVariant } from "@/constants";
import { cn } from "@/lib/utils";
import { useThemeContext } from "@/theme/theme-provider";
import type { ReactNode } from "react";

interface StatItem {
  labelKey: string;
  value: string;
  change?: string;
  to?: string;
  icon: ReactNode;
  tileClass: string;
  iconClass: string;
}

const STATS: StatItem[] = [
  {
    labelKey: "dashboard-stat-active-customers",
    value: "248",
    change: "+8,7%",
    to: "/customers",
    icon: <NiUser size="large" />,
    tileClass: "bg-primary-light/10",
    iconClass: "text-primary",
  },
  {
    labelKey: "dashboard-stat-proposals",
    value: "12",
    change: "+33%",
    to: "/sales/proposals",
    icon: <NiDocumentFull size="large" />,
    tileClass: "bg-secondary-light/10",
    iconClass: "text-secondary",
  },
  {
    labelKey: "dashboard-stat-active-policies",
    value: "186",
    change: "+5,1%",
    to: "/portfolio/policies",
    icon: <NiShieldCheck size="large" />,
    tileClass: "bg-accent-1-light/10",
    iconClass: "text-accent-1",
  },
  {
    labelKey: "dashboard-stat-running-claims",
    value: "4",
    to: "/portfolio/claims",
    icon: <NiDocumentCheck size="large" />,
    tileClass: "bg-accent-2-light/10",
    iconClass: "text-accent-2",
  },
  {
    labelKey: "dashboard-stat-commission-month",
    value: "Rp 24,8jt",
    change: "+18,4%",
    to: "/earnings",
    icon: <NiMoney size="large" />,
    tileClass: "bg-success-light/10",
    iconClass: "text-success",
  },
];

function StatCard({ stat, className }: { stat: StatItem; className?: string }) {
  const { t } = useTranslation();
  const body = (
    <>
      <Box className={`flex h-28 w-16 flex-none items-center justify-center rounded-2xl ${stat.tileClass}`}>
        <Box className={stat.iconClass}>{stat.icon}</Box>
      </Box>
      <CardContent className="flex min-h-28 min-w-0 flex-col justify-center gap-1">
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
      </CardContent>
    </>
  );
  const cls = cn("flex h-full flex-row items-center p-1 transition-transform hover:scale-[1.02]", className);
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

function ConfigurationPanel() {
  const { t } = useTranslation();
  const { mode, setMode } = useThemeContext();
  return (
    <Box className="from-primary-light/15 to-secondary-light/15 bg-gradient-to-br shadow-xs flex h-full w-full flex-none flex-col justify-center gap-3 rounded-3xl px-4 py-4 lg:rounded-l-none!">
      <Box className="flex flex-row items-center gap-2">
        <NiKnobs className="text-primary" size="medium" />
        <Typography variant="subtitle2" component="h6" className="font-bold">
          {t("dashboard-configuration")}
        </Typography>
      </Box>
      <Box className="flex flex-col gap-1">
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
    </Box>
  );
}

export default function DashboardStats() {
  return (
    <Grid container spacing={2.5}>
      {STATS.map((stat, index) => {
        const isLast = index === STATS.length - 1;
        return (
          <Grid key={stat.labelKey} size={{ xs: 12, sm: 6, lg: 2 }}>
            <StatCard stat={stat} className={isLast ? "lg:rounded-r-none!" : undefined} />
          </Grid>
        );
      })}
      <Grid size={{ xs: 12, sm: 6, lg: 2 }} sx={{ lg: { ml: "-20px" } }}>
        <ConfigurationPanel />
      </Grid>
    </Grid>
  );
}
