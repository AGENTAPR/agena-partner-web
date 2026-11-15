import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

export default function VersionSelect({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <Box className={className}>
      <Box className="border-grey-300 text-text-secondary truncate rounded-md border px-2 py-1 text-xs">
        {t("workspace-label")}
      </Box>
    </Box>
  );
}
