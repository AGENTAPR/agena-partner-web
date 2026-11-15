import Cookies from "js-cookie";
import type { i18n as I18nInstance } from "i18next";

import { DEFAULTS } from "@/config";
import { COOKIE_KEYS, LOCALES, LocaleOption } from "@/constants";
import i18n from "@/i18n/i18n";

function isLocale(value: string | undefined | null): value is LocaleOption {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

// Get client locale from cookie
export function getClientLocale(): LocaleOption {
  const locale = Cookies.get(COOKIE_KEYS.locale);
  return isLocale(locale) ? locale : DEFAULTS.locale;
}

// Parse locale from a Cookie request header (server-safe, no js-cookie)
export function getRequestLocale(cookieHeader: string | null): LocaleOption {
  if (!cookieHeader) return DEFAULTS.locale;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_KEYS.locale) {
      const value = decodeURIComponent(rest.join("="));
      return isLocale(value) ? value : DEFAULTS.locale;
    }
  }
  return DEFAULTS.locale;
}

// Set client locale in cookie and i18n instance
export function setClientLocale(locale: LocaleOption, instance: I18nInstance = i18n) {
  instance.changeLanguage(locale);
  Cookies.set(COOKIE_KEYS.locale, locale, { sameSite: "lax" });
}
