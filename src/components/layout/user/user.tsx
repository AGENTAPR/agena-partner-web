import UserLanguageSwitch from "./user-language-switch";
import UserModeSwitch from "./user-mode-switch";
import UserThemeSwitch from "./user-theme-switch";
import { SyntheticEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, useNavigate } from "react-router-dom";

import { Avatar, Box, Card, CardContent, Divider, Fade, ListItemIcon, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Popper from "@mui/material/Popper";

import { useAuth } from "@/features/auth/auth-context";
import NiBuilding from "@/icons/nexture/ni-building";
import NiDocumentFull from "@/icons/nexture/ni-document-full";
import NiFolder from "@/icons/nexture/ni-folder";
import NiQuestionHexagon from "@/icons/nexture/ni-question-hexagon";
import NiSettings from "@/icons/nexture/ni-settings";
import NiUser from "@/icons/nexture/ni-user";
import { cn } from "@/lib/utils";

export default function User() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation();
  const { partner } = useAuth();
  const displayName = partner?.displayName ?? null;
  const initials = displayName
    ? displayName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : null;

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event | SyntheticEvent) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return;
    }
    setOpen(false);
  };

  const navigate = useNavigate();

  return (
    <>
      <Box ref={anchorRef}>
        {/* Desktop button */}
        <Button
          variant="text"
          color="text-primary"
          className={cn(
            "group hover:bg-grey-25 ms-2 hidden gap-2 rounded-lg py-0! pe-0! hover:py-1! hover:pe-1.5! md:flex",
            open && "active bg-grey-25 py-1! pe-1.5!",
          )}
          onClick={handleToggle}
        >
          <Box>{displayName ?? t("user-signed-in")}</Box>
          <Avatar
            alt={displayName ?? "avatar"}
            src={undefined}
            className={cn(
              "large transition-all group-hover:ms-0.5 group-hover:h-8 group-hover:w-8",
              open && "ms-0.5 h-8! w-8!",
            )}
          >
            {initials}
          </Avatar>
        </Button>
        {/* Desktop button */}

        {/* Mobile button */}
        <Button
          variant="text"
          size="large"
          color="text-primary"
          className={cn(
            "icon-only hover:bg-grey-25 hover-icon-shrink [&.active]:text-primary group ms-1 me-1 p-0! hover:p-1.5! md:hidden",
            open && "active bg-grey-25 p-1.5!",
          )}
          onClick={handleToggle}
          startIcon={
            <Avatar
              alt={displayName ?? "avatar"}
              src={undefined}
              className={cn("large transition-all group-hover:h-7 group-hover:w-7", open && "h-7! w-7!")}
            >
              {initials}
            </Avatar>
          }
        />
        {/* Mobile button */}
      </Box>

      <Popper
        open={open}
        anchorEl={() => anchorRef.current!}
        role={undefined}
        placement="bottom-end"
        className="mt-3!"
        transition
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps}>
            <Box>
              <ClickAwayListener onClickAway={handleClose}>
                <Card className="shadow-darker-sm!">
                  <CardContent>
                    <Box className="max-w-64 sm:w-72 sm:max-w-none">
                      <Box className="mb-4 flex flex-col items-center">
                        <Avatar alt={displayName ?? "avatar"} src={undefined} className="large mb-2">
                          {initials}
                        </Avatar>
                        <Typography variant="subtitle1" component="p">
                          {displayName ?? t("user-signed-in")}
                        </Typography>
                        <Typography variant="body2" component="p" className="text-text-secondary -mt-2">
                          {partner?.agentCode ?? partner?.workspace ?? t("user-signed-in-description")}
                        </Typography>
                      </Box>

                      <Divider className="large" />
                      <MenuList className="p-0">
                        <MenuItem
                          onClick={(event) => {
                            handleClose(event);
                            navigate("/today");
                          }}
                        >
                          <ListItemIcon>
                            <NiUser size={20} />
                          </ListItemIcon>
                          {t("user-overview")}
                        </MenuItem>
                        <MenuItem
                          onClick={(event) => {
                            handleClose(event);
                            navigate("/me/preferences");
                          }}
                        >
                          <ListItemIcon>
                            <NiSettings size={20} />
                          </ListItemIcon>
                          {t("user-profile")}
                        </MenuItem>
                        <MenuItem
                          onClick={(event) => {
                            handleClose(event);
                            navigate("/support/tickets");
                          }}
                        >
                          <ListItemIcon>
                            <NiBuilding size={20} />
                          </ListItemIcon>
                          {t("user-issues")}
                        </MenuItem>
                        <MenuItem
                          onClick={(event) => {
                            handleClose(event);
                            navigate("/portfolio/policies");
                          }}
                        >
                          <ListItemIcon>
                            <NiFolder size={20} />
                          </ListItemIcon>
                          {t("user-projects")}
                        </MenuItem>
                        <Divider className="large" />

                        <UserModeSwitch />
                        <UserThemeSwitch />
                        <UserLanguageSwitch />

                        <Divider className="large" />
                        <MenuItem
                          onClick={(event) => {
                            handleClose(event);
                            navigate("/support");
                          }}
                        >
                          <ListItemIcon>
                            <NiDocumentFull size={20} />
                          </ListItemIcon>
                          {t("user-documentation")}
                        </MenuItem>
                        <MenuItem
                          onClick={(event) => {
                            handleClose(event);
                            navigate("/resources/faq");
                          }}
                        >
                          <ListItemIcon>
                            <NiQuestionHexagon size={20} />
                          </ListItemIcon>
                          {t("user-help")}
                        </MenuItem>
                      </MenuList>
                      <Box className="my-8"></Box>
                      <Form method="post" action="/auth/sign-out">
                        <Button type="submit" variant="outlined" size="tiny" color="grey" className="w-full">
                          {t("user-sign-out")}
                        </Button>
                      </Form>
                    </Box>
                  </CardContent>
                </Card>
              </ClickAwayListener>
            </Box>
          </Fade>
        )}
      </Popper>
    </>
  );
}
