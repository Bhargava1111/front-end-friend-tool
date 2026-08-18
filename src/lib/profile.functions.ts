import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireAuth } from "@/integrations/django/auth-middleware";
import { apiFetch, toJsonBody } from "@/lib/api";
import { env } from "@/lib/env";
import type { Profile } from "@/lib/types";

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

export const requestProfilePhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: { phone: string }) => ({ phone: String(input?.phone ?? "") }))
  .handler(async ({ data, context }) => {
    const res = await apiFetch<{
      ok: boolean;
      detail?: string;
      expires_at?: string;
      cooldown_seconds?: number;
      preview_code?: string;
    }>("/me/otp/request/", {
      method: "POST",
      token: context.accessToken,
      body: toJsonBody({ channel: "phone", phone: data.phone }),
    });

    if (!res.ok) {
      return {
        ok: false as const,
        message: res.detail ?? "Could not send code.",
        cooldownSeconds: res.cooldown_seconds,
      };
    }

    const preview = isPreviewHost();
    return {
      ok: true as const,
      message:
        preview && res.preview_code
          ? `Test mode: your code is ${res.preview_code}.`
          : `Code sent. It expires in ${env.otpTtlSeconds / 60} minutes.`,
      expiresAt: res.expires_at,
      cooldownSeconds: res.cooldown_seconds ?? env.otpResendCooldown,
      ...(preview && res.preview_code ? { previewCode: res.preview_code } : {}),
    };
  });

export const verifyProfilePhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: { phone: string; code: string }) => ({
    phone: String(input?.phone ?? ""),
    code: String(input?.code ?? "").replace(/\D/g, ""),
  }))
  .handler(async ({ data, context }) => {
    try {
      const res = await apiFetch<{
        ok: boolean;
        detail?: string;
        attempts_remaining?: number;
        profile: Profile;
      }>("/me/otp/verify/", {
        method: "POST",
        token: context.accessToken,
        body: toJsonBody({ channel: "phone", phone: data.phone, code: data.code }),
      });

      if (!res.ok) {
        return {
          ok: false as const,
          message: res.detail ?? "Verification failed.",
          attemptsRemaining: res.attempts_remaining,
        };
      }

      return { ok: true as const, message: "Phone verified.", profile: res.profile };
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : "Verification failed." };
    }
  });

export const requestProfileEmailOtp = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: { email: string }) => ({ email: String(input?.email ?? "").trim() }))
  .handler(async ({ data, context }) => {
    const res = await apiFetch<{
      ok: boolean;
      detail?: string;
      expires_at?: string;
      cooldown_seconds?: number;
      preview_code?: string;
    }>("/me/otp/request/", {
      method: "POST",
      token: context.accessToken,
      body: toJsonBody({ channel: "email", email: data.email }),
    });

    if (!res.ok) {
      return {
        ok: false as const,
        message: res.detail ?? "Could not send code.",
        cooldownSeconds: res.cooldown_seconds,
      };
    }

    const preview = isPreviewHost();
    return {
      ok: true as const,
      message:
        preview && res.preview_code
          ? `Test mode: your code is ${res.preview_code}.`
          : `We emailed a 6-digit code to ${data.email}.`,
      expiresAt: res.expires_at,
      cooldownSeconds: res.cooldown_seconds ?? env.otpResendCooldown,
      ...(preview && res.preview_code ? { previewCode: res.preview_code } : {}),
    };
  });

export const verifyProfileEmailOtp = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: { email: string; code: string }) => ({
    email: String(input?.email ?? "").trim(),
    code: String(input?.code ?? "").replace(/\D/g, ""),
  }))
  .handler(async ({ data, context }) => {
    try {
      const res = await apiFetch<{
        ok: boolean;
        detail?: string;
        attempts_remaining?: number;
        profile: Profile;
      }>("/me/otp/verify/", {
        method: "POST",
        token: context.accessToken,
        body: toJsonBody({ channel: "email", email: data.email, code: data.code }),
      });

      if (!res.ok) {
        return {
          ok: false as const,
          message: res.detail ?? "Verification failed.",
          attemptsRemaining: res.attempts_remaining,
        };
      }

      return { ok: true as const, message: "Email verified.", profile: res.profile };
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : "Verification failed." };
    }
  });
