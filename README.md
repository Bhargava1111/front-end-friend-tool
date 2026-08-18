# User Interface Foundation

Build the complete ui

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://front-end-friend-tool.lovable.app

## Mobile apps (Android & iOS)

Native Android and iOS apps ship in this repo via **Capacitor** — they load the same UI as the web app.

```sh
npm install
npm run cap:sync
npm run cap:android   # Android Studio
npm run cap:ios       # Xcode (macOS only)
```

See **[docs/MOBILE_APPS.md](docs/MOBILE_APPS.md)** for device testing, store publishing, and custom domain setup.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/83aeca62-857b-46ab-a13f-97c10eba967f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
