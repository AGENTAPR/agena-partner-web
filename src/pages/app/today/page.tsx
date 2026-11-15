import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Alert, Box, Button, Card, CardContent, Chip, Grid, Typography } from "@mui/material";

import NiCheckFull from "@/icons/nexture/ni-check-full";
import NiClock from "@/icons/nexture/ni-clock";
import NiUser from "@/icons/nexture/ni-user";

interface TodaySection {
  titleKey: string;
  descriptionKey: string;
  actionKey?: string;
  to?: string;
}

const SECTIONS: TodaySection[] = [
  {
    titleKey: "today-priorities",
    descriptionKey: "today-priorities-description",
    actionKey: "today-view-all",
    to: "/prospects",
  },
  {
    titleKey: "today-pending-applications",
    descriptionKey: "today-pending-applications-description",
    actionKey: "today-view-applications",
    to: "/sales/applications",
  },
  {
    titleKey: "today-renewals",
    descriptionKey: "today-renewals-description",
    actionKey: "today-view-renewals",
    to: "/portfolio/renewals",
  },
  {
    titleKey: "today-learning",
    descriptionKey: "today-learning-description",
    actionKey: "today-view-learning",
    to: "/development/learning",
  },
  {
    titleKey: "today-commissions",
    descriptionKey: "today-commissions-description",
    actionKey: "today-view-earnings",
    to: "/earnings",
  },
  {
    titleKey: "today-notifications",
    descriptionKey: "today-notifications-description",
    actionKey: "today-view-notifications",
    to: "/me/notifications",
  },
];

export default function TodayPage() {
  const { t } = useTranslation();

  return (
    <Box className="flex flex-col gap-6 p-6">
      <Box className="flex flex-wrap items-center justify-between gap-4">
        <Box>
          <Typography variant="h4" component="h1" className="font-bold">
            {t("today-title")}
          </Typography>
          <Typography variant="body1" color="text.secondary" className="mt-1">
            {t("today-subtitle")}
          </Typography>
        </Box>
        <Chip icon={<NiClock size={16} />} label={t("today-readiness-pending")} color="warning" variant="outlined" />
      </Box>

      <Alert severity="info" icon={<NiUser size={20} />}>
        {t("today-data-pending")}
      </Alert>

      <Grid container spacing={3}>
        {SECTIONS.map((section) => (
          <Grid key={section.titleKey} size={{ xs: 12, md: 6, lg: 4 }}>
            <Card className="h-full">
              <CardContent className="flex h-full flex-col gap-3">
                <Box className="flex items-center gap-2">
                  <NiCheckFull size={20} className="text-primary" />
                  <Typography variant="h6" component="h2">
                    {t(section.titleKey)}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" className="flex-1">
                  {t(section.descriptionKey)}
                </Typography>
                <Alert severity="warning" className="!py-1">
                  {t("today-section-empty")}
                </Alert>
                {section.to ? (
                  <Button component={Link} to={section.to} variant="text" size="small" className="self-start">
                    {t(section.actionKey ?? "today-view-all")}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
