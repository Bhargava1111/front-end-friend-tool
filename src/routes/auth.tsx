import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, KeyRound, Loader2, Mail, Smartphone, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/hooks/use-shop";
import { requestPhoneOtp, verifyPhoneOtp } from "@/lib/auth-otp.functions";
import { OtpInput } from "@/components/otp-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or register — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content:
          "Sign in with a mobile OTP, email OTP or password to order groceries and pooja essentials with doorstep delivery.",
      },
      { property: "og:title", content: "Sign in — Sri Mahalakshmi Stores" },
      {
        property: "og:description",
        content: "Access your cart, wishlist and orders at Sri Mahalakshmi Stores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup";
type Method = "phone" | "email" | "password";

const METHODS: Array<{ value: Method; label: string; icon: typeof Smartphone }> = [
  { value: "phone", label: "Mobile OTP", icon: Smartphone },
  { value: "email", label: "Email OTP", icon: Mail },
  { value: "password", label: "Password", icon: KeyRound },
];

function useCooldown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [until]);
  const remaining = Math.max(0, Math.ceil((until - now) / 1000));
  return { remaining, start: (seconds: number) => setUntil(Date.now() + seconds * 1000) };
}

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const askPhoneOtp = useServerFn(requestPhoneOtp);
  const confirmPhoneOtp = useServerFn(verifyPhoneOtp);

  const [mode, setMode] = useState<Mode>("login");
  const [method, setMethod] = useState<Method>("phone");
  const [step, setStep] = useState<"details" | "otp">("details");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cooldown = useCooldown();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    setStep("details");
    setCode("");
    setNote(null);
  }, [method, mode]);

  const target = useMemo(
    () => (method === "phone" ? phone.replace(/\D/g, "").slice(-10) : email),
    [method, phone, email],
  );

  async function sendCode() {
    setBusy(true);
    try {
      if (method === "phone") {
        const res = await askPhoneOtp({ data: { phone, fullName } });
        if (!res.ok) {
          if (res.cooldownSeconds) cooldown.start(res.cooldownSeconds);
          toast.error(res.message);
          return;
        }
        cooldown.start(res.cooldownSeconds ?? 30);
        setNote(res.message);
        if (res.previewCode) setCode(res.previewCode);
        setStep("otp");
        toast.success("Code sent");
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: mode === "signup",
            emailRedirectTo: window.location.origin,
            data: mode === "signup" ? { full_name: fullName, phone } : undefined,
          },
        });
        if (error) throw error;
        cooldown.start(45);
        setNote(`We emailed a 6-digit code to ${email}. It expires in 10 minutes.`);
        setStep("otp");
        toast.success("Code sent");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(codeValue: string) {
    if (codeValue.length !== 6 || busy) return;
    setBusy(true);
    try {
      if (method === "phone") {
        const res = await confirmPhoneOtp({ data: { phone, code: codeValue, fullName } });
        if (!res.ok) {
          toast.error(res.message);
          setCode("");
          return;
        }
        const { error } = await supabase.auth.verifyOtp({
          type: "email",
          token_hash: res.tokenHash,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.verifyOtp({ type: "email", email, token: codeValue });
        if (error) throw error;
      }
      toast.success(mode === "signup" ? "Account ready. Welcome!" : "Signed in");
      navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, phone },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Signed in");
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result?.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent.");
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.1fr_1fr]">
      <div className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-primary via-primary to-primary/85 px-6 pb-10 pt-14 text-primary-foreground lg:flex lg:flex-col lg:justify-center lg:rounded-none lg:px-14 lg:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl"
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Groceries &amp; Pooja Essentials
          </span>
          <h1 className="mt-4 text-2xl font-bold leading-tight lg:text-4xl">
            Sri Mahalakshmi Stores
          </h1>
          <p className="mt-1.5 text-sm text-primary-foreground/80 lg:text-base">
            {mode === "login"
              ? "Welcome back — sign in with an OTP in seconds."
              : "Create your account with your mobile number or email."}
          </p>
          <ul className="mt-6 hidden space-y-2 text-sm text-primary-foreground/85 lg:block">
            <li>· 60-minute doorstep delivery</li>
            <li>· Authentic pooja essentials and cold-pressed oils</li>
            <li>· Live order tracking, wallet and rewards</li>
          </ul>
        </div>
      </div>

      <div className="mx-auto w-full max-w-lg px-6 py-7 lg:flex lg:max-w-xl lg:flex-col lg:justify-center lg:px-12">
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
          {(["login", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-xl py-2.5 text-sm font-semibold transition-colors",
                mode === m
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "login" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {METHODS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMethod(value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition-colors sm:text-xs",
                method === value
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {method === "password" ? (
            <form onSubmit={handlePassword} className="space-y-4">
              {mode === "signup" && (
                <>
                  <Field label="Full name" id="fullName">
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Lakshmi Narayanan"
                      required
                    />
                  </Field>
                  <Field label="Mobile number" id="phone">
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                    />
                  </Field>
                </>
              )}
              <Field label="Email" id="email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </Field>
              <Field label="Password" id="password">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </Field>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-semibold text-primary"
                >
                  Forgot password?
                </button>
              )}
              <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>
          ) : step === "details" ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void sendCode();
              }}
            >
              {mode === "signup" && (
                <Field label="Full name" id="otp-name">
                  <Input
                    id="otp-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Lakshmi Narayanan"
                    required
                  />
                </Field>
              )}
              {method === "phone" ? (
                <Field label="Mobile number" id="otp-phone">
                  <div className="flex items-center gap-2">
                    <span className="grid h-10 shrink-0 place-items-center rounded-xl border border-border bg-secondary px-3 text-sm font-semibold text-foreground">
                      +91
                    </span>
                    <Input
                      id="otp-phone"
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                      required
                    />
                  </div>
                </Field>
              ) : (
                <Field label="Email" id="otp-email">
                  <Input
                    id="otp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </Field>
              )}
              <Button
                type="submit"
                className="h-12 w-full rounded-xl text-base"
                disabled={busy || target.length < (method === "phone" ? 10 : 5)}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send OTP
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                We'll send a 6-digit verification code. Standard rates may apply.
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep("details")}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Change{" "}
                {method === "phone" ? "number" : "email"}
              </button>
              <div>
                <Label>Enter the 6-digit code</Label>
                <p className="mb-3 mt-1 text-xs text-muted-foreground">
                  Sent to {method === "phone" ? `+91 ${phone.replace(/\D/g, "").slice(-10)}` : email}
                </p>
                <OtpInput value={code} onChange={setCode} disabled={busy} onComplete={verifyCode} />
              </div>
              {note && (
                <p className="rounded-xl bg-accent-soft px-3 py-2 text-[11px] text-accent-foreground">
                  {note}
                </p>
              )}
              <Button
                type="button"
                onClick={() => verifyCode(code)}
                className="h-12 w-full rounded-xl text-base"
                disabled={busy || code.length !== 6}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify &amp; continue
              </Button>
              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={cooldown.remaining > 0 || busy}
                className="w-full text-center text-xs font-semibold text-primary disabled:text-muted-foreground"
              >
                {cooldown.remaining > 0 ? `Resend code in ${cooldown.remaining}s` : "Resend code"}
              </button>
            </div>
          )}
        </div>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          disabled={busy}
          className="h-12 w-full rounded-xl text-sm font-semibold"
        >
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/terms" className="font-semibold text-primary">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="font-semibold text-primary">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
