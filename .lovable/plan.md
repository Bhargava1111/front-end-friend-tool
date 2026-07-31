## Goal

1. Manage banners separately per surface (home, offers, coupons, brands) from the admin panel, and give each brand and coupon its own banner image.
2. Make the admin customer detail view actually usable — today it only shows what the orders table already carries, has no error state, and no email/address info.

## What I verified

- `banners` has no placement/type column, so every banner is a home banner; `/brands` currently fakes brand banners by cycling home banner images (`getBrandDirectory` in `src/lib/storefront.functions.ts`), and coupons have no image at all.
- `brands` and `coupons` tables have no `banner_url` column.
- The admin customer detail route `/admin/customer/$id` exists and is registered, and the access rules already let admins read profiles, orders, order items and reviews. So the page renders — but it has no error state, no email, no saved addresses, and "Customer not found" is shown for any failure. Data exists (7 customer profiles, 2 orders).

## Part 1 — Banner management

Database changes:
- Add `placement` to `banners` (text, default `home`, allowed: `home`, `offers`, `coupons`, `brands`), plus optional `brand_id` / `coupon_id` links so a banner can be attached to one brand or coupon.
- Add `banner_url` to `brands` and to `coupons`.

Admin (`/admin/banners`):
- Tabs across the top: Home / Offers / Coupons / Brands. The list is filtered by the selected placement and new banners default to that placement.
- Banner form gains a Placement select and, when Coupons or Brands is chosen, a picker to attach the banner to a specific coupon or brand.
- Brand and coupon editors (`/admin/brands`, `/admin/coupons`) each get a Banner image URL field with a live thumbnail preview.

Storefront:
- `/brands` uses real brand banners (`brands.banner_url`, falling back to banners with placement `brands`) instead of recycled home images.
- `/coupons` shows a hero banner strip from `placement = 'coupons'` plus a banner image on each coupon card when set.
- `/offers` shows only `placement = 'offers'` (falling back to home when none exist); the home carousel shows only `home`.

## Part 2 — Admin customer details

- Customers table gets a search box (name/phone) and keeps the row link to the detail page.
- Detail page: proper loading skeleton, an explicit error state with retry, and a real "not found" state distinguished from a failed fetch.
- Detail data extended with: the customer's email and last sign-in (read server-side via the privileged auth admin API), their saved addresses, wishlist and cart counts, and return requests — alongside the existing order history, spend stats and reviews.
- Adds quick actions in the header: call phone link, copy email, and a link into that customer's orders filtered in the admin orders list.

## Technical notes

- One migration: `banners.placement/brand_id/coupon_id`, `brands.banner_url`, `coupons.banner_url`. Existing rows default to `home`, so nothing disappears.
- Server-side work stays in `src/lib/admin.functions.ts` (admin CRUD + customer detail) and `src/lib/storefront.functions.ts` (public banner reads by placement); email lookup happens inside the handler after the admin-role check.
- `docs/BACKEND_DJANGO_API.md` updated with the new banner placement fields, brand/coupon banner fields and the expanded customer detail response.
