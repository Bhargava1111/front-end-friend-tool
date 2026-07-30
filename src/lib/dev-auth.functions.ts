import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import {
  DEMO_ACCOUNTS,
  DEMO_OTP_CODE,
  DEMO_OTP_MAX_ATTEMPTS,
  DEMO_OTP_RESEND_COOLDOWN,
  DEMO_OTP_TTL_SECONDS,
  DEMO_PASSWORD,
} from "./demo-accounts";

/**
 * These helpers exist only for the /dev/login-test diagnostics page.
 * They are hard-blocked on the published (production) hostname so the fixed
 * demo OTP can never be used against the live store.
 */
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

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------------------------- seed accounts --------------------------- */

export const seedDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  assertDevHost();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Map of existing auth users by email.
  const existing = new Map<string, string>();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    data.users.forEach((u) => u.email && existing.set(u.email.toLowerCase(), u.id));
    if (data.users.length < 200) break;
  }

  const results: { email: string; status: string; userId: string | null; error?: string }[] = [];

  for (const acc of DEMO_ACCOUNTS) {
    try {
      let userId = existing.get(acc.email) ?? null;
      let status: string;

      if (userId) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: acc.name, phone: acc.phone, demo_account: true },
        });
        if (error) throw new Error(error.message);
        status = "updated";
      } else {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: acc.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: acc.name, phone: acc.phone, demo_account: true },
        });
        if (error) throw new Error(error.message);
        userId = data.user.id;
        status = "created";
      }

      await supabaseAdmin
        .from("profiles")
        .upsert({ id: userId!, full_name: acc.name, phone: acc.phone }, { onConflict: "id" });

      if (acc.role === "admin") {
        const { data: has } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .eq("user_id", userId!)
          .eq("role", "admin")
          .maybeSingle();
        if (!has) {
          await supabaseAdmin.from("user_roles").insert({ user_id: userId!, role: "admin" });
        }
      }

      results.push({ email: acc.email, status, userId });
    } catch (e) {
      results.push({
        email: acc.email,
        status: "failed",
        userId: null,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { results };
});

/* ------------------------------ demo OTP ------------------------------ */

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: last } = await supabaseAdmin
      .from("demo_otp_codes")
      .select("created_at")
      .eq("identifier", data.identifier)
      .eq("purpose", "login")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (last) {
      const since = (Date.now() - new Date(last.created_at).getTime()) / 1000;
      if (since < DEMO_OTP_RESEND_COOLDOWN) {
        return {
          ok: false,
          code: "otp_resend_cooldown",
          message: `Wait ${Math.ceil(DEMO_OTP_RESEND_COOLDOWN - since)}s before requesting a new code.`,
          cooldownSeconds: Math.ceil(DEMO_OTP_RESEND_COOLDOWN - since),
        };
      }
    }

    // Invalidate any live codes for this identifier, then issue the fixed demo code.
    await supabaseAdmin
      .from("demo_otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("identifier", data.identifier)
      .eq("purpose", "login")
      .is("consumed_at", null);

    const expiresAt = new Date(Date.now() + DEMO_OTP_TTL_SECONDS * 1000).toISOString();
    const { error } = await supabaseAdmin.from("demo_otp_codes").insert({
      identifier: data.identifier,
      channel: data.channel,
      purpose: "login",
      code_hash: await sha256(DEMO_OTP_CODE),
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);

    return {
      ok: true,
      message: `Demo code sent to ${data.identifier} (${data.channel}). Use ${DEMO_OTP_CODE}.`,
      expiresAt,
      cooldownSeconds: DEMO_OTP_RESEND_COOLDOWN,
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("demo_otp_codes")
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .eq("identifier", data.identifier)
      .eq("purpose", "login")
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) {
      return { ok: false, code: "otp_not_found", message: "No active code — request one first." };
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false, code: "otp_expired", message: "Code expired. Request a new one." };
    }
    if (row.attempts >= DEMO_OTP_MAX_ATTEMPTS) {
      return {
        ok: false,
        code: "otp_too_many_attempts",
        message: "Too many attempts. Request a new code.",
        attemptsRemaining: 0,
      };
    }

    if ((await sha256(data.code)) !== row.code_hash) {
      const attempts = row.attempts + 1;
      await supabaseAdmin.from("demo_otp_codes").update({ attempts }).eq("id", row.id);
      return {
        ok: false,
        code: "otp_invalid",
        message: "Invalid code.",
        attemptsRemaining: Math.max(0, DEMO_OTP_MAX_ATTEMPTS - attempts),
        expiresAt: row.expires_at,
      };
    }

    await supabaseAdmin
      .from("demo_otp_codes")
      .update({ consumed_at: new Date().toISOString(), attempts: row.attempts + 1 })
      .eq("id", row.id);

    return { ok: true, message: "Code verified.", expiresAt: row.expires_at };
  });
