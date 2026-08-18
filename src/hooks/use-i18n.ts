import { useLanguage } from "@/lib/client-store";
import { normalizeLangCode, translate, type LangCode } from "@/lib/i18n";
import { useHydrated } from "@/hooks/use-hydrated";

export function useI18n() {
  const hydrated = useHydrated();
  const code = useLanguage((s) => s.code);
  const lang = normalizeLangCode(hydrated ? code : "en") as LangCode;

  function t(key: string, vars?: Record<string, string>) {
    return translate(lang, key, vars);
  }

  return { t, lang };
}
