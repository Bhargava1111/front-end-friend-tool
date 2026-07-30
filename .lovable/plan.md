## Goal

Add order approval + notifications, expand the admin panel (categories, banners, manual orders, product videos), auto-scrolling home sections, and automatic customer location capture with location fixes.

## 1. Orders: approval + notifications

- Admin order card gets explicit **Approve** / **Reject** actions (in addition to the status dropdown): Approve sets `confirmed`, Reject sets `cancelled`, with a confirm dialog.
- New `notifications` table (user_id, title, body, type, order_id, is_read, created_at) with owner-read/update rules and admin insert.
- When an order is placed → notification to admins; when an admin changes status → notification to the customer ("Order MNX-104 approved", "packed", "delivered", "cancelled").
- Customer-facing **Notification Center** at `/notifications`: unread badge on the profile/home bell icon, mark-as-read, live updates via realtime.
- Admin gets a bell in the admin header showing new/pending orders count.

## 2. Admin can create categories, banners and orders

- **Categories page** (`/admin/categories`): create/edit/delete, name + auto slug, image URL, sort order, active toggle.
- **Banners page** (`/admin/banners`): create new banners (title, subtitle, image, link category, sort order, active), edit and delete — today the admin can only toggle existing ones.
- **Manual order creation** (`/admin/orders` → "New order"): pick customer, add products with quantities, enter recipient/phone/address, totals computed automatically, order saved as `confirmed`.

## 3. Product videos

- Add a `video_url` column to products; the admin product dialog gets a video URL field.
- Product detail page shows the video as the first item in the gallery with a play badge, plus an inline player.

## 4. Home page auto-scroll

- Product rails (Flash Sale, Best Sellers, Trending, Recommended, Recently Viewed) auto-scroll horizontally at a slow, smooth pace, pausing on touch/hover and respecting `prefers-reduced-motion`.
- Banner slider keeps its existing auto-advance; categories strip also auto-scrolls.

## 5. Automatic customer location + fixes

- On first load and right after login, if no location is stored, request geolocation automatically (once), resolve the nearest store, and save it — no manual tap needed.
- Fall back in order: signed-in default address → nearest store → "Set your location" prompt.
- Location fixes:
  - Geolocation currently fails silently inside the preview iframe; add proper permission handling with clear messaging and a manual fallback instead of a generic error.
  - Show a real area name via reverse geocoding instead of "Near <store>" only.
  - Longer timeout + `maximumAge` so detection doesn't time out on mobile.
  - Persist the chosen location to the user's profile so it follows them across devices, and keep checkout ETA in sync with the selected location.

## Technical notes

- DB migration: `notifications` table (RLS + grants), `products.video_url`, plus a trigger/server-side insert for status-change notifications.
- New server functions in `src/lib/admin.functions.ts` (categories/banners CRUD, manual order create, approve/reject) and a new `src/lib/notifications.functions.ts`.
- Auto-scroll implemented as a reusable hook used by `product-rail.tsx` and the category strip.
- Location auto-detect lives in a small hook used by `LocationBar`, backed by the existing `useDeliveryLocation` Zustand store.
