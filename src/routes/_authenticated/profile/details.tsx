import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BadgeCheck, Loader2, Mail, Smartphone, User } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-shop";
import { getProfile, updateProfile } from "@/lib/shop.functions";
import {
  requestProfilePhoneOtp,
  verifyProfilePhoneOtp,
  requestProfileEmailOtp,
  verifyProfileEmailOtp,
} from "@/lib/profile.functions";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/otp-input";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { displayEmail } from "@/lib/profile-utils";

export const Route = createFileRoute("/_authenticated/profile/details")({
  head: () => ({
    meta: [{ title: "Personal details — Sri Mahalakshmi Stores" }],
  }),
  component: ProfileDetailsPage,
});

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

function VerifiedBadge({ verified }: { verified: boolean }) {
  if (!verified) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
      <BadgeCheck className="h-3.5 w-3.5" /> Verified
    </span>
  );
}

function ProfileDetailsPage() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const fetchProfile = getProfile;
  const save = updateProfile;
  const askPhoneOtp = useServerFn(requestProfilePhoneOtp);
  const confirmPhoneOtp = useServerFn(verifyProfilePhoneOtp);
  const askEmailOtp = useServerFn(requestProfileEmailOtp);
  const confirmEmailOtp = useServerFn(verifyProfileEmailOtp);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile() as Promise<Profile>,
    enabled: !!session,
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [savedPhone, setSavedPhone] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [phoneOtpStep, setPhoneOtpStep] = useState(false);
  const [emailOtpStep, setEmailOtpStep] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const phoneCooldown = useCooldown();
  const emailCooldown = useCooldown();

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? profile.full_name?.split(" ")[0] ?? "");
    setLastName(profile.last_name ?? profile.full_name?.split(" ").slice(1).join(" ") ?? "");
    const p = (profile.phone ?? "").replace(/\D/g, "").slice(-10);
    setPhone(p);
    setSavedPhone(p);
    const shownEmail = displayEmail(profile.email);
    setEmail(shownEmail);
    setSavedEmail(shownEmail);
    setGstNumber(profile.gst_number ?? "");
    setPhoneVerified(profile.is_phone_verified ?? false);
    setEmailVerified((profile.is_email_verified ?? false) && !!shownEmail);
  }, [profile]);

  const phoneDirty = phone !== savedPhone;
  const emailDirty = email.trim().toLowerCase() !== savedEmail.trim().toLowerCase();
  const phoneOk = phone.length === 10 && (!phoneDirty || phoneVerified);
  const emailOk = email.includes("@") && (!emailDirty || emailVerified);

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          gst_number: gstNumber.trim() || undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function sendPhoneOtp() {
    if (phone.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number.");
      return;
    }
    setOtpBusy(true);
    try {
      const res = await askPhoneOtp({ data: { phone } });
      if (!res.ok) {
        if (res.cooldownSeconds) phoneCooldown.start(res.cooldownSeconds);
        toast.error(res.message);
        return;
      }
      phoneCooldown.start(res.cooldownSeconds ?? 30);
      if ("previewCode" in res && res.previewCode) setPhoneCode(res.previewCode);
      setPhoneOtpStep(true);
      toast.success("Code sent to your phone");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyPhone(code: string) {
    if (code.length !== 6 || otpBusy) return;
    setOtpBusy(true);
    try {
      const res = await confirmPhoneOtp({ data: { phone, code } });
      if (!res.ok) {
        toast.error(res.message);
        setPhoneCode("");
        return;
      }
      setPhoneVerified(true);
      setSavedPhone(phone);
      setPhoneOtpStep(false);
      setPhoneCode("");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Phone verified");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
      setPhoneCode("");
    } finally {
      setOtpBusy(false);
    }
  }

  async function sendEmailOtp() {
    if (!email.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }
    setOtpBusy(true);
    try {
      const res = await askEmailOtp({ data: { email } });
      if (!res.ok) {
        if (res.cooldownSeconds) emailCooldown.start(res.cooldownSeconds);
        toast.error(res.message);
        return;
      }
      emailCooldown.start(res.cooldownSeconds ?? 30);
      if ("previewCode" in res && res.previewCode) setEmailCode(res.previewCode);
      setEmailOtpStep(true);
      toast.success("Code sent to your email");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyEmail(code: string) {
    if (code.length !== 6 || otpBusy) return;
    setOtpBusy(true);
    try {
      const res = await confirmEmailOtp({ data: { email, code } });
      if (!res.ok) {
        toast.error(res.message);
        setEmailCode("");
        return;
      }
      setEmailVerified(true);
      setSavedEmail(email);
      setEmailOtpStep(false);
      setEmailCode("");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Email verified");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
      setEmailCode("");
    } finally {
      setOtpBusy(false);
    }
  }

  const canSave =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    phoneOk &&
    emailOk &&
    !saveMutation.isPending;

  return (
    <PageShell withCartBar={false}>
      <header className="border-b border-border px-4 py-4">
        <Link
          to="/profile"
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </Link>
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <User className="h-5 w-5 text-primary" /> Personal details
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your name, phone, email and optional GST number.
        </p>
      </header>

      <section className="p-4">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 card-elevated">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="first-name">
                    First name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="first-name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Your first name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last-name">
                    Last name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="last-name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Your last name"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tel">
                    <Smartphone className="mr-1 inline h-3.5 w-3.5" />
                    Phone number <span className="text-destructive">*</span>
                  </Label>
                  <VerifiedBadge verified={phoneVerified && !phoneDirty} />
                </div>
                <div className="flex gap-2">
                  <Input
                    id="tel"
                    type="tel"
                    required
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhone(digits);
                      if (digits !== savedPhone) setPhoneVerified(false);
                    }}
                    placeholder="10-digit mobile number"
                    className="flex-1"
                  />
                  {(phoneDirty || !phoneVerified) && (
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 rounded-xl"
                      disabled={phone.length !== 10 || otpBusy || phoneCooldown.remaining > 0}
                      onClick={() => void sendPhoneOtp()}
                    >
                      {phoneCooldown.remaining > 0 ? `${phoneCooldown.remaining}s` : "Verify"}
                    </Button>
                  )}
                </div>
                {phoneOtpStep && (
                  <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Enter the 6-digit code sent to +91 {phone}</p>
                    <OtpInput
                      value={phoneCode}
                      onChange={setPhoneCode}
                      disabled={otpBusy}
                      onComplete={(code) => void verifyPhone(code)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email">
                    <Mail className="mr-1 inline h-3.5 w-3.5" />
                    Email address <span className="text-destructive">*</span>
                  </Label>
                  <VerifiedBadge verified={emailVerified && !emailDirty} />
                </div>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (e.target.value.trim().toLowerCase() !== savedEmail.trim().toLowerCase()) {
                        setEmailVerified(false);
                      }
                    }}
                    placeholder="you@example.com"
                    className="flex-1"
                  />
                  {(emailDirty || !emailVerified) && (
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 rounded-xl"
                      disabled={!email.includes("@") || otpBusy || emailCooldown.remaining > 0}
                      onClick={() => void sendEmailOtp()}
                    >
                      {emailCooldown.remaining > 0 ? `${emailCooldown.remaining}s` : "Verify"}
                    </Button>
                  )}
                </div>
                {emailOtpStep && (
                  <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Enter the 6-digit code sent to {email}</p>
                    <OtpInput
                      value={emailCode}
                      onChange={setEmailCode}
                      disabled={otpBusy}
                      onComplete={(code) => void verifyEmail(code)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gst">
                  GST number{" "}
                  <span className="text-xs font-normal text-muted-foreground">(optional — business owners)</span>
                </Label>
                <Input
                  id="gst"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </div>

              <Button
                className="w-full rounded-xl"
                disabled={!canSave}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save profile"
                )}
              </Button>

              {(!phoneOk || !emailOk) && (
                <p className={cn("text-center text-xs text-muted-foreground")}>
                  Verify your phone and email before saving your profile.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}
