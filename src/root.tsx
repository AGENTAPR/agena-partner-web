import { Links, type LoaderFunctionArgs, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, redirect } from "react-router";

import { DEFAULTS } from "@/config";
import {
  LOCAL_STORAGE_KEYS as LS_KEYS,
  type LocaleOption,
  type ModeVariant,
  THEME_MODE_OPTIONS,
  THEME_OPTIONS,
  type ThemeVariant,
} from "@/constants";
import { getRequestLocale } from "@/i18n/locale";
import { ContentType } from "@/types/types";

export interface RootLoaderData {
  locale: LocaleOption;
  theme: ThemeVariant;
  mode: ModeVariant;
  effectiveMode: "light" | "dark";
  content: ContentType;
}

function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  // Server-side redirect for the app entry point — works without client JS.
  if (url.pathname === "/") {
    throw redirect("/today");
  }

  const cookieHeader = request.headers.get("Cookie");

  const locale = getRequestLocale(cookieHeader);
  const themeRaw = readCookie(cookieHeader, LS_KEYS.themeColor);
  const theme =
    themeRaw && (Object.values(THEME_OPTIONS) as string[]).includes(themeRaw)
      ? (themeRaw as ThemeVariant)
      : DEFAULTS.themeColor;

  const modeRaw = readCookie(cookieHeader, LS_KEYS.themeMode);
  const mode =
    modeRaw && (THEME_MODE_OPTIONS as readonly string[]).includes(modeRaw)
      ? (modeRaw as ModeVariant)
      : DEFAULTS.themeMode;

  const effectiveRaw = readCookie(cookieHeader, "-theme-mode-effective");
  const effectiveMode = effectiveRaw === "dark" ? "dark" : "light";

  const contentRaw = readCookie(cookieHeader, LS_KEYS.contentType);
  const content = (Object.values(ContentType) as string[]).includes(contentRaw ?? "")
    ? (contentRaw as ContentType)
    : DEFAULTS.contentType;

  return { locale, theme, mode, effectiveMode, content } satisfies RootLoaderData;
}

export function meta() {
  return [{ title: "Averuna Partner" }, { name: "description", content: "Averuna Partner administration dashboard" }];
}

export default function App() {
  const data = useLoaderData<typeof loader>();

  const htmlClass = [data.theme, data.effectiveMode === "dark" ? "dark" : ""].filter(Boolean).join(" ");

  return (
    <html lang={data.locale} dir="ltr" className={htmlClass || undefined} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/purple-dark.png" media="(prefers-color-scheme: dark)" />
        <link rel="icon" href="/favicon/purple-light.png" media="(prefers-color-scheme: light)" />
        <Meta />
        <Links />
      </head>
      <body className="antialiased">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
