import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import { DEFAULTS } from "@/config";
import { getClientLocale } from "@/i18n/locale";
import en from "@/i18n/messages/en.json";
import id from "@/i18n/messages/id.json";

export const resources = {
  en: { translation: en },
  id: { translation: id },
} as const;

export function createI18n(lng: string = DEFAULTS.locale) {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: DEFAULTS.locale,
    interpolation: { escapeValue: false },
  });
  return instance;
}

const i18n = createI18n(typeof window === "undefined" ? DEFAULTS.locale : getClientLocale());

export default i18n;
