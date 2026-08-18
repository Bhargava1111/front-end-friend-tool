# Test on iPhone (with your Django backend)

Your iPhone can use the **same local web app + Django API** as your PC. Two options:

## Option A — Safari (works on Windows, no Mac needed)

Best for quick iPhone testing while developing on Windows.

```powershell
# Terminal 1 — Django API (your backend)
npm run backend:mobile

# Terminal 2 — your web app on LAN
npm run dev:mobile
```

The script prints your PC IP, e.g. `http://192.168.1.5:5173`.

On iPhone (same Wi‑Fi):

1. Open **Safari**
2. Go to `http://YOUR_PC_IP:5173` (from the script output)
3. Tap **Share → Add to Home Screen** for an app-like icon

This is your **current codebase** with **your Django API** — not Lovable.

---

## Option B — Native iOS app (.ipa)

Apple requires **macOS + Xcode** to install a native app on iPhone. This cannot be built on Windows.

When you have access to a Mac:

```bash
npm run mobile:ios:prepare
npm run cap:ios
```

In Xcode: select your iPhone → **Run** (▶).

The `ios/` project is already in this repo and points to the same LAN URL from `mobile/capacitor.server.json`.

---

## Android APK (your backend)

```powershell
npm run backend:mobile    # keep running
npm run dev:mobile        # keep running
npm run mobile:apk        # rebuild APK
```

Install: `mobile/releases/SriMahalakshmiStores-debug.apk`

**Important:** Phone and PC must be on the **same Wi‑Fi**. Keep both servers running while testing.

---

## If your PC IP changes

Re-run:

```powershell
npm run mobile:configure
npm run mobile:apk
```

Then reinstall the new APK on Android.
