import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Fresh groceries delivered",
    body: "Rice, dals, oils and daily staples from trusted brands — at your doorstep.",
  },
  {
    title: "Authentic pooja essentials",
    body: "Camphor, agarbatti, brass items and festival combos curated for your rituals.",
  },
  {
    title: "Enable location for faster delivery",
    body: "We use your location to show nearby stores and accurate delivery times.",
  },
];

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  function finish() {
    localStorage.setItem("onboarding_done", "1");
    navigate({ to: "/", replace: true });
  }

  function next() {
    if (step === STEPS.length - 1) {
      if (step === 2 && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => finish(), () => finish());
      } else {
        finish();
      }
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10">
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="mt-4 text-2xl font-bold text-foreground">{current.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{current.body}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={finish}>
          Skip
        </Button>
        <Button className="flex-1" onClick={next}>
          {step === STEPS.length - 1 ? "Get started" : "Next"}
        </Button>
      </div>
    </div>
  );
}
