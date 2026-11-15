import { TODAY_SCENARIOS, TODAY_VARIANTS } from "../scenarios";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { Box, Button, MenuItem, Popover, Select, Typography } from "@mui/material";

import NiSettings from "@/icons/nexture/ni-settings";

/** Compact development-only scenario switcher — never rendered in production. */
export function ScenarioSwitcher() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const scenario = params.get("scenario") ?? "active-eligible";
  const variant = params.get("variant") ?? "normal";

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    const fallback = key === "scenario" ? "active-eligible" : "normal";
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="grey"
        startIcon={<NiSettings size={16} />}
        onClick={(e) => setAnchor(e.currentTarget)}
        className="self-start"
        aria-label={t("today-scenario-switcher")}
      >
        {t("today-scenario-switcher")}
      </Button>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box className="flex flex-col gap-2 p-3" sx={{ minWidth: 220 }}>
          <Typography variant="caption" color="text.secondary" className="font-semibold">
            {t("today-dev-tools")}
          </Typography>
          <Select
            size="small"
            fullWidth
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
            fullWidth
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
      </Popover>
    </>
  );
}
