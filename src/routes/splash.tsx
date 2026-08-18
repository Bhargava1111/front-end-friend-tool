import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/splash")({
  component: SplashPage,
});

function SplashPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const seen = localStorage.getItem("onboarding_done");
    const t = setTimeout(() => {
      navigate({ to: seen ? "/" : "/onboarding", replace: true });
    }, 1800);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-primary text-primary-foreground">
      <div className="text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-primary-foreground/15 text-3xl font-bold">
          SM
        </div>
        <h1 className="mt-4 text-2xl font-bold">Sri Mahalakshmi Stores</h1>
        <p className="mt-1 text-sm text-primary-foreground/75">Groceries & Pooja Essentials</p>
      </div>
    </div>
  );
}
