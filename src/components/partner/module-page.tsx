import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { Alert, Box, Button, Card, CardContent, Typography } from "@mui/material";

interface ModulePageProps {
  titleKey: string;
  descriptionKey?: string;
}

/**
 * Honest placeholder shell for Partner modules whose BFF contract is not
 * yet available. Never renders fabricated business data.
 */
export function ModulePage({ titleKey, descriptionKey }: ModulePageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box className="flex flex-col gap-6 p-6">
      <Box>
        <Typography variant="h4" component="h1" className="font-bold">
          {t(titleKey)}
        </Typography>
        {descriptionKey ? (
          <Typography variant="body1" color="text.secondary" className="mt-1">
            {t(descriptionKey)}
          </Typography>
        ) : null}
      </Box>

      <Card>
        <CardContent className="flex flex-col items-start gap-3">
          <Alert severity="info" className="w-full">
            {t("partner-module-pending")}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            {t("partner-module-pending-description")}
          </Typography>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            {t("partner-go-back")}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

/** Detail-page shell for /:id routes — shows the resource kind, never fake data. */
export function DetailPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  const params = useParams();
  const id = Object.values(params).find(Boolean) ?? "";

  return (
    <Box className="flex flex-col gap-6 p-6">
      <Typography variant="h4" component="h1" className="font-bold">
        {t(titleKey)}
      </Typography>
      <Card>
        <CardContent className="flex flex-col items-start gap-3">
          <Alert severity="info" className="w-full">
            {t("partner-detail-pending", { id })}
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}
