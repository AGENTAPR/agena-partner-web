import { useTranslation } from "react-i18next";
import type { ActionFunctionArgs } from "react-router";
import { Form, redirect } from "react-router";

import { Box, Button, Card, CardContent, Typography } from "@mui/material";

import { logout, verifySameOrigin } from "@/server/auth.server";

export async function action({ request, context }: ActionFunctionArgs) {
  if (!verifySameOrigin(request)) {
    return new Response("Forbidden", { status: 403 });
  }
  const { location, headers } = await logout(request, context);
  throw redirect(location, { headers });
}

export async function loader() {
  throw redirect("/auth/sign-in");
}

export default function SignOutRoute() {
  const { t } = useTranslation();

  return (
    <Box className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <Typography variant="h5">{t("auth-sign-out-title")}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t("auth-sign-out-description")}
          </Typography>
          <Form method="post">
            <Button type="submit" variant="contained">
              {t("auth-sign-out-confirm")}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </Box>
  );
}
