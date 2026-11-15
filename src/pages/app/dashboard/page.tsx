import { Box, Typography } from "@mui/material";

import DashboardStats from "./sections/dashboard-stats";
import { useTranslation } from "react-i18next";

function greetingPeriod(hour: number): "morning" | "afternoon" | "evening" | "night" {
  if (hour < 11) return "morning";
  if (hour < 15) return "afternoon";
  if (hour < 19) return "evening";
  return "night";
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const now = new Date();
  const period = greetingPeriod(now.getHours());
  const dateLine = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  return (
    <Box className="flex flex-col gap-6 p-4 sm:p-6">
      <Box>
        <Typography variant="body2" color="text.secondary">
          {dateLine}
        </Typography>
        <Typography variant="h4" component="h1" className="font-bold">
          {t(`dashboard-greeting-${period}`, { name: t("dashboard-agent-name") })}
        </Typography>
        <Typography variant="h6" color="text.secondary" className="mt-1">
          {t("dashboard-tagline")}
        </Typography>
      </Box>
      <DashboardStats />
    </Box>
  );
}
