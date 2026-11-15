import { TODAY_SCENARIOS, TODAY_VARIANTS } from "../scenarios";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { Box, Button, MenuItem, Select, Typography } from "@mui/material";

/** Development/test-only scenario switcher. Never rendered in production. */
export function ScenarioSwitcher() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const scenario = params.get("scenario") ?? "active-eligible";
  const variant = params.get("variant") ?? "normal";

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "active-eligible" || value === "normal") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <Box className="bg-grey-500/10 mb-2 flex flex-wrap items-center gap-2 rounded-lg p-2">
      <Typography variant="caption" className="font-semibold">
        {t("today-scenario-switcher")}
      </Typography>
      <Select
        size="small"
        value={scenario}
        onChange={(e) => update("scenario", e.target.value)}
        aria-label={t("today-scenario-switcher")}
      >
        {TODAY_SCENARIOS.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {t(s.labelKey)}
          </MenuItem>
        ))}
      </Select>
      <Select
        size="small"
        value={variant}
        onChange={(e) => update("variant", e.target.value)}
        aria-label={t("today-variant-switcher")}
      >
        {TODAY_VARIANTS.map((v) => (
          <MenuItem key={v} value={v}>
            {v}
          </MenuItem>
        ))}
      </Select>
      <Button size="small" variant="text" onClick={() => setParams({}, { replace: true })}>
        {t("today-scenario-reset")}
      </Button>
    </Box>
  );
}
