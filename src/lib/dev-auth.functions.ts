import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { apiFetch, toJsonBody } from "@/lib/api";
import {
  DEMO_ACCOUNTS,
  DEMO_OTP_CODE,
  DEMO_OTP_MAX_ATTEMPTS,
  DEMO_OTP_RESEND_COOLDOWN,
  DEMO_OTP_TTL_SECONDS,
  DEMO_PASSWORD,
} from "./demo-accounts";

function assertDevHost() {
  const host = (getRequestHeader("host") ?? "").toLowerCase();
  const allowed =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.includes("id-preview--") ||
    host.includes("-dev.lovable.app") ||
    host.includes("lovableproject.com");
  if (!allowed) {
    throw new Error("Demo login tools are disabled on the published site.");
  }
}

export const seedDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  assertDevHost();
  return {
    results: DEMO_ACCOUNTS.map((acc) => ({
      email: acc.email,
      status: "use Django seed_demo command",
      userId: null,
    })),
    message: "Run: cd backend && python manage.py seed_demo",
  };
});

export type DemoOtpState = {
  ok: boolean;
  code?: string;
  message: string;
  expiresAt?: string;
  cooldownSeconds?: number;
  attemptsRemaining?: number;
};

export const requestDemoOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { identifier: string; channel: "email" | "phone" }) => {
    if (!input?.identifier?.trim()) throw new Error("Identifier is required");
    return { identifier: input.identifier.trim(), channel: input.channel };
  })
  .handler(async ({ data }): Promise<DemoOtpState> => {
    assertDevHost();
    const res = await apiFetch<{
      ok: boolean;
      detail?: string;
      preview_code?: string;
      expires_at?: string;
      cooldown_seconds?: number;
    }>("/auth/otp/request/", {
      method: "POST",
      body: toJsonBody({ channel: data.channel, identifier: data.identifier }),
    });
    if (!res.ok) {
      return { ok: false, message: res.detail ?? "Failed", cooldownSeconds: res.cooldown_seconds };
    }
    return {
      ok: true,
      message: `Demo code: ${res.preview_code ?? DEMO_OTP_CODE}`,
      expiresAt: res.expires_at,
      cooldownSeconds: res.cooldown_seconds ?? DEMO_OTP_RESEND_COOLDOWN,
      attemptsRemaining: DEMO_OTP_MAX_ATTEMPTS,
    };
  });

export const verifyDemoOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { identifier: string; code: string }) => {
    if (!input?.identifier?.trim()) throw new Error("Identifier is required");
    return { identifier: input.identifier.trim(), code: (input.code ?? "").trim() };
  })
  .handler(async ({ data }): Promise<DemoOtpState> => {
    assertDevHost();
    try {
      await apiFetch("/auth/otp/verify/", {
        method: "POST",
        body: toJsonBody({
          channel: data.identifier.includes("@") ? "email" : "phone",
          identifier: data.identifier,
          code: data.code || DEMO_OTP_CODE,
        }),
      });
      return { ok: true, message: "Code verified." };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Invalid code." };
    }
  });

export { DEMO_PASSWORD, DEMO_OTP_CODE, DEMO_OTP_TTL_SECONDS };
