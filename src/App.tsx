import { Suspense, useMemo } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { useRouteLoaderData } from "react-router";

import { Box, StyledEngineProvider } from "@mui/material";

import BackgroundWrapper from "@/components/layout/containers/background-wrapper";
import SnackbarWrapper from "@/components/layout/containers/snackbar-wrapper";
import LayoutContextProvider from "@/components/layout/layout-context";
import Loading from "@/pages/loading";
import AppRoutes from "@/app-routes";
import { DEFAULTS } from "@/config";
import { createI18n } from "@/i18n/i18n";
import type { RootLoaderData } from "@/root";
import ThemeProvider from "@/theme/theme-provider";

const App = () => {
  const rootData = useRouteLoaderData("root") as RootLoaderData | undefined;
  const locale = rootData?.locale ?? DEFAULTS.locale;

  // Per-request i18next instance so SSR renders the request locale
  const i18n = useMemo(() => createI18n(locale), [locale]);

  return (
    <I18nextProvider i18n={i18n}>
      <AppContent initialPrefs={rootData} />
    </I18nextProvider>
  );
};

const AppContent = ({ initialPrefs }: { initialPrefs?: RootLoaderData }) => {
  const { i18n } = useTranslation();
  const direction = "ltr";

  return (
    <>
      <StyledEngineProvider enableCssLayer>
        <Box
          lang={i18n.language}
          dir={direction}
          className="font-mulish font-urbanist relative overflow-hidden antialiased"
        >
          {/* Initial loader */}
          <div id="initial-loader">
            <div className="spinner"></div>
          </div>
          {/* Initial loader end */}

          <ThemeProvider
            initialPrefs={
              initialPrefs
                ? {
                    theme: initialPrefs.theme,
                    mode: initialPrefs.mode,
                    content: initialPrefs.content,
                  }
                : undefined
            }
          >
            <LayoutContextProvider>
              <BackgroundWrapper />
              <SnackbarWrapper>
                <Suspense fallback={<Loading />}>
                  {/* Routes */}
                  <AppRoutes />
                </Suspense>
              </SnackbarWrapper>
            </LayoutContextProvider>
          </ThemeProvider>
        </Box>
      </StyledEngineProvider>
    </>
  );
};

export default App;
