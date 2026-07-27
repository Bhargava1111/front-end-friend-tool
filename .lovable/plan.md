## Goal

Build the complete customer application from the Minax Digital spec: a mobile-first grocery & pooja products ordering app, backed by Lovable Cloud (real auth, database, orders). No payment gateway in this phase, per the proposal.

## Design direction

- Palette: Forest Green `#1F5136` primary, Marigold `#F2A413` accent, cream `#FAF6EC` background, deep charcoal `#20261F` text — all as semantic tokens in `src/styles.css`.
- Poppins font family (loaded via `<link>` in the root route), rounded cards, soft shadows, smooth transitions.
- Mobile-first layout with a fixed bottom tab bar (Home, Categories, Cart, Orders, Profile) and comfortable desktop centering.

## Screens

**Auth**
- Splash + 3-slide onboarding (first visit only)
- Login / Sign up (email + password, plus Google sign-in)
- Email verification, Forgot password, Reset password page
- Logout

**Home**
- Banner slider, search bar, category chips
- Featured, Best Selling, Newly Added, Recommended product rails

**Catalog**
- Category listing and per-category product grid
- Search results with filters/sort
- Product detail: image gallery, description, weight, price, stock badge, quantity stepper, add to cart, wishlist

**Shopping**
- Cart: quantity update, remove, totals
- Wishlist
- Checkout: pick/add delivery address, order summary, place order (cash/pay-on-delivery only)
- Order success screen

**Orders**
- My orders list with status chips, order detail with item breakdown and status timeline

**Profile**
- Edit profile, saved addresses (add/edit/delete/default), change password
- Contact support, Privacy Policy, Terms & Conditions pages

## Backend (Lovable Cloud)

Tables with RLS + grants: `profiles`, `addresses`, `categories`, `banners`, `products`, `product_images`, `cart_items`, `wishlist_items`, `orders`, `order_items`. Public catalog tables get read-only anon access; all customer-owned rows scoped to `auth.uid()`.

Order status enum: pending, confirmed, packed, delivered, cancelled.

Seed migration includes demo categories, banners, and a realistic set of grocery + pooja products with images so the app looks complete on first load.

## Technical notes

- TanStack Start file routes; protected screens live under `_authenticated/`, catalog/auth routes stay public with SSR.
- Reads via route loaders + TanStack Query; writes via `createServerFn` with `requireSupabaseAuth`.
- Profile row auto-created on signup via database trigger.
- Per-route `head()` metadata (title/description/OG) on every page.
- Admin panel is out of scope for this build and can follow as a second phase.
