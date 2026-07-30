## Goal

A public diagnostics page at `/dev/login-test` that logs in with the dummy admin and customer credentials from the backend spec and shows OTP request/verification status — able to point at either the current Lovable Cloud backend or your Django API.

## Verified starting state

- The six demo accounts (`admin@mnxstore.in`, `manager@…`, `orders@…`, `ananya@example.com`, `ravi@…`, `meera@…`, password `Demo@12345`) exist only in `docs/BACKEND_DJANGO_API.md`. The live backend currently has **one** real user and no roles assigned.
- The Django OTP endpoints (`/auth/otp/request`, `/auth/otp/verify`) are specified but not running yet.
- The built-in backend can't be forced to email the literal code `123456` — it generates random codes. So the fixed demo OTP needs its own dev-only issuing/verifying path.

## What gets built

### 1. Seed the demo accounts (one-click, on the page)

A "Seed demo accounts" button calls a dev-only server function that creates all six users with password `Demo@12345`, marks their emails confirmed, sets their phone numbers and full names, and grants the `admin` role to the three staff accounts. Safe to press repeatedly — existing accounts are updated, not duplicated.

### 2. Backend switcher

A segmented control at the top of the page:

- **Cloud** — talks to the current backend directly.
- **Django** — talks to a base URL you type in (persisted in the browser, e.g. `http://localhost:8000/api/v1`), calling `/auth/login`, `/auth/otp/request`, `/auth/otp/verify` exactly as the spec defines. Shows connection errors plainly until your server is up.

### 3. Credential grid

One card per demo account (3 admins, 3 customers) showing email, phone, role, and a **Log in** button. Each attempt renders:

- pass/fail badge, HTTP status, round-trip time
- returned user id, email, resolved role, whether the session token was stored
- the raw error body on failure

Plus a **Log in all** button that runs every account in sequence into a results table, a **Sign out** button, and a live "current session" panel showing who is signed in right now.

### 4. OTP panel — request, verify, and the fixed `123456`

Identifier input (prefilled from whichever demo account you clicked) with an email/phone channel toggle, and two modes:

- **Demo OTP (default)** — `123456` always works. Request issues a code server-side with a 5-minute TTL, 5-attempt cap, and 30-second resend cooldown, matching the spec's rules; the panel shows a live TTL countdown, attempts remaining, cooldown timer, resend button, and the exact error code on failure (`otp_invalid`, `otp_expired`, `otp_too_many_attempts`). The code `123456` is displayed on the page so you can copy it.
- **Real OTP** — sends an actual email code through the live backend and verifies whatever you paste in, so you can confirm real delivery end to end.

In Django mode both modes just proxy to your endpoints and display the raw request/response JSON.

Every call in both panels is logged to a scrollable request log (timestamp, method, endpoint, status, duration, response body), with a copy-to-clipboard button for pasting into bug reports.

### 5. Access

Public route at `/dev/login-test`, no auth gate, `noindex` meta, disallowed in `robots.txt`, and no links to it from the app's navigation — reachable only if you know the URL.

## Technical notes

- New route `src/routes/dev/login-test.tsx` (public, SSR-safe; all auth calls client-side).
- New `src/lib/dev-auth.functions.ts` with three server functions: `seedDemoAccounts` (uses the admin client inside the handler, after checking a dev-mode flag), `requestDemoOtp`, `verifyDemoOtp`.
- One migration: a `demo_otp_codes` table (identifier, channel, purpose, code hash, expires_at, attempts, consumed_at) with RLS denying all client access — only the server functions touch it — plus the required GRANTs to `service_role`.
- The seed and demo-OTP functions refuse to run when the app is built for production, so the fixed `123456` can never work on the published site.
- Django mode uses `fetch` from the browser against your configured base URL; you'll need permissive CORS on the Django side for local testing.

## Caveats

- Seeding creates six real accounts in your current backend. They're clearly labelled demo accounts and can be deleted later; say the word if you'd rather they go into a separate environment.
- Phone OTP through the live backend needs an SMS provider that isn't configured, so real-mode phone OTP will report "provider not configured" — demo mode covers phone testing.
