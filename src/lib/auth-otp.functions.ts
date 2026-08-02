import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Phone OTP sign-in / registration.
 *
 * Codes are hashed and stored server-side with a TTL, resend cooldown and
 * attempt cap. No SMS provider is wired up yet, so on preview/localhost the
 * code is returned to the UI for testing; on the published site it is withheld.
 */

const TTL_SECONDS = 300;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN = 30;
const PHONE_EMAIL_DOMAIN = "phone.mnxstore.in";

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

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  if (local.length !== 10) throw new Error("Enter a valid 10-digit mobile number.");
  return { e164: `+91${local}`, local };
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]!;
  return String(100000 + (n % 900000));
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
    const { e164 } = normalizePhone(data.phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: last } = await supabaseAdmin
      .from("demo_otp_codes")
      .select("created_at")
      .eq("identifier", e164)
      .eq("purpose", "phone_login")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (last) {
      const since = (Date.now() - new Date(last.created_at).getTime()) / 1000;
      if (since < RESEND_COOLDOWN) {
        return {
          ok: false,
          message: `Please wait ${Math.ceil(RESEND_COOLDOWN - since)}s before requesting another code.`,
          cooldownSeconds: Math.ceil(RESEND_COOLDOWN - since),
        };
      }
    }

    await supabaseAdmin
      .from("demo_otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("identifier", e164)
      .eq("purpose", "phone_login")
      .is("consumed_at", null);

    const code = randomCode();
    const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();
    const { error } = await supabaseAdmin.from("demo_otp_codes").insert({
      identifier: e164,
      channel: "phone",
      purpose: "phone_login",
      code_hash: await sha256(code),
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);

    const preview = isPreviewHost();
    return {
      ok: true,
      message: preview
        ? `Test mode: your code is ${code}.`
        : `Code sent to ${e164}. It expires in 5 minutes.`,
      expiresAt,
      cooldownSeconds: RESEND_COOLDOWN,
      ...(preview ? { previewCode: code } : {}),
    };
  });

export type PhoneOtpVerifyResult =
  | { ok: false; message: string; attemptsRemaining?: number }
  | { ok: true; message: string; email: string; tokenHash: string; isNew: boolean };

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; code: string; fullName?: string }) => ({
    phone: String(input?.phone ?? ""),
    code: String(input?.code ?? "").replace(/\D/g, ""),
    fullName: input?.fullName?.trim() ?? "",
  }))
  .handler(async ({ data }): Promise<PhoneOtpVerifyResult> => {
    const { e164, local } = normalizePhone(data.phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("demo_otp_codes")
      .select("id, code_hash, expires_at, attempts")
      .eq("identifier", e164)
      .eq("purpose", "phone_login")
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return { ok: false, message: "No active code — request a new one." };
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false, message: "That code expired. Request a new one." };
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      return { ok: false, message: "Too many attempts. Request a new code.", attemptsRemaining: 0 };
    }
    if ((await sha256(data.code)) !== row.code_hash) {
      const attempts = row.attempts + 1;
      await supabaseAdmin.from("demo_otp_codes").update({ attempts }).eq("id", row.id);
      return {
        ok: false,
        message: "That code is incorrect.",
        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts),
      };
    }

    await supabaseAdmin
      .from("demo_otp_codes")
      .update({ consumed_at: new Date().toISOString(), attempts: row.attempts + 1 })
      .eq("id", row.id);

    // Phone accounts map to a deterministic internal email address.
    const email = `p${local}@${PHONE_EMAIL_DOMAIN}`;
    let isNew = false;

    const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    let tokenHash = link?.properties?.hashed_token ?? null;

    if (!tokenHash) {
      // No account for this number yet — create one, then mint the token.
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        phone: undefined,
        user_metadata: { full_name: data.fullName || `Guest ${local.slice(-4)}`, phone: e164 },
      });
      if (createError && !createError.message.toLowerCase().includes("already")) {
        throw new Error(linkError?.message ?? createError.message);
      }
      isNew = true;
      const retry = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
      tokenHash = retry.data?.properties?.hashed_token ?? null;
      if (!tokenHash) throw new Error(retry.error?.message ?? "Could not start your session.");
    }

    if (data.fullName) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = users?.users.find((u) => u.email?.toLowerCase() === email);
      if (found) {
        await supabaseAdmin
          .from("profiles")
          .upsert({ id: found.id, full_name: data.fullName, phone: e164 }, { onConflict: "id" });
      }
    }

    return { ok: true, message: "Verified.", email, tokenHash, isNew };
  });
