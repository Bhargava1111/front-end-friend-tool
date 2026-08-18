import { useEffect } from "react";
import { useLanguage } from "@/lib/client-store";
import { applyDocumentLanguage, normalizeLangCode } from "@/lib/i18n";
import { useHydrated } from "@/hooks/use-hydrated";

/** Keeps <html lang="…"> in sync with the saved language preference. */
export function LanguageSync() {
  const hydrated = useHydrated();
  const code = useLanguage((s) => s.code);

  useEffect(() => {
    if (!hydrated) return;
    applyDocumentLanguage(normalizeLangCode(code));
  }, [hydrated, code]);

  return null;
}
