import { SyntheticEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { Chip, Fade, ListItemIcon, Menu, MenuItem, PopoverVirtualElement } from "@mui/material";

import NiChevronRightSmall from "@/icons/nexture/ni-chevron-right-small";
import NiPaintRoller from "@/icons/nexture/ni-paint-roller";
import NiSquircle from "@/icons/nexture/ni-squircle";
import { cn } from "@/lib/utils";
import { useThemeContext } from "@/theme/theme-provider";

export default function UserThemeSwitch() {
  const { theme, setTheme } = useThemeContext();
  const [anchorElMode, setAnchorElMode] = useState<EventTarget | Element | PopoverVirtualElement | null>(null);
  const openMode = Boolean(anchorElMode);
  const handleClickMode = (event: Event | SyntheticEvent) => {
    setAnchorElMode(event.currentTarget);
  };
  const handleCloseMode = () => {
    setAnchorElMode(null);
  };

  const { t } = useTranslation();

  const getModeLabel = () => {
    if (theme === "theme-blue") {
      return t("user-blue");
    } else if (theme === "theme-jade") {
      return t("user-jade");
    } else if (theme === "theme-apricot") {
      return t("user-apricot");
    } else {
      return t("user-aubergine");
    }
  };

  const themeOptions = [
    { value: "theme-aubergine", label: "user-aubergine", colorClass: "text-[#563D63]" },
    { value: "theme-jade", label: "user-jade", colorClass: "text-[#176E63]" },
    { value: "theme-apricot", label: "user-apricot", colorClass: "text-[#D58A63]" },
    { value: "theme-blue", label: "user-blue", colorClass: "text-[#356FA8]" },
  ] as const;

  return (
    <>
      <MenuItem onClick={handleClickMode} className={cn(openMode && "bg-grey-500/10")}>
        <ListItemIcon>
          <NiPaintRoller size={20} />
        </ListItemIcon>
        <div className="w-full">Theme</div>
        <Chip variant="outlined" label={getModeLabel()} size="small" />
        <ListItemIcon>
          <NiChevronRightSmall
            size={20}
            className={cn("ms-1 me-0 transition-transform rtl:rotate-180", openMode && "rotate-90 rtl:rotate-90")}
          />
        </ListItemIcon>
      </MenuItem>
      <Menu
        anchorEl={anchorElMode as Element}
        disableScrollLock
        open={openMode}
        onClose={handleCloseMode}
        classes={{ paper: "mt-1 w-72" }}
        slots={{
          transition: Fade,
        }}
      >
        {themeOptions.map((option) => (
          <MenuItem
            key={option.value}
            className={cn(theme === option.value && "active")}
            onClick={() => {
              handleCloseMode();
              if (theme !== option.value) setTheme(option.value);
            }}
          >
            <ListItemIcon>
              <NiSquircle size={20} className={option.colorClass} />
            </ListItemIcon>
            {t(option.label)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
