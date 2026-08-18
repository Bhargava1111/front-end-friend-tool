import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { requestAdminPanelOtp, verifyAdminPanelOtp } from "@/lib/admin.functions";
import { saveAdminPanelToken } from "@/lib/admin-session";
import { OtpInput } from "@/components/otp-input";
import { Button } from "@/components/ui/button";

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

export function AdminOtpGate({ onVerified }: { onVerified: () => void }) {
  const askOtp = useServerFn(requestAdminPanelOtp);
  const confirmOtp = useServerFn(verifyAdminPanelOtp);
  const cooldown = useCooldown();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [maskedTarget, setMaskedTarget] = useState<string | null>(null);
  const [channel, setChannel] = useState<"email" | "phone" | null>(null);
  const [idleMinutes, setIdleMinutes] = useState(10);

  async function sendOtp() {
    setSending(true);
    try {
      const res = await askOtp();
      if (!res.ok) {
        toast.error(res.detail ?? "Could not send verification code.");
        if (res.cooldown_seconds) cooldown.start(res.cooldown_seconds);
        return;
      }
      setMaskedTarget(res.masked_target ?? null);
      setChannel((res.channel as "email" | "phone") ?? "email");
      if (res.idle_timeout_seconds) setIdleMinutes(Math.round(res.idle_timeout_seconds / 60));
      if (res.preview_code) {
        toast.message(`Test mode: admin OTP is ${res.preview_code}`);
      } else {
        toast.success("Verification code sent.");
      }
      if (res.cooldown_seconds) cooldown.start(res.cooldown_seconds);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send code.");
    } finally {
      setSending(false);
      setLoading(false);
    }
  }

  async function verify(codeValue: string) {
    if (codeValue.length < 6 || verifying) return;
    setVerifying(true);
    try {
      const res = await confirmOtp({ data: { code: codeValue } });
      if (!res.ok || !res.session_token) {
        toast.error(res.detail ?? "Incorrect code.");
        setCode("");
        return;
      }
      saveAdminPanelToken(res.session_token);
      toast.success("Admin access granted.");
      onVerified();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  useEffect(() => {
    void sendOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 card-elevated">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-center text-lg font-semibold text-foreground">Admin verification</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          For security, enter the one-time code sent to your admin{" "}
          {channel === "phone" ? "mobile" : "email"}
          {maskedTarget ? ` (${maskedTarget})` : ""}.
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          The panel locks after {idleMinutes} minutes of inactivity. You will need a new code to re-enter.
        </p>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <OtpInput
                value={code}
                onChange={setCode}
                disabled={verifying}
                onComplete={verify}
              />
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  className="h-11 w-full rounded-xl"
                  disabled={verifying || code.length < 6}
                  onClick={() => verify(code)}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…
                    </>
                  ) : (
                    "Unlock admin panel"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-xl"
                  disabled={sending || cooldown.remaining > 0}
                  onClick={() => void sendOtp()}
                >
                  {cooldown.remaining > 0
                    ? `Resend in ${cooldown.remaining}s`
                    : sending
                      ? "Sending…"
                      : "Resend code"}
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to profile
          </Link>
        </div>
      </div>
    </div>
  );
}
