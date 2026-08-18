import { createFileRoute } from "@tanstack/react-router";
import { Check, Languages } from "lucide-react";
import { toast } from "sonner";
import { PageShell, TopBar } from "@/components/page-shell";
import { LANGUAGES } from "@/lib/content";
import { useLanguage } from "@/lib/client-store";
import { applyDocumentLanguage, normalizeLangCode } from "@/lib/i18n";
import { useHydrated } from "@/hooks/use-hydrated";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/language")({
  head: () => ({
    meta: [
      { title: "Language — Sri Mahalakshmi Stores" },
      { name: "description", content: "Choose the language you want to browse and order in." },
      { property: "og:title", content: "Language settings" },
      { property: "og:description", content: "Pick from English, Tamil, Hindi, Telugu, Kannada and Malayalam." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LanguagePage,
});

function LanguagePage() {
  const hydrated = useHydrated();
  const { t } = useI18n();
  const code = useLanguage((s) => s.code);
  const setCode = useLanguage((s) => s.setCode);

  return (
    <PageShell>
      <TopBar title={t("language.title")} subtitle={t("language.subtitle")} backTo="/profile" />

      <div className="flex items-center gap-2 px-4 pt-4 text-xs text-muted-foreground">
        <Languages className="h-4 w-4 text-primary" />
        {t("language.note")}
      </div>

      <div className="space-y-2.5 p-4">
        {LANGUAGES.map((lang) => {
          const active = hydrated && normalizeLangCode(code) === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setCode(lang.code);
                applyDocumentLanguage(normalizeLangCode(lang.code));
                toast.success(t("language.saved", { label: lang.label }));
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                active ? "border-primary bg-primary-soft" : "border-border bg-card",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{lang.label}</p>
                <p className="text-xs text-muted-foreground">{lang.native}</p>
              </div>
              {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}
