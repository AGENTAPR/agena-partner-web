import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { Alert, Box, Button, Paper, Typography } from "@mui/material";

import Logo from "@/components/logo/logo";
import { useAuth } from "@/features/auth/auth-context";
import { safeRedirectPath } from "@/features/auth/safe-redirect";
import NiShieldCheck from "@/icons/nexture/ni-shield-check";

const ERROR_KEYS: Record<string, string> = {
  "callback-invalid": "auth-error-callback",
  "dependency-unavailable": "auth-error-unavailable",
};

export default function Page() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const [params] = useSearchParams();
  const redirectTo = safeRedirectPath(params.get("redirectTo"));
  const errorKey = params.get("error");
  const loggedOut = params.get("logged_out") === "1";
  const sessionExpired = params.get("reason") === "expired";

  return (
    <Box className="bg-waves flex min-h-screen w-full items-center justify-center bg-cover bg-center p-4">
      <Paper elevation={3} className="bg-background-paper shadow-darker-xs w-lg max-w-full rounded-4xl py-14">
        <Box className="flex flex-col gap-4 px-8 sm:px-14">
          <Box className="mb-10 flex justify-center">
            <Logo classNameMobile="hidden" />
          </Box>

          <Box className="flex flex-col gap-2">
            <Typography variant="h1" component="h1" className="mb-1">
              {t("auth-sign-in-title")}
            </Typography>
            <Typography variant="body1" className="text-text-primary">
              {t("auth-sign-in-description")}
            </Typography>
          </Box>

          {state === "AUTHENTICATED" ? (
            <Alert severity="info" icon={<NiShieldCheck />} className="neutral bg-background-paper/60!">
              {t("auth-sign-in-already-authenticated")}
            </Alert>
          ) : null}

          {loggedOut ? (
            <Alert severity="success" className="neutral bg-background-paper/60!" aria-live="polite">
              {t("auth-sign-out-success")}
            </Alert>
          ) : null}

          {sessionExpired ? (
            <Alert severity="warning" className="neutral bg-background-paper/60!" aria-live="polite">
              {t("auth-error-session-expired")}
            </Alert>
          ) : null}

          {errorKey && ERROR_KEYS[errorKey] ? (
            <Alert severity="error" className="neutral bg-background-paper/60!" aria-live="assertive">
              {t(ERROR_KEYS[errorKey])}
            </Alert>
          ) : null}

          <Box className="flex flex-col gap-3">
            {/* Plain href — full-document navigation so the 303 chain
                through /auth/login → Keycloak works without client routing. */}
            <Button
              href={`/auth/login?return_to=${encodeURIComponent(redirectTo)}`}
              variant="contained"
              size="large"
              className="w-full"
            >
              {t("auth-sign-in-sso")}
            </Button>
            <Typography variant="body2" className="text-text-secondary text-center">
              {t("auth-sign-in-sso-note")}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
