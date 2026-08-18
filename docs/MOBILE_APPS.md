# Mobile apps (Android & iOS)

Native Android and iOS apps wrap the **same** Sri Mahalakshmi Stores web UI using [Capacitor](https://capacitorjs.com/). The mobile apps load your TanStack Start site in a WebView, so every screen — profile photo upload, personal details with OTP, admin pages, location capture, pack sizes — behaves **identically** to the browser.

> **After any web change**, refresh the mobile app by re-running `npm run mobile:prepare` and reinstalling the APK (or restart the dev server if testing on LAN).

**Live web app**: set `CAPACITOR_SERVER_URL` / `VITE_PUBLIC_WEB_URL` in `.env` (default: `https://front-end-friend-tool.lovable.app`)

## Prerequisites

| Platform | Requirements |
|----------|--------------|
| **Android** | [Android Studio](https://developer.android.com/studio) (SDK 34+), Java 17 |
| **iOS** | macOS with [Xcode](https://developer.apple.com/xcode/) 15+ (build on Mac only) |
| **Both** | Node.js 20+, npm |

## Quick start

```sh
# 1. Install dependencies (from repo root)
npm install

# 2. Sync web assets + native plugins into platform projects
npm run cap:sync

# 3. Open in IDE and run on device/emulator
npm run cap:android   # Android Studio
npm run cap:ios       # Xcode (macOS only)
```

## How it works

Capacitor hosts a native WebView that loads your site URL (`capacitor.config.ts` → `server.url`). That keeps SSR, server functions, and the Django API integration identical to the web app — no separate mobile codebase.

**Config file**: `capacitor.config.ts` reads `CAPACITOR_SERVER_URL` from the environment. Run `npm run mobile:configure` before syncing so phones on your Wi‑Fi load your PC's latest code.

### Local development (recommended — same code as web)

```sh
# 1. Write LAN IP to .env.mobile.local + capacitor.server.json
npm run mobile:configure

# 2. Django API (all interfaces)
npm run backend:mobile

# 3. HTTPS Vite on LAN (port 8080 — GPS works on iPhone)
npm run dev:mobile

# 4. Sync native projects + rebuild APK
npm run mobile:prepare
npm run mobile:apk          # optional — install APK on Android
```

The Android APK will open `https://<your-lan-ip>:8080` — the **same** app you see in the browser at that URL, including `/profile/photo`, `/profile/details`, and all admin pages.

### Production (deployed web URL)

When your web app is deployed, point Capacitor at that URL:

```sh
# .env
CAPACITOR_SERVER_URL=https://front-end-friend-tool.lovable.app
VITE_PUBLIC_WEB_URL=https://front-end-friend-tool.lovable.app

npm run cap:sync
npm run mobile:apk
```

Deploy web changes to that URL first — the mobile app always mirrors whatever is live at `CAPACITOR_SERVER_URL`.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run mobile:configure` | Detect LAN IP → write `.env.mobile.local` |
| `npm run mobile:prepare` | Configure + `cap sync` (run after web changes) |
| `npm run mobile:sync` | Same as `mobile:prepare` |
| `npm run dev:mobile` | HTTPS Vite on `0.0.0.0:8080` (mobile mode) |
| `npm run backend:mobile` | Django on `0.0.0.0:8000` |
| `npm run mobile:apk` | Configure, sync, build debug APK |
| `npm run cap:sync` | Sync plugins into `android/` and `ios/` |
| `npm run cap:android` | Sync, then open Android Studio |
| `npm run cap:ios` | Sync, then open Xcode |
| `npm run cap:run:android` | Sync and launch on connected device/emulator |
| `npm run cap:run:ios` | Sync and launch on simulator (macOS) |
| `npm run cap:assets` | Regenerate launcher icons and splash screens from `resources/` |

## App identity

- **App ID**: `in.srimahalakshmistores.app`
- **Display name**: Sri Mahalakshmi Stores
- **Brand color**: `#2d5a45` (status bar & splash)

Change these in `capacitor.config.ts` before publishing to the stores.

## Feature parity with web

The mobile app is the **same React app** as the browser. These routes work identically in the Capacitor WebView:

| Feature | Route |
|---------|-------|
| Profile hub | `/profile` |
| Profile photo upload/delete | `/profile/photo` |
| Personal details + OTP | `/profile/details` |
| Account verification + GPS | `/verify-account` |
| Admin panel (drawer menu on phone) | `/admin/*` |
| Store location picker | Header “Deliver to” |

Native enhancements: GPS via Capacitor Geolocation, camera for profile photos, Android back button, safe-area insets, external links open in system browser.

## Icons & splash

Source files live in `resources/icon.svg` and `resources/splash.svg`. Regenerate platform assets after editing:

```sh
npm run cap:assets
npm run cap:sync
```

## Native features enabled

- Status bar styling (forest green, light icons)
- Splash screen (matches `/splash` branding)
- Android hardware back button (history → exit)
- Safe-area insets for notched phones
- Geolocation plugin (used by store/location pickers)
- In-app browser plugin (external links)

## Publishing

### Android (Google Play)

1. Open `android/` in Android Studio.
2. **Build → Generate Signed Bundle / APK** (prefer `.aab` for Play Store).
3. Create a Play Console listing, upload the bundle, complete store metadata.
4. Set `CAPACITOR_SERVER_URL` to your production domain before the release build if you move off Lovable hosting.

### iOS (App Store)

1. Open `ios/App/App.xcworkspace` in Xcode on a Mac.
2. Set your **Team** and **Bundle Identifier** (`in.srimahalakshmistores.app`).
3. **Product → Archive**, then distribute via App Store Connect.
4. Add App Transport Security exceptions only if you use non-HTTPS dev URLs.

## Environment variables

All URLs are configured via `.env` (see `.env.example` at the repo root). Key variables for mobile:

| Variable | Purpose |
|----------|---------|
| `CAPACITOR_SERVER_URL` | WebView loads this URL (production or LAN dev) |
| `VITE_APP_URL` | Shown on the iOS install page during LAN testing |
| `VITE_API_URL` | Client API base (use `/api/v1` with Vite proxy in dev) |
| `API_URL` | Server-side API for TanStack server functions |

For **LAN mobile testing**, run:

```sh
node scripts/mobile-config.mjs
```

This writes `capacitor.config.json`, `.env.mobile.local`, and `mobile/capacitor.server.json` with your PC's LAN IP. Then:

```sh
npm run backend:mobile   # Django on 0.0.0.0:8000
npm run dev:mobile       # HTTPS Vite on LAN
npm run mobile:apk       # Rebuild Android APK
```

## Custom production URL

When you deploy to your own domain, set the server URL for release builds:

```sh
# .env
CAPACITOR_SERVER_URL=https://shop.srimahalakshmistores.in
VITE_PUBLIC_WEB_URL=https://shop.srimahalakshmistores.in

npm run cap:sync
```

Or pass at build time:

```sh
$env:CAPACITOR_SERVER_URL="https://shop.srimahalakshmistores.in"
npm run cap:sync
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| White screen on launch | Confirm `server.url` is reachable from the device |
| API errors on device | Use LAN/public API URL, not `localhost:8000` |
| Android cleartext HTTP blocked | Only use `http://` with `CAPACITOR_SERVER_URL` for dev; production must be HTTPS |
| iOS build fails on Windows | iOS requires Xcode on macOS — `ios/` project is still generated for your Mac CI |

## Project layout

```
capacitor.config.ts   # App ID, server URL (reads CAPACITOR_SERVER_URL), plugins
mobile/www/           # Fallback splash while remote site loads
mobile/capacitor.server.json  # LAN URLs (auto-generated)
resources/            # Icon & splash sources
android/              # Android Studio project (generated)
ios/                  # Xcode project (generated)
src/lib/capacitor.ts  # Native shell: status bar, GPS permission, back button
```
