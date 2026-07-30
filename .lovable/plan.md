## Note on stack

This project runs on TanStack Start (Next.js isn't supported here). Everything else you listed — React 19, TypeScript, Tailwind, shadcn/ui, Framer Motion, TanStack Query, Zustand, React Hook Form, Zod — is already in use or gets added. Data stays on the existing Lovable Cloud backend; new surfaces with no tables yet use typed dummy JSON behind the same service layer so swapping to your Django API is a one-file change.

## Verified current state

Existing routes: home, categories, category detail, product detail, search, stores, auth, cart, wishlist, checkout, orders list/detail, profile, addresses, notifications, and admin (dashboard, orders, products, categories, banners, customers, stores). Everything below is what's missing.

## 1. Auth completion

- Email OTP and mobile OTP sign-in tabs on `/auth` (6-box code input, resend cooldown, TTL countdown), reusing the existing demo-OTP server functions.
- Forgot password + `/reset-password` page.
- Apple sign-in button as a UI placeholder next to the working Google button.

## 2. Product depth

- Image gallery with pinch/hover zoom and thumbnail strip.
- Variants and weight selector (250g/500g/1kg) with per-variant pricing.
- Ratings summary, review list with photos, and a write-review form.
- Product FAQ accordion, similar products rail, frequently-bought-together bundle with combined add-to-cart.

## 3. Search

- Live suggestion dropdown as you type, AI-styled result summary header.
- Filter sheet (price range, category, discount, rating, in-stock) plus sort, both reflected in the URL.
- Voice and barcode scanner panels wired to real browser APIs where available, graceful placeholder otherwise.

## 4. Cart & checkout

- Coupon/promo input with validation and applied-discount breakdown, tax line, delivery charge rules, estimated-delivery strip.
- Save-for-later shelf under the cart.
- Checkout: delivery slot picker (today/tomorrow time windows), payment-method selector UI (UPI, card, netbanking, wallet, COD — COD live, rest as UI), and a dedicated order-confirmation screen with animation.

## 5. Orders

- Live tracking timeline with animated stage progress and courier/ETA panel.
- Invoice download (client-generated PDF), one-tap reorder, and a return-request flow with reason and item selection.

## 6. Profile & content pages

- Wallet, reward points, and referral screens (dummy balances/history).
- Language selection, privacy, terms, help center with searchable FAQ.
- Favorite categories on the wishlist page.
- New public pages: About, Contact, Blogs (list + post), Testimonials, Feedback form, FAQ.
- Chat support drawer, app-update dialog, and a maintenance-mode screen.

## 7. Admin panel additions

- Brands, Coupons, Reviews (approve/hide), Notifications composer, Delivery charges, Taxes, and Settings pages.
- Dashboard extension: customer analytics and product analytics charts alongside existing revenue/sales.

## 8. Cross-cutting polish

- Skeletons, empty, error, and success states standardised across every screen via shared components.
- Route-level page transitions and micro-interactions with Framer Motion.
- Accessibility pass: labels on icon buttons, focus rings, keyboard traps, contrast, single `<main>`, 44px tap targets.
- SEO: unique `head()` metadata per new route, JSON-LD for products and blog posts, sitemap.

## Technical notes

- Feature-based folders under `src/features/*` (auth, product, cart, orders, admin, content) with shared UI staying in `src/components`.
- New tables via migration where real persistence matters: `reviews`, `coupons`, `brands`, `product_variants`, `returns`, `app_settings` (tax/delivery/maintenance). Wallet, rewards, referral, blogs, and testimonials use dummy JSON for now.
- React Hook Form + Zod for every new form; Axios-style typed client wrapper so the Django switch is centralised.

## Scale

This is a large build — I'll work through it in the order above and report progress as each block lands.
