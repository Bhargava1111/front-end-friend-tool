import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEMO_ACCOUNTS,
  DEMO_OTP_CODE,
  DEMO_PASSWORD,
  type DemoAccount,
} from "@/lib/demo-accounts";
import { requestDemoOtp, seedDemoAccounts, verifyDemoOtp } from "@/lib/dev-auth.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dev/login-test")({
  head: () => ({
    meta: [
      { title: "Login test bench — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content: "Internal diagnostics page for demo credential logins and OTP status.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Login test bench" },
      { property: "og:description", content: "Internal auth diagnostics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginTestPage,
});

type Backend = "cloud" | "django";
type LogEntry = {
  id: string;
  at: string;
  method: string;
  endpoint: string;
  status: string;
  ms: number;
  body: string;
};
type LoginResult = {
  ok: boolean;
  status: string;
  ms: number;
  userId?: string | null;
  role?: string | null;
  token?: boolean;
  detail?: string;
};

const DJANGO_KEY = "dev.django.base_url";

function short(value: unknown, max = 600) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function LoginTestPage() {
  const [backend, setBackend] = useState<Backend>("cloud");
  const [djangoUrl, setDjangoUrl] = useState("http://localhost:8000/api/v1");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [results, setResults] = useState<Record<string, LoginResult>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [session, setSession] = useState<{ email?: string; id?: string; role?: string } | null>(
    null,
  );
  const [seedRows, setSeedRows] = useState<
    { email: string; status: string; error?: string }[] | null
  >(null);

  const seed = useServerFn(seedDemoAccounts);

  useEffect(() => {
    const stored = localStorage.getItem(DJANGO_KEY);
    if (stored) setDjangoUrl(stored);
  }, []);
  useEffect(() => {
    localStorage.setItem(DJANGO_KEY, djangoUrl);
  }, [djangoUrl]);

  const pushLog = (entry: Omit<LogEntry, "id" | "at">) =>
    setLog((prev) =>
      [
        { ...entry, id: crypto.randomUUID(), at: new Date().toLocaleTimeString() },
        ...prev,
      ].slice(0, 60),
    );

  const refreshSession = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setSession(null);
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();
    setSession({ email: data.user.email, id: data.user.id, role: roleRow?.role ?? "customer" });
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  /* ------------------------------ login ------------------------------ */

  const loginOne = async (acc: DemoAccount): Promise<LoginResult> => {
    const started = performance.now();

    if (backend === "django") {
      try {
        const res = await fetch(`${djangoUrl.replace(/\/$/, "")}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: acc.email, password: DEMO_PASSWORD }),
        });
        const text = await res.text();
        const ms = Math.round(performance.now() - started);
        pushLog({
          method: "POST",
          endpoint: "/auth/login",
          status: String(res.status),
          ms,
          body: short(text),
        });
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(text);
        } catch {
          /* non-JSON body */
        }
        return {
          ok: res.ok,
          status: String(res.status),
          ms,
          userId: (parsed.user as { id?: string })?.id ?? null,
          role: (parsed.user as { role?: string })?.role ?? null,
          token: Boolean(parsed.access ?? parsed.token),
          detail: res.ok ? undefined : short(text, 240),
        };
      } catch (e) {
        const ms = Math.round(performance.now() - started);
        const detail = e instanceof Error ? e.message : String(e);
        pushLog({ method: "POST", endpoint: "/auth/login", status: "network", ms, body: detail });
        return { ok: false, status: "network", ms, detail };
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: DEMO_PASSWORD,
    });
    const ms = Math.round(performance.now() - started);
    if (error) {
      pushLog({
        method: "POST",
        endpoint: "auth/signInWithPassword",
        status: String(error.status ?? "error"),
        ms,
        body: error.message,
      });
      return { ok: false, status: String(error.status ?? "error"), ms, detail: error.message };
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();
    pushLog({
      method: "POST",
      endpoint: "auth/signInWithPassword",
      status: "200",
      ms,
      body: `user ${data.user.id} · role ${roleRow?.role ?? "customer"}`,
    });
    return {
      ok: true,
      status: "200",
      ms,
      userId: data.user.id,
      role: roleRow?.role ?? "customer",
      token: Boolean(data.session?.access_token),
    };
  };

  const runLogin = async (acc: DemoAccount) => {
    setBusy(acc.email);
    const result = await loginOne(acc);
    setResults((prev) => ({ ...prev, [acc.email]: result }));
    setBusy(null);
    await refreshSession();
  };

  const runAll = async () => {
    setBusy("all");
    for (const acc of DEMO_ACCOUNTS) {
      const result = await loginOne(acc);
      setResults((prev) => ({ ...prev, [acc.email]: result }));
    }
    setBusy(null);
    await refreshSession();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    pushLog({ method: "POST", endpoint: "auth/signOut", status: "200", ms: 0, body: "signed out" });
  };

  const runSeed = async () => {
    setBusy("seed");
    try {
      const res = (await seed()) as { results: typeof seedRows };
      setSeedRows(res.results);
      pushLog({
        method: "POST",
        endpoint: "seedDemoAccounts",
        status: "200",
        ms: 0,
        body: short(res.results),
      });
      toast.success("Demo accounts seeded");
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      pushLog({ method: "POST", endpoint: "seedDemoAccounts", status: "error", ms: 0, body: detail });
      toast.error(detail);
    }
    setBusy(null);
  };

  const passCount = Object.values(results).filter((r) => r.ok).length;
  const failCount = Object.values(results).filter((r) => !r.ok).length;

  return (
    <div className="min-h-screen bg-secondary/30 pb-16">
      <header className="border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="h-5 w-5 text-primary" /> Login test bench
            </h1>
            <p className="text-xs text-muted-foreground">
              Internal only · not linked from the app · blocked on the published site
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(["cloud", "django"] as Backend[]).map((b) => (
              <button
                key={b}
                onClick={() => setBackend(b)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  backend === b
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground",
                )}
              >
                {b === "cloud" ? "Lovable Cloud" : "Django API"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-5">
        {backend === "django" && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <label className="text-xs font-semibold text-muted-foreground">Django base URL</label>
            <Input
              value={djangoUrl}
              onChange={(e) => setDjangoUrl(e.target.value)}
              placeholder="http://localhost:8000/api/v1"
              className="mt-1.5 rounded-xl font-mono text-xs"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Calls <code>/auth/login</code>, <code>/auth/otp/request</code>,{" "}
              <code>/auth/otp/verify</code>. Enable CORS for this origin on the Django side.
            </p>
          </section>
        )}

        {/* session */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-semibold">Current session</p>
              <p className="text-xs text-muted-foreground">
                {session
                  ? `${session.email} · ${session.role} · ${session.id?.slice(0, 8)}…`
                  : "No one signed in"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-xl" onClick={refreshSession}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={signOut}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
              </Button>
            </div>
          </div>
        </section>

        {/* seed */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-semibold">Demo accounts</p>
              <p className="text-xs text-muted-foreground">
                Creates/refreshes the six spec accounts with password{" "}
                <code className="font-mono">{DEMO_PASSWORD}</code>. Safe to run repeatedly.
              </p>
            </div>
            <Button size="sm" className="rounded-xl" onClick={runSeed} disabled={busy === "seed"}>
              {busy === "seed" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              )}
              Seed demo accounts
            </Button>
          </div>
          {seedRows && (
            <ul className="mt-3 space-y-1 text-xs">
              {seedRows.map((r) => (
                <li key={r.email} className="flex items-center gap-2">
                  {r.status === "failed" ? (
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span className="font-mono">{r.email}</span>
                  <span className="text-muted-foreground">{r.error ?? r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* credentials */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Credential logins</p>
              <p className="text-xs text-muted-foreground">
                {passCount} passed · {failCount} failed
              </p>
            </div>
            <Button size="sm" className="rounded-xl" onClick={runAll} disabled={busy === "all"}>
              {busy === "all" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Log in all
            </Button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const r = results[acc.email];
              return (
                <div key={acc.email} className="rounded-xl border border-border p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {acc.role}
                    </span>
                    {r && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          r.ok
                            ? "bg-primary/10 text-primary"
                            : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {r.ok ? "PASS" : "FAIL"} · {r.status} · {r.ms}ms
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 font-mono text-[11px]">{acc.email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {acc.phone} · {acc.note}
                  </p>
                  {r?.ok && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      id {r.userId?.slice(0, 8)}… · role {r.role} ·{" "}
                      {r.token ? "token stored" : "no token"}
                    </p>
                  )}
                  {r && !r.ok && r.detail && (
                    <p className="mt-1 break-words font-mono text-[11px] text-destructive">
                      {r.detail}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg text-[11px]"
                      onClick={() => runLogin(acc)}
                      disabled={busy === acc.email}
                    >
                      {busy === acc.email && (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      )}
                      Log in
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-lg text-[11px]"
                      onClick={() => {
                        navigator.clipboard.writeText(`${acc.email} / ${DEMO_PASSWORD}`);
                        toast.success("Credentials copied");
                      }}
                    >
                      <Copy className="mr-1.5 h-3 w-3" /> Copy
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <OtpPanel backend={backend} djangoUrl={djangoUrl} pushLog={pushLog} />

        {/* request log */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Request log</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-lg text-[11px]"
                onClick={() => {
                  navigator.clipboard.writeText(
                    log
                      .map((l) => `${l.at} ${l.method} ${l.endpoint} ${l.status} ${l.ms}ms\n${l.body}`)
                      .join("\n\n"),
                  );
                  toast.success("Log copied");
                }}
              >
                <Copy className="mr-1.5 h-3 w-3" /> Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-lg text-[11px]"
                onClick={() => setLog([])}
              >
                <Trash2 className="mr-1.5 h-3 w-3" /> Clear
              </Button>
            </div>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {log.length === 0 && (
              <p className="text-xs text-muted-foreground">No requests yet.</p>
            )}
            {log.map((l) => (
              <div key={l.id} className="rounded-lg bg-secondary/60 p-2 font-mono text-[11px]">
                <p>
                  {l.at} · {l.method} {l.endpoint} · {l.status} · {l.ms}ms
                </p>
                <pre className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
                  {l.body}
                </pre>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

/* -------------------------------- OTP -------------------------------- */

function OtpPanel({
  backend,
  djangoUrl,
  pushLog,
}: {
  backend: Backend;
  djangoUrl: string;
  pushLog: (e: Omit<LogEntry, "id" | "at">) => void;
}) {
  const [mode, setMode] = useState<"demo" | "real">("demo");
  const [channel, setChannel] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState(DEMO_ACCOUNTS[0].email);
  const [code, setCode] = useState(DEMO_OTP_CODE);
  const [status, setStatus] = useState<{ ok: boolean; text: string; code?: string } | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, setPending] = useState<"request" | "verify" | null>(null);
  const [now, setNow] = useState(Date.now());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const doRequest = useServerFn(requestDemoOtp);
  const doVerify = useServerFn(verifyDemoOtp);

  useEffect(() => {
    timer.current = setInterval(() => {
      setNow(Date.now());
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  useEffect(() => {
    setIdentifier(
      channel === "email" ? DEMO_ACCOUNTS[0].email : DEMO_ACCOUNTS[0].phone,
    );
  }, [channel]);

  const ttl = useMemo(
    () => (expiresAt ? Math.max(0, Math.round((expiresAt - now) / 1000)) : null),
    [expiresAt, now],
  );

  const djangoCall = async (path: string, body: Record<string, unknown>) => {
    const started = performance.now();
    try {
      const res = await fetch(`${djangoUrl.replace(/\/$/, "")}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      pushLog({
        method: "POST",
        endpoint: path,
        status: String(res.status),
        ms: Math.round(performance.now() - started),
        body: short(text),
      });
      setStatus({ ok: res.ok, text: short(text, 300) || `HTTP ${res.status}` });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      pushLog({
        method: "POST",
        endpoint: path,
        status: "network",
        ms: Math.round(performance.now() - started),
        body: detail,
      });
      setStatus({ ok: false, text: detail });
    }
  };

  const onRequest = async () => {
    setPending("request");
    if (backend === "django") {
      await djangoCall("/auth/otp/request", { [channel]: identifier, purpose: "login" });
    } else if (mode === "real") {
      const started = performance.now();
      const { error } =
        channel === "email"
          ? await supabase.auth.signInWithOtp({ email: identifier })
          : await supabase.auth.signInWithOtp({ phone: identifier });
      const ms = Math.round(performance.now() - started);
      pushLog({
        method: "POST",
        endpoint: "auth/signInWithOtp",
        status: error ? String(error.status ?? "error") : "200",
        ms,
        body: error?.message ?? `code sent to ${identifier}`,
      });
      setStatus(
        error
          ? { ok: false, text: error.message }
          : { ok: true, text: `Real code sent to ${identifier}. Paste it below to verify.` },
      );
      if (!error) setExpiresAt(Date.now() + 300_000);
    } else {
      try {
        const res = await doRequest({ data: { identifier, channel } });
        pushLog({
          method: "POST",
          endpoint: "requestDemoOtp",
          status: res.ok ? "200" : "400",
          ms: 0,
          body: short(res),
        });
        setStatus({ ok: res.ok, text: res.message, code: res.code });
        if (res.ok) {
          setExpiresAt(res.expiresAt ? new Date(res.expiresAt).getTime() : null);
          setAttempts(res.attemptsRemaining ?? null);
          setCooldown(res.cooldownSeconds ?? 30);
          setCode(DEMO_OTP_CODE);
        } else if (res.cooldownSeconds) {
          setCooldown(res.cooldownSeconds);
        }
      } catch (e) {
        setStatus({ ok: false, text: e instanceof Error ? e.message : String(e) });
      }
    }
    setPending(null);
  };

  const onVerify = async () => {
    setPending("verify");
    if (backend === "django") {
      await djangoCall("/auth/otp/verify", { [channel]: identifier, code, purpose: "login" });
    } else if (mode === "real") {
      const started = performance.now();
      const { data, error } = await supabase.auth.verifyOtp(
        channel === "email"
          ? { email: identifier, token: code, type: "email" }
          : { phone: identifier, token: code, type: "sms" },
      );
      const ms = Math.round(performance.now() - started);
      pushLog({
        method: "POST",
        endpoint: "auth/verifyOtp",
        status: error ? String(error.status ?? "error") : "200",
        ms,
        body: error?.message ?? `session for ${data.user?.email}`,
      });
      setStatus(
        error
          ? { ok: false, text: error.message }
          : { ok: true, text: `Verified — signed in as ${data.user?.email}` },
      );
    } else {
      try {
        const res = await doVerify({ data: { identifier, code } });
        pushLog({
          method: "POST",
          endpoint: "verifyDemoOtp",
          status: res.ok ? "200" : "400",
          ms: 0,
          body: short(res),
        });
        setStatus({ ok: res.ok, text: res.message, code: res.code });
        if (res.attemptsRemaining !== undefined) setAttempts(res.attemptsRemaining);
        if (res.ok) setExpiresAt(null);
      } catch (e) {
        setStatus({ ok: false, text: e instanceof Error ? e.message : String(e) });
      }
    }
    setPending(null);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="h-4 w-4 text-primary" /> OTP request &amp; verification
        </p>
        {backend === "cloud" && (
          <div className="flex gap-1.5">
            {(["demo", "real"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-medium",
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground",
                )}
              >
                {m === "demo" ? `Demo OTP (${DEMO_OTP_CODE})` : "Real OTP"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["email", "phone"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setChannel(c)}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-medium",
              channel === c
                ? "bg-secondary text-foreground"
                : "border border-border text-muted-foreground",
            )}
          >
            {c}
          </button>
        ))}
        <div className="flex flex-wrap gap-1.5">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              onClick={() => setIdentifier(channel === "email" ? a.email : a.phone)}
              className="rounded-full border border-dashed border-border px-2.5 py-1 text-[10px] text-muted-foreground"
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="rounded-xl font-mono text-xs"
        />
        <Button
          className="rounded-xl"
          onClick={onRequest}
          disabled={pending !== null || (mode === "demo" && backend === "cloud" && cooldown > 0)}
        >
          {pending === "request" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {cooldown > 0 && mode === "demo" && backend === "cloud"
            ? `Resend in ${cooldown}s`
            : "Request OTP"}
        </Button>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="6-digit code"
          inputMode="numeric"
          className="rounded-xl font-mono text-xs tracking-[0.3em]"
        />
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={onVerify}
          disabled={pending !== null}
        >
          {pending === "verify" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Verify
        </Button>
      </div>

      {mode === "demo" && backend === "cloud" && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Demo code is always{" "}
          <button
            className="font-mono font-semibold text-primary"
            onClick={() => {
              navigator.clipboard.writeText(DEMO_OTP_CODE);
              toast.success("OTP copied");
            }}
          >
            {DEMO_OTP_CODE}
          </button>{" "}
          · 5 min TTL · 5 attempts · 30s resend cooldown.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span>TTL: {ttl !== null ? `${ttl}s` : "—"}</span>
        <span>Attempts left: {attempts ?? "—"}</span>
        <span>Cooldown: {cooldown > 0 ? `${cooldown}s` : "ready"}</span>
      </div>

      {status && (
        <div
          className={cn(
            "mt-3 flex items-start gap-2 rounded-xl p-3 text-xs",
            status.ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
          )}
        >
          {status.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div className="min-w-0">
            {status.code && <p className="font-mono font-semibold">{status.code}</p>}
            <p className="break-words">{status.text}</p>
          </div>
        </div>
      )}
    </section>
  );
}
