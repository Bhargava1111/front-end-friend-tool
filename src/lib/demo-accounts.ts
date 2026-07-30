/** Dummy credentials mirrored from docs/BACKEND_DJANGO_API.md (section 7). */

export const DEMO_PASSWORD = "Demo@12345";
export const DEMO_OTP_CODE = "123456";
export const DEMO_OTP_TTL_SECONDS = 300;
export const DEMO_OTP_MAX_ATTEMPTS = 5;
export const DEMO_OTP_RESEND_COOLDOWN = 30;

export type DemoAccount = {
  email: string;
  phone: string;
  name: string;
  role: "admin" | "customer";
  note: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "admin@mnxstore.in",
    phone: "+919000000001",
    name: "Super Admin",
    role: "admin",
    note: "Full admin panel access",
  },
  {
    email: "manager@mnxstore.in",
    phone: "+919000000002",
    name: "Store Manager",
    role: "admin",
    note: "Catalog + stores",
  },
  {
    email: "orders@mnxstore.in",
    phone: "+919000000003",
    name: "Order Desk",
    role: "admin",
    note: "Order approvals",
  },
  {
    email: "ananya@example.com",
    phone: "+919111100001",
    name: "Ananya Iyer",
    role: "customer",
    note: "Returning shopper",
  },
  {
    email: "ravi@example.com",
    phone: "+919111100002",
    name: "Ravi Kumar",
    role: "customer",
    note: "Wishlist heavy",
  },
  {
    email: "meera@example.com",
    phone: "+919111100003",
    name: "Meera Nair",
    role: "customer",
    note: "New user, empty cart",
  },
];
