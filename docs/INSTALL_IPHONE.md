# Install on iPhone (no Mac required)

Apple **does not allow** downloading an `.ipa` file directly like Android APK — unless you have a **Mac + Xcode** or publish to the **App Store / TestFlight**.

The **same app** on iPhone: install it from Safari as a home-screen app (PWA).

## Quick install (5 steps)

### 1. Start servers on your PC

```powershell
npm run backend:mobile
```

New terminal:

```powershell
npm run dev:mobile
```

### 2. Connect iPhone to same Wi‑Fi as PC

### 3. Open Safari on iPhone

Go to: **`https://192.168.1.4:8080`**

If you see a certificate warning → **Advanced** → **Proceed** / **Visit Website**

### 4. Add to Home Screen

1. Tap the **Share** button (square with arrow) at the bottom of Safari  
2. Scroll down → tap **Add to Home Screen**  
3. Name: **SM Stores** → tap **Add**

### 5. Open from home screen

Tap the new **SM** icon — full-screen app, same UI, GPS works (HTTPS).

---

## Full guide page

While servers are running, open on iPhone:

**`https://192.168.1.4:8080/install-ios`**

---

## Native App Store app later

Requires:

- Mac with Xcode  
- Apple Developer account ($99/year)  
- Run `npm run mobile:ios:prepare` then open `ios/` in Xcode  

The `ios/` project is already in this repo.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Page won't load | Same Wi‑Fi; allow Node.js in Windows Firewall |
| Certificate warning | Tap Advanced → Proceed (dev HTTPS) |
| GPS fails | Use **https://** URL, allow location when prompted |
| IP changed | Run `npm run mobile:configure` on PC, use new URL |
