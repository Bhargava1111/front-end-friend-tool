# Admin reporting, user verification, single-store delivery & landing polish

## 1. Sales reports with date filtering (admin)

New **Reports** page in the admin panel plus filters on the dashboard:

- Range presets: Today, Last 7 days, This week, This month, Last month, Custom (from/to).
- Grouping toggle: Daily / Weekly / Monthly.
- Metrics per bucket: orders, revenue, items sold, average order value, cancelled/returned.
- Charts (revenue trend, orders by status) and a plain table of the buckets.
- Top products and top customers for the selected range.
- **Download report**: CSV export of both the bucket summary and the order-level detail, generated in the browser from the same data shown (no extra backend needed). Filename includes range.

## 2. New-user verification flow

- New users start as **pending**: after sign-up they must complete a short onboarding form (full name, mobile number, full delivery address with pincode + map-confirmed location).
- Submitting sends a verification request to the admin (notification + badge count).
- Until an admin approves, the customer can browse and build a cart but **cannot place an order** — checkout shows a clear "Verification pending" state.
- Admin **Users** page: pending / verified / rejected tabs, view submitted number + address + pinned location on a map, approve or reject with an optional reason. Approve/reject notifies the customer.
- Admin can also **add a user manually** (name, phone, address, pre-verified) and **remove a user**.

## 3. Single store + accurate location

- Store handling switches to one primary store (the extra seeded stores are deactivated; Stores page becomes a single "My store" editor with a map pin).
- Location capture reworked: high-accuracy GPS request, reverse-geocode to a readable address, then a **confirm-on-map** step where the customer drags the pin to the exact door. Shows accuracy in metres and a "Location looks off? Set manually" fallback.
- Deliverability is validated against the single store's radius; out-of-range users get a clear message instead of a silent failure.
- The verified address/location is what the admin sees when verifying the user.

## 4. Delivery date after approval

- When an admin approves an order they set a **delivery date** (and optional slot). Approval dialog replaces the current one-click approve.
- Delivery date shows on the customer's order detail and tracking timeline, and in admin order lists (with an "edit delivery date" action).

## 5. Blog

- Real blog storage (title, slug, cover image, excerpt, body, tags, published flag, published date) replacing the current hard-coded articles.
- Admin **Blog** page: list, create, edit, delete, publish/unpublish, cover image upload (reuses existing uploader).
- Customer `/blogs` and `/blogs/$slug` read from the database with SEO head tags and related posts.

## 6. Responsive admin panel

- Admin shell gets a proper desktop layout (persistent left sidebar, wider content area) and a mobile layout (hamburger drawer nav instead of the cramped scrolling tab strip).
- Every admin page audited for small screens: tables become stacked cards, dialogs scroll, filter rows use the grid + `min-w-0` pattern, charts resize.

## 7. Landing-style UI polish

- Home page reworked into a richer landing page: stronger hero with the banner carousel, value-proposition strip, category showcase, offers, featured brands, coupons, testimonials, store/service area block, blog teasers, closing CTA — natural, editorial spacing rather than dense app cards.
- Other customer pages (categories, deals, offers, brands, coupons, stores, blogs, about/contact) get matching landing-style headers, intro copy and section rhythm so they feel like pages rather than lists.

## Technical notes

- Migration: `profiles` gains `verification_status`, `verified_at`, `verified_by`, `rejection_reason`, `address_text`, `pincode`, `latitude`, `longitude`; `orders` gains `delivery_date`; new `blog_posts` table. All with GRANTs, RLS (users read/update own profile fields but cannot self-verify; admins manage via role check; blog posts publicly readable when published, admin-writable) and updated_at triggers.
- Order placement guarded server-side in the checkout server function (verified profile required) — not just hidden in the UI.
- Reporting via a new `getAdminSalesReport` server function taking `{ from, to, groupBy }`, aggregating orders server-side; CSV built client-side from the response.
- `docs/BACKEND_DJANGO_API.md` updated with the new endpoints (reports, user verification, delivery date, blog) and schema changes.
