import { createServerFn } from "@tanstack/react-start";
import { optionalAuth, requireAuth } from "@/integrations/django/auth-middleware";
import { ensureValidAccessToken } from "@/lib/auth-session";
import { apiFetch, toJsonBody } from "@/lib/api";

async function requireAccessToken() {
  const token = await ensureValidAccessToken();
  if (!token) throw new Error("Please sign in to continue.");
  return token;
}

/** Direct Django API — use in Capacitor / bundled APK (no server functions). */
export async function getWalletClient() {
  const token = await requireAccessToken();
  return apiFetch("/wallet/", { token });
}

export async function getLoyaltyClient() {
  const token = await requireAccessToken();
  return apiFetch("/loyalty/", { token });
}

export async function getReferralClient() {
  const token = await requireAccessToken();
  return apiFetch("/referral/", { token });
}

export async function applyReferralCodeClient(data: { code: string }) {
  const token = await requireAccessToken();
  return apiFetch("/referral/", {
    method: "POST",
    token,
    body: toJsonBody(data),
  });
}

export async function deleteAccountClient() {
  const token = await requireAccessToken();
  return apiFetch("/me/delete/", { method: "POST", token });
}

export async function submitSupportTicketClient(data: {
  name: string;
  email?: string;
  phone?: string;
  subject: string;
  message: string;
  category?: string;
  order_id?: string;
}) {
  const token = await ensureValidAccessToken();
  return apiFetch("/support/tickets/", {
    method: "POST",
    token: token ?? null,
    body: toJsonBody(data),
  });
}

export async function getMySupportTicketsClient() {
  const token = await requireAccessToken();
  return apiFetch("/support/tickets/", { token });
}

export async function submitFeedbackClient(data: { rating: number; message: string; page?: string }) {
  const token = await ensureValidAccessToken();
  return apiFetch("/support/feedback/", {
    method: "POST",
    token: token ?? null,
    body: toJsonBody(data),
  });
}

export const submitSupportTicket = createServerFn({ method: "POST" })
  .middleware([optionalAuth])
  .inputValidator(
    (data: {
      name: string;
      email?: string;
      phone?: string;
      subject: string;
      message: string;
      category?: string;
      order_id?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    return apiFetch("/support/tickets/", {
      method: "POST",
      token: context.accessToken ?? null,
      body: toJsonBody(data),
    });
  });

export const getMySupportTickets = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) =>
    apiFetch("/support/tickets/", { token: context.accessToken }),
  );

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([optionalAuth])
  .inputValidator((data: { rating: number; message: string; page?: string }) => data)
  .handler(async ({ data, context }) => {
    return apiFetch("/support/feedback/", {
      method: "POST",
      token: context.accessToken ?? null,
      body: toJsonBody(data),
    });
  });

export const checkPincode = createServerFn({ method: "GET" })
  .inputValidator((data: { pincode: string }) => data)
  .handler(async ({ data }) => apiFetch(`/pincodes/check/?pincode=${data.pincode}`));

export const getWallet = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => apiFetch("/wallet/", { token: context.accessToken }));

export const getLoyalty = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => apiFetch("/loyalty/", { token: context.accessToken }));

export const getReferral = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => apiFetch("/referral/", { token: context.accessToken }));

export const applyReferralCode = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data, context }) =>
    apiFetch("/referral/", {
      method: "POST",
      token: context.accessToken,
      body: toJsonBody(data),
    }),
  );

export const getAppConfig = createServerFn({ method: "GET" }).handler(async () =>
  apiFetch("/app/config/"),
);

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) =>
    apiFetch("/me/delete/", { method: "POST", token: context.accessToken }),
  );

export const createPaymentIntent = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { order_id: string; method: string }) => data)
  .handler(async ({ data, context }) =>
    apiFetch("/payments/intent/", {
      method: "POST",
      token: context.accessToken,
      body: toJsonBody(data),
    }),
  );

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(
    (data: {
      payment_id: string;
      gateway_order_id?: string;
      gateway_payment_id?: string;
      signature?: string;
    }) => data,
  )
  .handler(async ({ data, context }) =>
    apiFetch("/payments/verify/", {
      method: "POST",
      token: context.accessToken,
      body: toJsonBody(data),
    }),
  );

export const getOrderInvoice = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data, context }) =>
    apiFetch(`/orders/${data.orderId}/invoice/`, { token: context.accessToken }),
  );

export const addPriceWatch = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { product_id: string; target_price?: number }) => data)
  .handler(async ({ data, context }) =>
    apiFetch("/price-watches/", {
      method: "POST",
      token: context.accessToken,
      body: toJsonBody(data),
    }),
  );
