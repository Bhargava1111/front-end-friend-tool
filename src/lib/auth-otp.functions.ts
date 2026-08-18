import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { apiFetch, toJsonBody } from "@/lib/api";

import { env } from "@/lib/env";

const TTL_SECONDS = env.otpTtlSeconds;
const RESEND_COOLDOWN = env.otpResendCooldown;

function isPreviewHost() {
  const host = (getRequestHeader("host") ?? "").toLowerCase();
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
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

export const requestPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; fullName?: string }) => ({
    phone: String(input?.phone ?? ""),
    fullName: input?.fullName?.trim() ?? "",
  }))
  .handler(async ({ data }): Promise<PhoneOtpRequestResult> => {
    const res = await apiFetch<{
      ok: boolean;
      detail?: string;
      expires_at?: string;
      cooldown_seconds?: number;
      preview_code?: string;
    }>("/auth/otp/request/", {
      method: "POST",
      body: toJsonBody({ channel: "phone", identifier: data.phone, full_name: data.fullName }),
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
      message: preview && res.preview_code
        ? `Test mode: your code is ${res.preview_code}.`
        : `Code sent. It expires in ${TTL_SECONDS / 60} minutes.`,
      expiresAt: res.expires_at,
      cooldownSeconds: res.cooldown_seconds ?? RESEND_COOLDOWN,
      ...(preview && res.preview_code ? { previewCode: res.preview_code } : {}),
    };
  });

export type PhoneOtpVerifyResult =
  | { ok: false; message: string; attemptsRemaining?: number }
  | { ok: true; message: string; access: string; refresh: string; user: unknown; isNew: boolean };

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; code: string; fullName?: string }) => ({
    phone: String(input?.phone ?? ""),
    code: String(input?.code ?? "").replace(/\D/g, ""),
    fullName: input?.fullName?.trim() ?? "",
  }))
  .handler(async ({ data }): Promise<PhoneOtpVerifyResult> => {
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
          code: data.code,
          full_name: data.fullName,
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
  });

export const requestEmailOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; fullName?: string }) => ({
    email: String(input?.email ?? "").trim(),
    fullName: input?.fullName?.trim() ?? "",
  }))
  .handler(async ({ data }) => {
    return apiFetch("/auth/otp/request/", {
      method: "POST",
      body: toJsonBody({ channel: "email", identifier: data.email, full_name: data.fullName }),
    });
  });

export const verifyEmailOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; code: string; fullName?: string }) => ({
    email: String(input?.email ?? "").trim(),
    code: String(input?.code ?? "").replace(/\D/g, ""),
    fullName: input?.fullName?.trim() ?? "",
  }))
  .handler(async ({ data }) => {
    return apiFetch("/auth/otp/verify/", {
      method: "POST",
      body: toJsonBody({
        channel: "email",
        identifier: data.email,
        code: data.code,
        full_name: data.fullName,
      }),
    });
  });

export const loginWithPassword = createServerFn({ method: "POST" })
  .inputValidator((input: { identifier: string; password: string }) => input)
  .handler(async ({ data }) => {
    return apiFetch("/auth/login/", {
      method: "POST",
      body: toJsonBody(data),
    });
  });

export const refreshAccessToken = createServerFn({ method: "POST" })
  .inputValidator((input: { refresh: string }) => input)
  .handler(async ({ data }) => {
    return apiFetch<{ access: string }>("/auth/refresh/", {
      method: "POST",
      body: toJsonBody(data),
    });
  });
