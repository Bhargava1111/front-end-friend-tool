import { apiFetch, toJsonBody } from "@/lib/api";
import { env } from "@/lib/env";

const TTL_SECONDS = env.otpTtlSeconds;
const RESEND_COOLDOWN = env.otpResendCooldown;

function isPreviewHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.includes("id-preview--") ||
    host.includes("-dev.lovable.app") ||
    host.includes("lovableproject.com")
  );
}

export type PhoneOtpRequestResult = {
  ok: boolean;
  message: string;
  expiresAt?: string;
  cooldownSeconds?: number;
  previewCode?: string;
};

export async function requestPhoneOtp({
  data,
}: {
  data: { phone: string; fullName?: string };
}): Promise<PhoneOtpRequestResult> {
  const res = await apiFetch<{
    ok: boolean;
    detail?: string;
    expires_at?: string;
    cooldown_seconds?: number;
    preview_code?: string;
  }>("/auth/otp/request/", {
    method: "POST",
    body: toJsonBody({ channel: "phone", identifier: data.phone, full_name: data.fullName?.trim() ?? "" }),
  });

  if (!res.ok) {
    return {
      ok: false,
      message: res.detail ?? "Could not send code.",
      cooldownSeconds: res.cooldown_seconds,
    };
  }

  const preview = isPreviewHost();
  return {
    ok: true,
    message:
      preview && res.preview_code
        ? `Test mode: your code is ${res.preview_code}.`
        : `Code sent. It expires in ${TTL_SECONDS / 60} minutes.`,
    expiresAt: res.expires_at,
    cooldownSeconds: res.cooldown_seconds ?? RESEND_COOLDOWN,
    ...(preview && res.preview_code ? { previewCode: res.preview_code } : {}),
  };
}

export type PhoneOtpVerifyResult =
  | { ok: false; message: string; attemptsRemaining?: number }
  | { ok: true; message: string; access: string; refresh: string; user: unknown; isNew: boolean };

export async function verifyPhoneOtp({
  data,
}: {
  data: { phone: string; code: string; fullName?: string };
}): Promise<PhoneOtpVerifyResult> {
  try {
    const res = await apiFetch<{
      ok: boolean;
      detail?: string;
      attempts_remaining?: number;
      access: string;
      refresh: string;
      user: unknown;
      is_new: boolean;
    }>("/auth/otp/verify/", {
      method: "POST",
      body: toJsonBody({
        channel: "phone",
        identifier: data.phone,
        code: String(data.code ?? "").replace(/\D/g, ""),
        full_name: data.fullName?.trim() ?? "",
      }),
    });

    if (!res.ok) {
      return {
        ok: false,
        message: res.detail ?? "Verification failed.",
        attemptsRemaining: res.attempts_remaining,
      };
    }

    return {
      ok: true,
      message: "Verified.",
      access: res.access,
      refresh: res.refresh,
      user: res.user,
      isNew: res.is_new,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Verification failed." };
  }
}

export async function requestEmailOtp({ data }: { data: { email: string; fullName?: string } }) {
  return apiFetch("/auth/otp/request/", {
    method: "POST",
    body: toJsonBody({
      channel: "email",
      identifier: data.email.trim(),
      full_name: data.fullName?.trim() ?? "",
    }),
  });
}

export async function verifyEmailOtp({
  data,
}: {
  data: { email: string; code: string; fullName?: string };
}) {
  return apiFetch("/auth/otp/verify/", {
    method: "POST",
    body: toJsonBody({
      channel: "email",
      identifier: data.email.trim(),
      code: String(data.code ?? "").replace(/\D/g, ""),
      full_name: data.fullName?.trim() ?? "",
    }),
  });
}

export async function loginWithPassword({
  data,
}: {
  data: { identifier: string; password: string };
}) {
  return apiFetch("/auth/login/", {
    method: "POST",
    body: toJsonBody(data),
  });
}

export async function refreshAccessToken({ data }: { data: { refresh: string } }) {
  return apiFetch<{ access: string }>("/auth/refresh/", {
    method: "POST",
    body: toJsonBody(data),
  });
}
