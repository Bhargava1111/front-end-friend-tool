import { StrictMode, startTransition } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { StartClient } from "@tanstack/react-start/client";
import { getRouter } from "./router";
import { startInstance } from "./start";
import "./styles.css";

declare global {
  interface Window {
    $_TSR?: { h?: () => void };
    __TSS_START_OPTIONS__?: unknown;
  }
}

function hasSsrPayload() {
  return Boolean(window.$_TSR);
}

async function mountSpa() {
  const router = getRouter();
  try {
    const startOptions = await startInstance.getOptions();
    window.__TSS_START_OPTIONS__ = startOptions;
  } catch {
    // Start options are optional for a bundled native SPA.
  }

  router.update({ defaultSsr: false });
  await router.load();

  const rootEl = document.getElementById("root");
  if (!rootEl) {
    throw new Error("Missing #root element");
  }

  startTransition(() => {
    createRoot(rootEl).render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );
  });
}

if (hasSsrPayload()) {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <StartClient />
      </StrictMode>,
    );
  });
} else {
  void mountSpa().catch((error: unknown) => {
    console.error(error);
    const rootEl = document.getElementById("root");
    if (!rootEl) return;
    const message = error instanceof Error ? error.message : String(error);
    rootEl.innerHTML = `<div style="font-family:Poppins,system-ui,sans-serif;padding:32px 24px;text-align:center;color:#1f2937">
      <h1 style="font-size:18px;font-weight:600">The app couldn't start</h1>
      <p style="margin-top:8px;font-size:14px;color:#6b7280">${message}</p>
    </div>`;
  });
}
